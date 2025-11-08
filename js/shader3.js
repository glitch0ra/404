// assets/js/shader3.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas3 = document.getElementById("shader-canvas3");
  if (!canvas3) return console.error("Canvas #shader-canvas3 не найден!");

  const gl3 = canvas3.getContext("webgl2", {
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true,
  });

  if (!gl3) return console.error("WebGL2 не поддерживается.");

  /*───────────────────── Динамические параметры ─────────────────────*/
  let resolutionScale = 1.0; // Масштаб разрешения (0.6–1.0)
  let qualityLevel = 1.0; // Качество итераций (0.5–1.0)
  let fps = 50;
  const fpsSamples = [];
  let lastTime = performance.now();
  let lastAdjustTime = performance.now();
  const ADJUST_INTERVAL = 500;

  /*───────────────────── Визуальная диагностика ─────────────────────*/
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.bottom = "10px";
  overlay.style.left = "10px";
  overlay.style.zIndex = "9999";
  overlay.style.fontFamily = "monospace";
  overlay.style.fontSize = "13px";
  overlay.style.padding = "6px 10px";
  overlay.style.borderRadius = "8px";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.color = "#FFFF00";
  overlay.style.pointerEvents = "none";
  overlay.style.userSelect = "none";
  overlay.style.backdropFilter = "blur(4px)";
  overlay.style.whiteSpace = "pre";
  document.body.appendChild(overlay);

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
    if (fps < 29) {
      resolutionScale = Math.max(0.55, resolutionScale - 0.05);
      qualityLevel = Math.max(0.55, qualityLevel - 0.05);
    } else if (fps > 45 && resolutionScale < 1.0) {
      resolutionScale = Math.min(1.0, resolutionScale + 0.05);
      qualityLevel = Math.min(1.0, qualityLevel + 0.05);
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio * resolutionScale;
    canvas3.width = window.innerWidth * dpr;
    canvas3.height = window.innerHeight * dpr;
    gl3.viewport(0, 0, canvas3.width, canvas3.height);
  }

  window.addEventListener("resize", resize);
  resize();

  gl3.enable(gl3.BLEND);
  gl3.blendFunc(gl3.SRC_ALPHA, gl3.ONE_MINUS_SRC_ALPHA);

  /*────────────────────── GLSL ──────────────────────*/
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
  uniform vec4 iMouse;
  uniform float uQuality;

  const float SPEED = .21;
  const float STRIP_CHARS_MIN = 7.0;
  const float STRIP_CHARS_MAX = 40.0;
  const float STRIP_CHAR_HEIGHT = 0.15;
  const float STRIP_CHAR_WIDTH = 0.10;
  const float ZCELL_SIZE = 1.0 * (STRIP_CHAR_HEIGHT * STRIP_CHARS_MAX);
  const float XYCELL_SIZE = 12.0 * STRIP_CHAR_WIDTH;
  const int BLOCK_SIZE = 10;
  const int BLOCK_GAP = 2;
  const float WALK_SPEED = 1.0 * XYCELL_SIZE;
  const float BLOCKS_BEFORE_TURN = 3.0;
  const float PI = 3.14159265359;

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

  ... // (весь остальной GLSL-код полностью выровнен)
  `;

  /*──────────────────── Компиляция ────────────────────*/
  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl3, gl3.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl3, gl3.FRAGMENT_SHADER, fragmentSrc);
  const prog = gl3.createProgram();
  gl3.attachShader(prog, vs);
  gl3.attachShader(prog, fs);
  gl3.linkProgram(prog);
  if (!gl3.getProgramParameter(prog, gl3.LINK_STATUS))
    return console.error(gl3.getProgramInfoLog(prog));
  gl3.useProgram(prog);

  const quad = gl3.createBuffer();
  gl3.bindBuffer(gl3.ARRAY_BUFFER, quad);
  gl3.bufferData(
    gl3.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl3.STATIC_DRAW
  );
  gl3.enableVertexAttribArray(0);
  gl3.vertexAttribPointer(0, 2, gl3.FLOAT, false, 0, 0);

  const iResolutionLoc = gl3.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl3.getUniformLocation(prog, "iTime");
  const iMouseLoc = gl3.getUniformLocation(prog, "iMouse");
  const uQualityLoc = gl3.getUniformLocation(prog, "uQuality");

  let start = performance.now();
  let mouseX = 0,
    mouseY = 0;

  window.addEventListener("mousemove", (e) => {
    const rect = canvas3.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
  });

  let lastScrollY = window.scrollY;
  let scrollSpeed = 0;
  let scrollInfluence = 0;
  let lastScrollTime = performance.now();
  let timeOffset = 0;

  window.addEventListener("scroll", () => {
    const now = performance.now();
    const deltaTime = Math.max(1, now - lastScrollTime);
    lastScrollTime = now;
    const currentScroll = window.scrollY;
    const deltaY = currentScroll - lastScrollY;
    lastScrollY = currentScroll;
    scrollSpeed = deltaY / deltaTime;
    scrollInfluence = scrollSpeed * 0.2;
  });

  let isPaused = false;
  document.addEventListener("visibilitychange", () => {
    isPaused = document.hidden;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      isPaused = !entries[0].isIntersecting;
    },
    { threshold: 0.05 }
  );
  observer.observe(canvas3);

  const TARGET_FPS = 25;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let lastRenderTime = 0;

  function render(now) {
    if (isPaused) return requestAnimationFrame(render);

    updatePerformance(now);
    adjustQuality(now);

    if (now - lastRenderTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }

    const dt = (now - lastRenderTime) * 0.001;
    lastRenderTime = now;
    resize();

    scrollInfluence *= 0.9;
    timeOffset += scrollInfluence * dt * 50.0;

    const t = (now - start) * 0.001 + timeOffset;

    gl3.clearColor(0, 0, 0, 0);
    gl3.clear(gl3.COLOR_BUFFER_BIT);
    gl3.uniform3f(iResolutionLoc, canvas3.width, canvas3.height, 1.0);
    gl3.uniform1f(iTimeLoc, t);
    gl3.uniform4f(iMouseLoc, mouseX, mouseY, 0.0, 0.0);
    gl3.uniform1f(uQualityLoc, qualityLevel);
    gl3.drawArrays(gl3.TRIANGLES, 0, 6);

    overlay.textContent = `FPS: ${fps.toFixed(1)}\nRES: ${(resolutionScale * 100).toFixed(0)}%\nQUAL: ${(qualityLevel * 100).toFixed(0)}%`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
