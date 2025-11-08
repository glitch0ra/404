// assets/js/shader3.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas3 = document.getElementById("shader-canvas3");
  if (!canvas3) return console.error("Canvas #shader-canvas3 не найден!");

  const gl3 = canvas3.getContext("webgl2", {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true
  });

  if (!gl3) return console.error("WebGL2 не поддерживается.");

  /*───────────────────── Динамические параметры ─────────────────────*/
  let resolutionScale = 1.0;
  let qualityLevel = 1.0;
  let fps = 50;
  const fpsSamples = [];
  let lastTime = performance.now();
  let lastAdjustTime = performance.now();
  const ADJUST_INTERVAL = 500;

  /*───────────────────── FPS Overlay ─────────────────────*/
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.bottom = '10px';
  overlay.style.left = '10px';
  overlay.style.zIndex = '9999';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '13px';
  overlay.style.padding = '6px 10px';
  overlay.style.borderRadius = '8px';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.color = '#00FF00';
  overlay.style.pointerEvents = 'none';
  overlay.style.userSelect = 'none';
  overlay.style.whiteSpace = 'pre';
  document.body.appendChild(overlay);

  function updatePerformance(now) {
    const delta = now - lastTime;
    lastTime = now;
    const currentFps = 1000 / delta;
    fpsSamples.push(currentFps);
    if (fpsSamples.length > 30) fpsSamples.shift();
    fps = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;
  }

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

  // адаптированный фрагментный шейдер из файла "новый шейдер.txt"
  const fragmentSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

const float fontSize = 16.0;
const float wordSpeed = 0.002;
const float flowSpeed = 0.15;

float words(vec2 fragCoord){
    vec2 UV = mod(fragCoord, fontSize) / (fontSize * 16.0);
    vec2 noise = floor(fract(texture(iChannel1, fragCoord / (fontSize * 16.0) - UV + iTime * wordSpeed).xy) * 16.0) / 16.0;
    return texture(iChannel0, UV + noise).x; 
}

vec3 flow(vec2 fragCoord){
    vec2 uv = fragCoord - mod(fragCoord, fontSize);
    float offset = cos(uv.x * 1.14 + 5.14) + 1.919810;
    float y = fract(fragCoord.y / iResolution.y + offset * 3.14 + iTime * offset * flowSpeed);
    return vec3(0.2, 1.0, 0.2) / (y * 12.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    fragColor = vec4(words(fragCoord) * flow(fragCoord), 1.0);  
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
  }`;

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
  gl3.bufferData(gl3.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl3.STATIC_DRAW);
  gl3.enableVertexAttribArray(0);
  gl3.vertexAttribPointer(0, 2, gl3.FLOAT, false, 0, 0);

  const iResolutionLoc = gl3.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl3.getUniformLocation(prog, "iTime");
  const iMouseLoc = gl3.getUniformLocation(prog, "iMouse");

  let start = performance.now();
  let mouseX = 0, mouseY = 0;

  window.addEventListener("mousemove", (e) => {
    const rect = canvas3.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
  });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });

  let isPaused = false;
  observer.observe(canvas3);

  function render(now) {
    if (isPaused) return requestAnimationFrame(render);
    updatePerformance(now);
    adjustQuality(now);
    resize();

    const t = (now - start) * 0.001;

    gl3.clearColor(0, 0, 0, 0);
    gl3.clear(gl3.COLOR_BUFFER_BIT);
    gl3.uniform3f(iResolutionLoc, canvas3.width, canvas3.height, 1.0);
    gl3.uniform1f(iTimeLoc, t);
    gl3.uniform4f(iMouseLoc, mouseX, mouseY, 0.0, 0.0);
    gl3.drawArrays(gl3.TRIANGLES, 0, 6);

    overlay.textContent = `FPS: ${fps.toFixed(1)}\nRES: ${(resolutionScale * 100).toFixed(0)}%\nQUAL: ${(qualityLevel * 100).toFixed(0)}%`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
