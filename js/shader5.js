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

  const vertexSrc = `#version 300 es
  in vec4 a_position;
  void main() {
      gl_Position = a_position;
  }`;

  const fragmentSrc = `#version 300 es
  precision highp float;

  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;

  // ==== Настройки чёрной дыры ====
  #define _Speed 2.0
  #define _Steps 12.0
  #define _Size 0.3

  // --- вспомогательные функции ---
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

  // --- вращение вектора ---
  void Rotate( inout vec3 vector, vec2 angle ) {
      vector.yz = cos(angle.y)*vector.yz + sin(angle.y)*vec2(-1.,1.)*vector.zy;
      vector.xz = cos(angle.x)*vector.xz + sin(angle.x)*vec2(-1.,1.)*vector.zx;
  }

  // --- аккреционный диск ---
  vec4 raymarchDisk(vec3 ray, vec3 zeroPos, float time) {
      vec3 position = zeroPos;
      float lengthPos = length(position.xz);
      float dist = min(1., lengthPos*(1./_Size) *0.5) * _Size * 0.4 *(1./_Steps) /( abs(ray.y) );
      position += dist*_Steps*ray*0.5;

      vec2 deltaPos;
      deltaPos.x = -zeroPos.z*0.01 + zeroPos.x;
      deltaPos.y = zeroPos.x*0.01 + zeroPos.z;
      deltaPos = normalize(deltaPos - zeroPos.xz);

      float parallel = dot(ray.xz, deltaPos);
      parallel /= sqrt(lengthPos);
      parallel *= 0.6;
      float redShift = parallel + 0.4;
      redShift *= redShift;
      redShift = clamp(redShift, 0., 1.);

      float disMix = clamp((lengthPos - _Size * 2.)*(1./_Size)*0.24, 0., 1.);
      vec3 insideCol = mix(vec3(1.0,0.8,0.0), vec3(0.5,0.13,0.02)*0.2, disMix);
      insideCol *= mix(vec3(0.4, 0.2, 0.1), vec3(1.6, 2.4, 4.0), redShift);
      insideCol *= 1.4;
      redShift += 0.14;
      redShift *= redShift;

      vec4 o = vec4(0.);
      for (float i = 0.; i < _Steps; i++) {
          position -= dist * ray;

          float intensity = clamp(1. - abs((i - 0.8) * (1./_Steps) * 2.), 0., 1.);
          float lengthPos = length(position.xz);
          float distMult = 1.;

          distMult *= clamp((lengthPos - _Size * 0.75) * (1./_Size) * 1.5, 0., 1.);
          distMult *= clamp((_Size * 10. - lengthPos) * (1./_Size) * 0.20, 0., 1.);
          distMult *= distMult;

          float u = lengthPos + time * _Size*0.3 + intensity * _Size * 0.2;
          vec2 xy;
          float rot = mod(time*_Speed, 8192.);
          xy.x = -position.z*sin(rot) + position.x*cos(rot);
          xy.y = position.x*sin(rot) + position.z*cos(rot);

          float x = abs(xy.x/(xy.y));
          float angle = 0.02*atan(x);

          const float f = 70.;
          float noise = value(vec2(angle, u * (1./_Size) * 0.05), f);
          noise = noise*0.66 + 0.33*value(vec2(angle, u * (1./_Size) * 0.05), f*2.);
          float extraWidth = noise * 1. * (1. - clamp(i * (1./_Steps)*2. - 1., 0., 1.));
          float alpha = clamp(noise*(intensity + extraWidth)*( (1./_Size) * 10.  + 0.01 ) *  dist * distMult , 0., 1.);

          vec3 col = 2.*mix(vec3(0.3,0.2,0.15)*insideCol, insideCol, min(1.,intensity*2.));
          o = clamp(vec4(col*alpha + o.rgb*(1.-alpha), o.a*(1.-alpha) + alpha), vec4(0.), vec4(1.));
      }
      o.rgb = clamp(o.rgb - 0.005, 0., 1.);
      return o;
  }

  void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;

      // Камера
      vec3 ro = vec3(0.0, 0.0, -8.0);
      vec3 rd = normalize(vec3(uv, 1.0));

      // Позиция чёрной дыры (там же, где была сфера)
      vec3 blackHolePos = vec3(8.0, 6.0, 25.0);

      // Смещение лучей относительно центра дыры
      vec3 toHole = blackHolePos - ro;
      float focus = length(toHole);
      rd = normalize(rd * 1.0 + toHole * 0.03);

      // Повороты для вращения диска
      vec2 angle = vec2(0.03*iTime, 0.12);
      Rotate(rd, angle);

      // Рендер аккреционного диска
      vec4 disk = raymarchDisk(rd, vec3(0.0), iTime);

      // Добавляем гравитационную "чёрную дыру" в центре
      float r = length(uv - vec2(blackHolePos.x * 0.02, blackHolePos.y * 0.02));
      float mask = smoothstep(0.02, 0.018, r);
      vec3 blackCenter = mix(vec3(0.0), disk.rgb, mask);

      fragColor = vec4(blackCenter, disk.a);
  }`;

  // === Shader compile ===
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

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();

  let lastRenderTime = 0;
  const FPS = 50;
  const FRAME_INTERVAL = 1000 / FPS;
  const startTime = performance.now();
  let isPaused = false;

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  observer.observe(canvas);

  function render(now) {
    if (isPaused) return requestAnimationFrame(render);
    if (now - lastRenderTime < FRAME_INTERVAL) return requestAnimationFrame(render);
    lastRenderTime = now;

    resize();
    const t = ((now - startTime) * 0.001) % 300;

    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
