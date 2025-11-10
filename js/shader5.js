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

// -------------------------
// базовые параметры
// -------------------------
const vec3 spherePos = vec3(8.0, 6.0, 25.0);
const float sphereR = 0.33;   // уменьшили в 3 раза

// -------------------------
// шум для диска
// -------------------------
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

// -------------------------
// аккреционный диск
// -------------------------
vec4 raymarchDisk(vec3 ray, vec3 zeroPos) {
  vec3 position = zeroPos;
  float lengthPos = length(position.xz);
  float _Size = sphereR;

  const int _Steps = 12;
  const float _Speed = 2.0;

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
  insideCol *= mix(vec3(0.4,0.2,0.1), vec3(1.6,2.4,4.0), redShift);
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
  }

  // --- делаем чёрные области полностью прозрачными ---
  float lum = dot(o.rgb, vec3(0.2126, 0.7152, 0.0722));
  const float BLACK_HARD_THRESHOLD = 0.02;
  if (lum <= BLACK_HARD_THRESHOLD) {
    o.rgb = vec3(0.0);
    o.a = 0.0;
  } else {
    const float FADE_START = 0.03;
    const float FADE_END = 0.16;
    float fade = smoothstep(FADE_START, FADE_END, lum);
    o.rgb *= fade;
    o.a *= fade;
    if (o.a < 0.01) {
      o.rgb = vec3(0.0);
      o.a = 0.0;
    }
  }
  o.rgb = clamp(o.rgb, 0.0, 1.0);
  o.a = clamp(o.a, 0.0, 1.0);
  return o;
}

// -------------------------
// основной код
// -------------------------
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
  vec3 ro = vec3(0.0, 0.0, -8.0);
  vec3 rd = normalize(vec3(uv, 1.0));

  // переходим в локальные координаты BH
  vec3 pos = ro - spherePos;
  vec3 ray = rd;

  // --- исправление переворота и наклон ---
  // переворачиваем систему по Y и Z
  mat3 flip = mat3(
    1.0, 0.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, 0.0, -1.0
  );

  // наклон к камере и немного влево
  float tiltX = radians(-25.0);
  float tiltZ = radians(15.0);

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

  mat3 orient = rotZ * rotX * flip;

  vec3 posTilt = orient * pos;
  vec3 rayTilt = orient * ray;

  vec3 col = vec3(0.0);
  vec4 outCol = vec4(100.0);

  for (int disks = 0; disks < 32; disks++) {
    for (int h = 0; h < 6; h++) {
      float dotpos = dot(pos, pos);
      float invDist = inversesqrt(max(dotpos, 1e-8));
      float centDist = dotpos * invDist;
      float stepDist = 0.92 * abs(pos.y / (ray.y + 1e-6));
      float farLimit = centDist * 0.5;
      float closeLimit = centDist * 0.1 + 0.05 * centDist * centDist * (1.0 / sphereR);
      stepDist = min(stepDist, min(farLimit, closeLimit));

      float invDistSqr = invDist * invDist;
      float bendForce = stepDist * invDistSqr * sphereR * 0.725;
      ray = normalize(ray - (bendForce * invDist) * pos);
      pos += stepDist * ray;
    }

    float dist2 = length(pos);
    if (dist2 < sphereR * 0.1) {
      // центр чёрной дыры
      outCol = vec4(0.0, 0.0, 0.0, 1.0);
      break;
    } else if (dist2 > sphereR * 1000.0) {
      // луч улетел
      outCol = vec4(0.0, 0.0, 0.0, 0.0);
      break;
    } else if (abs(pos.y) <= sphereR * 0.002) {
      vec4 diskCol = raymarchDisk(rayTilt, posTilt);
      if (diskCol.a > 0.0) {
        outCol = vec4(mix(col, diskCol.rgb, diskCol.a), diskCol.a);
        break;
      }
    }
  }

  if (outCol.r == 100.0) fragColor = vec4(0.0,0.0,0.0,0.0);
  else fragColor = outCol;
}
`;


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














