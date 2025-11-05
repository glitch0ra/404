// ======================== Shader Adaptive System ===========================
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return console.error('❌ Canvas #shader-canvas не найден!');

  const gl = canvas.getContext('webgl2', {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    desynchronized: false,
  });
  if (!gl) return alert('Ваш браузер не поддерживает WebGL2');
  console.log('✅ WebGL2 активен');

  /*───────────────────── Переменные ─────────────────────*/
  let resolutionScale = 1.0;
  let qualityLevel = 1.0;
  const fpsSamples = [];
  let fps = 50;
  let lastFrameTime = performance.now();
  let lastStableTime = performance.now();
  let lowFpsDuration = 0;
  let throttled = false;
  let userActive = true;

  const MIN_FPS = 45;
  const TARGET_FPS = 50;
  const STABLE_TIME = 500; // 2.5с стабильного падения — считаем слабым железом
  const ADJUST_INTERVAL = 500;
  let lastAdjust = performance.now();

  /*───────────────────── Диагностика ─────────────────────*/
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '10px',
    left: '10px',
    zIndex: '9999',
    fontFamily: 'monospace',
    fontSize: '13px',
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.6)',
    color: '#00FFAA',
    pointerEvents: 'none',
    userSelect: 'none',
    backdropFilter: 'blur(4px)',
    whiteSpace: 'pre',
  });
  document.body.appendChild(overlay);

  /*───────────────────── Активность пользователя ─────────────────────*/
  const updateActivity = () => {
    userActive = true;
    throttled = false;
    lastStableTime = performance.now();
  };
  ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'focus']
    .forEach(e => window.addEventListener(e, updateActivity));

  // Отслеживаем, ушёл ли пользователь
  document.addEventListener('visibilitychange', () => {
    throttled = document.hidden;
  });

  /*───────────────────── FPS монитор ─────────────────────*/
  function updateFps(now) {
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    const currentFps = 1000 / delta;
    fpsSamples.push(currentFps);
    if (fpsSamples.length > 30) fpsSamples.shift();
    fps = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;
  }

  /*───────────────────── Логика адаптации ─────────────────────*/
  function adjustQuality(now) {
    if (now - lastAdjust < ADJUST_INTERVAL) return;
    lastAdjust = now;

    // если вкладка неактивна — ничего не трогаем
    if (throttled || !userActive) return;

    // если FPS стабильно ниже 45 более 2с — слабое железо
    if (fps < MIN_FPS) {
      lowFpsDuration += ADJUST_INTERVAL;
      if (lowFpsDuration > STABLE_TIME) {
        resolutionScale = Math.max(0.55, resolutionScale - 0.05);
        qualityLevel = Math.max(0.55, qualityLevel - 0.05);
        lowFpsDuration = 0;
      }
    } else {
      // FPS нормализовался → возвращаем качество
      lowFpsDuration = 0;
      if (resolutionScale < 1.0) {
        resolutionScale = Math.min(1.0, resolutionScale + 0.05);
        qualityLevel = Math.min(1.0, qualityLevel + 0.05);
      }
    }
  }

  /*───────────────────── GLSL Шейдер ─────────────────────*/
  const vertexSrc = `#version 300 es
  precision mediump float;
  layout(location = 0) in vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const fragmentSrc = `#version 300 es
  precision mediump float;
  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;
  uniform int iFrame;
  uniform vec4 iMouse;
  uniform float uQuality;

  vec3 oilMix(vec3 p, float t) {
    vec3 c1 = vec3(1.0, 0.0, 1.0);
    vec3 c2 = vec3(0.0, 1.0, 0.58);
    vec3 c3 = vec3(0.0, 1.0, 1.0);
    vec3 c4 = vec3(1.0, 0.4, 0.8);
    float n1 = sin(p.x * 0.35 + p.y * 0.25 + t * 2.8);
    float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 3.2);
    float n3 = sin(p.z * 0.45 + p.x * 0.4 - t * 2.6);
    float n4 = cos(p.x * 0.25 + p.y * 0.6 + t * 2.2);
    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;
    return normalize(c1 * n1 + c2 * n2 + c3 * n3 + c4 * n4);
  }

  void mainImage(out vec4 O, vec2 I) {
    float z = 0.0, d = 0.0;
    O = vec4(0.0);
    float iter = mix(10.0, 20.0, uQuality);
    for (float i = 0.0; i < iter; i++) {
      vec3 p = z * normalize(vec3(I + I, 0.0) - iResolution.xyx) + 0.1;
      p = vec3(
        atan(p.y / 0.2, p.x) * 2.0,
        p.z / 3.0,
        length(p.xy) - 5.0 - z * 0.2
      );
      for (float j = 1.0; j <= 7.0; j++)
        p += sin(p.yzx * j + iTime * 0.4 + 0.3 * i) / j;
      z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));
      O.rgb += (1.0 + cos(p.x + i * 0.4 + z)) / d * oilMix(p, iTime);
    }
    O = tanh(O * O / 400.0);
    O.rgb = pow(O.rgb, vec3(0.8));
  }

  void main() {
    vec4 color;
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
  }`;

  /*───────────────────── Компиляция ─────────────────────*/
  function compileShader(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');
  const iFrameLoc = gl.getUniformLocation(program, 'iFrame');
  const iMouseLoc = gl.getUniformLocation(program, 'iMouse');
  const uQualityLoc = gl.getUniformLocation(program, 'uQuality');

  let start = performance.now();
  let frame = 0;
  const mouse = [0, 0, 0, 0];

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse[0] = e.clientX - rect.left;
    mouse[1] = rect.height - (e.clientY - rect.top);
  });
  canvas.addEventListener('mousedown', e => {
    mouse[2] = mouse[0];
    mouse[3] = mouse[1];
  });

  function resize() {
    const dpr = window.devicePixelRatio * resolutionScale;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let lastRenderTime = 0;

  function render(now) {
    if (throttled) { requestAnimationFrame(render); return; }

    updateFps(now);
    adjustQuality(now);

    if (now - lastRenderTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }
    lastRenderTime = now;

    resize();
    const t = (now - start) * 0.001;
    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);
    gl.uniform1i(iFrameLoc, frame++);
    gl.uniform4f(iMouseLoc, mouse[0], mouse[1], mouse[2], mouse[3]);
    gl.uniform1f(uQualityLoc, qualityLevel);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    overlay.textContent =
      `FPS: ${fps.toFixed(1)}\n` +
      `RES: ${(resolutionScale * 100).toFixed(0)}%\n` +
      `QUAL: ${(qualityLevel * 100).toFixed(0)}%\n` +
      `STATE: ${throttled ? '🟡 THROTTLED' : '🟢 ACTIVE'}`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});


