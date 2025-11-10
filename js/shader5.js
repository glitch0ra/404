// js/shader5.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('shader-canvas5');
  if (!canvas) {
    console.error('shader5: canvas #shader-canvas5 not found');
    return;
  }

  const gl = canvas.getContext('webgl2', {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true
  });

  if (!gl) {
    console.error('shader5: WebGL2 not supported in this browser');
    return;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Vertex shader (corrected: a_position is vec2 for fullscreen quad)
  const vertexSrc = `#version 300 es
  in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  // Fragment shader: адаптация чёрной дыры из Черная дыра.txt
  // — порезал фон/звёзды, оставил только чёрную дыру/диск, адаптировал к spherePos/sphereR.
  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  // --- параметры чёрной сферы (используются те же координаты/размер как в твоём коде) ---
  const vec3 spherePos = vec3(8.0, 6.0, 25.0);
  const float sphereR = 0.33;

  // noise / helpers (из твоего файла)
  float hash(float x){ return fract(sin(x)*15.0); }
  float hash(vec2 x){ return hash(x.x + hash(x.y)); }

  float value(vec2 p, float f) {
    float bl = hash(floor(p*f + vec2(0.,0.)));
    float br = hash(floor(p*f + vec2(1.,0.)));
    float tl = hash(floor(p*f + vec2(0.,1.)));
    float tr = hash(floor(p*f + vec2(1.,1.)));

    vec2 fr = fract(p*f);
    fr = (3. - 2.*fr)*fr*fr;
    float b = mix(bl, br, fr.x);
    float t = mix(tl, tr, fr.x);
    return mix(b,t, fr.y);
  }

  // Параметры диска/блюра
  const float _Speed = 2.0;
  const int _Steps = 12;

  // Рендер аккрец. диска в локальных координатах BH (pos = точка в локальной системе BH, ray локальный)
  vec4 raymarchDisk(vec3 ray, vec3 zeroPos) {
    // zeroPos — позиция луча в локальных координатах BH (pos)
    vec3 position = zeroPos;
    float lengthPos = length(position.xz);
    float _Size = sphereR;

    float dist = min(1.0, lengthPos * (1.0/_Size) * 0.5) * _Size * 0.4 * (1.0/float(_Steps)) / (abs(ray.y) + 1e-6);
    position += dist * float(_Steps) * ray * 0.5;

    vec2 deltaPos;
    deltaPos.x = -zeroPos.z*0.01 + zeroPos.x;
    deltaPos.y = zeroPos.x*0.01 + zeroPos.z;
    deltaPos = normalize(deltaPos - zeroPos.xz);

    float parallel = dot(ray.xz, deltaPos);
    parallel /= sqrt(max(lengthPos, 1e-6));
    parallel *= 0.6;
    float redShift = parallel + 0.4;
    redShift *= redShift;
    redShift = clamp(redShift, 0.0, 1.0);

    float disMix = clamp((lengthPos - _Size * 2.0)*(1.0/_Size)*0.24, 0.0, 1.0);
    vec3 insideCol = mix(vec3(1.0,0.8,0.0), vec3(0.5,0.13,0.02)*0.2, disMix);

    insideCol *= mix(vec3(0.4, 0.2, 0.1), vec3(1.6, 2.4, 4.0), redShift);
    insideCol *= 1.4;
    redShift += 0.14;
    redShift *= redShift;

    vec4 o = vec4(0.0);
    for (int i = 0; i < _Steps; i++) {
      position -= dist * ray;

      float intensity = clamp(1.0 - abs((float(i) - 0.8) * (1.0/float(_Steps)) * 2.0), 0.0, 1.0);
      float lengthPos2 = length(position.xz);
      float distMult = 1.0;

      distMult *= clamp((lengthPos2 - _Size * 0.75) * (1.0/_Size) * 1.5, 0.0, 1.0);
      distMult *= clamp((_Size * 10.0 - lengthPos2) * (1.0/_Size) * 0.20, 0.0, 1.0);
      distMult *= distMult;

      float u = lengthPos2 + iTime * _Size * 0.3 + intensity * _Size * 0.2;

      vec2 xy;
      float rot = mod(iTime * _Speed, 8192.0);
      xy.x = -position.z * sin(rot) + position.x * cos(rot);
      xy.y = position.x * sin(rot) + position.z * cos(rot);

      float x = abs(xy.x / (xy.y + 1e-6));
      float angle = 0.02 * atan(x);

      const float f = 70.0;
      float noise = value(vec2(angle, u * (1.0/_Size) * 0.05), f);
      noise = noise * 0.66 + 0.33 * value(vec2(angle, u * (1.0/_Size) * 0.05), f*2.0);

      float extraWidth = noise * 1.0 * (1.0 - clamp(float(i) * (1.0/float(_Steps)) * 2.0 - 1.0, 0.0, 1.0));
      float alpha = clamp(noise*(intensity + extraWidth)*( (1.0/_Size) * 10.0  + 0.01 ) * dist * distMult , 0.0, 1.0);

      vec3 col = 2.0 * mix(vec3(0.3,0.2,0.15) * insideCol, insideCol, min(1.0, intensity*2.0));
      o = clamp(vec4(col*alpha + o.rgb*(1.0-alpha), o.a*(1.0-alpha) + alpha), vec4(0.0), vec4(1.0));

      lengthPos2 *= (1.0/_Size);
      o.rgb += redShift*(intensity*1.0 + 0.5) * (1.0/float(_Steps)) * 100.0 * distMult / (lengthPos2*lengthPos2 + 1e-6);
    }

       // --- прозрачные края и чистка чёрной обводки ---
      float fade = smoothstep(0.05, 0.25, o.a); // плавное затухание прозрачности по краю
      o.rgb = mix(vec3(0.0), o.rgb, fade);      // цвет гасим вместе с альфой
      o.a *= fade * 0.9;                        // чуть уменьшаем плотность по краю
      
      // убираем любые "грязные" почти-чёрные области
      if (o.a < 0.05) {
        o.rgb = vec3(0.0);
        o.a = 0.0;
      }
      
      return o;
  }

  void main() {
    // normalized pixel coords
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;

    // camera in world coords (same as у тебя)
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    // move to BH-local coordinates
    vec3 pos = ro - spherePos;
    vec3 ray = rd;

    // accumulation
    vec3 col = vec3(0.0);
    vec3 glow = vec3(0.0);
    vec4 outCol = vec4(100.0); // sentinel

    // Ray-bending loop (адаптировано из оригинального алгоритма)
    for (int disks = 0; disks < 32; disks++) {
      for (int h = 0; h < 6; h++) {
        float dotpos = dot(pos, pos);
        float invDist = inversesqrt(max(dotpos, 1e-8)); // 1/distance to BH
        float centDist = dotpos * invDist; // distance to BH
        float stepDist = 0.92 * abs(pos.y / (ray.y + 1e-6)); // conservative distance to disk (y==0)
        float farLimit = centDist * 0.5;
        float closeLimit = centDist * 0.1 + 0.05 * centDist * centDist * (1.0 / sphereR);
        stepDist = min(stepDist, min(farLimit, closeLimit));

        float invDistSqr = invDist * invDist;
        float forceK = 0.725;
        float bendForce = stepDist * invDistSqr * sphereR * forceK;
        ray = normalize(ray - (bendForce * invDist) * pos);
        pos += stepDist * ray;

        glow += vec4(1.2, 1.1, 1.0, 1.0).rgb * (0.01 * stepDist * invDistSqr * invDistSqr * clamp(centDist * 2.0 - 1.2, 0.0, 1.0));
      }

      float dist2 = length(pos);

      if (dist2 < sphereR * 0.1) { // луч засосало в BH
        // чёрный центр
        outCol = vec4(0.0, 0.0, 0.0, 1.0);
        break;
      } else if (dist2 > sphereR * 1000.0) { // луч улетел — мы не рисуем фон, делаем прозрачный
        outCol = vec4(0.0, 0.0, 0.0, 0.0);
        break;
      } else if (abs(pos.y) <= sphereR * 0.002) { // столкновение с диском
      
        // --- коррекция ориентации чёрной дыры и её наклон ---
        // Сначала переворачиваем систему, чтобы ось совпала с визуальной камерой
        mat3 flipY = mat3(
          1.0, 0.0, 0.0,
          0.0, -1.0, 0.0,
          0.0, 0.0, 1.0
        );
        
        // Наклон вперёд (к камере) и влево
        float tiltX = radians(-30.0);  // наклон к камере
        float tiltZ = radians(-180.0);   // лёгкий поворот влево 
        
        mat3 rotX = mat3(
          1.0, 0.0, 0.0,
          0.0, cos(tiltX), -sin(tiltX),
          0.0, sin(tiltX), cos(tiltX)
        );
        
        mat3 rotZ = mat3(
          cos(tiltZ), -sin(tiltZ), 0.0,
          sin(tiltZ), cos(tiltZ), 0.0,
          0.0, 0.0, 1.0
        );
        
        // Общая матрица поворота с переворотом
        mat3 orient = rotZ * rotX * flipY;
        
        // применяем вращение к позиции и направлению луча
        vec3 posTilt = orient * pos;
        vec3 rayTilt = orient * ray;
        
        // теперь используем наклонённые posTilt/rayTilt
        vec4 diskCol = raymarchDisk(rayTilt, posTilt);


        // advance немного чтобы не залипать
        pos.y = 0.0;
        pos += abs(sphereR * 0.001 / (ray.y + 1e-6)) * ray;
      
        // композитируем диск (альфа-композиция)
        vec3 newRgb = mix(col, diskCol.rgb, diskCol.a);
        float newA = clamp(diskCol.a, 0.0, 1.0);
      
        col = newRgb;
      
        // если накопилась непрозрачность диска — берём как итог
        if (newA > 0.001) {
          outCol = vec4(col, 1.0);
          break;
        }
      }
    }

    // Если outCol остался sentinel — значит не решили судьбу луча — делаем прозрачным
    if (outCol.r == 100.0) {
      fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else {
      fragColor = outCol;
    }
  }`; // end fragmentSrc

  // Shader compilation function
  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Fullscreen quad setup (CORRECTED)
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');

  // Resize handling function
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // Visibility handling
  let isPaused = false;
  let lastRenderTime = 0;
  const FPS = 50;
  const FRAME_INTERVAL = 1000 / FPS;
  const startTime = performance.now();

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  observer.observe(canvas);

  // Render loop
  function render(now) {
    if (isPaused) {
      requestAnimationFrame(render);
      return;
    }
    if (now - lastRenderTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }
    lastRenderTime = now;
    resize();
    const t = ((now - startTime) * 0.001) % 300;
    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);

    // Очистка с прозрачным фоном
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});













