// assets/js/shader.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) {
    console.error('❌ Canvas #shader-canvas не найден!');
    return;
  }

  const gl = canvas.getContext('webgl2', {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    desynchronized: false,
  });

  if (!gl) {
    alert('Ваш браузер не поддерживает WebGL2');
    return;
  }
  console.log('✅ WebGL2 активен');

  /*───────────────────── Динамические параметры ─────────────────────*/
  let resolutionScale = 1.0;   // Масштаб разрешения (0.6–1.0)
  let qualityLevel = 1.0;      // Качество итераций (0.5–1.0)
  let fps = 50;
  const fpsSamples = [];
  let lastTime = performance.now();
  let lastAdjustTime = performance.now();
  const ADJUST_INTERVAL = 500;

  /*───────────────────── Визуальная диагностика ─────────────────────*/
  // ⛔ УДАЛИ ЭТОТ БЛОК ПОСЛЕ ТЕСТА
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '10px';
  overlay.style.left = '10px';
  overlay.style.zIndex = '9999';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '13px';
  overlay.style.padding = '6px 10px';
  overlay.style.borderRadius = '8px';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.color = '#00FFAA';
  overlay.style.pointerEvents = 'none';
  overlay.style.userSelect = 'none';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.whiteSpace = 'pre';
  document.body.appendChild(overlay);
  // ⛔ конец блока диагностики

  /*───────────────────── Измерение FPS ─────────────────────*/
  function updatePerformance(now) {
    const delta = now - lastTime;
    lastTime = now;
    const currentFps = 1000 / delta;
    fpsSamples.push(currentFps);
    if (fpsSamples.length > 30) fpsSamples.shift();
    fps = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;
  }

  /*───────────────────── Адаптация с инерцией ─────────────────────*/
  function adjustQuality(now) {
    if (now - lastAdjustTime < ADJUST_INTERVAL) return;
    lastAdjustTime = now;

    if (fps < 45) {
      resolutionScale = Math.max(0.55, resolutionScale - 0.05);
      qualityLevel = Math.max(0.55, qualityLevel - 0.105);
    } else if (fps > 45 && resolutionScale < 1.0) {
      resolutionScale = Math.min(1.0, resolutionScale + 0.05);
      qualityLevel = Math.min(1.0, qualityLevel + 0.05);
    }
  }

  /*────────────────────────────── GLSL ──────────────────────────────*/
  const vertexSrc = `#version 300 es
  precision mediump float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

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
    float z = 0.0;
    float d = 0.0;
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
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
  }`;

  /*──────────────────── Компиляция ────────────────────*/
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

  /*──────────────────── Геометрия ────────────────────*/
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  /*──────────────────── Uniforms ────────────────────*/
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

  let isPaused = false;
  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });
  const observer = new IntersectionObserver(entries => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  observer.observe(canvas);

  function resize() {
    const dpr = window.devicePixelRatio * resolutionScale;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  const TARGET_FPS = 50;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let lastRenderTime = 0;

  function render(now) {
    if (isPaused) {
      requestAnimationFrame(render);
      return;
    }

    updatePerformance(now);
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

    // обновляем overlay (⛔ удалить при финальной версии)
    overlay.textContent =
      `FPS: ${fps.toFixed(1)}\n` +
      `RES: ${(resolutionScale * 100).toFixed(0)}%\n` +
      `QUAL: ${(qualityLevel * 100).toFixed(0)}%`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});



