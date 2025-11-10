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

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

  // Отладка: сетка и центр
  vec3 col = vec3(0.0);
  if (abs(uv.x) < 0.002 || abs(uv.y) < 0.002) col = vec3(1.0, 0.2, 0.2); // крест по центру
  if (mod(gl_FragCoord.x, 100.0) < 1.0 || mod(gl_FragCoord.y, 100.0) < 1.0)
      col += vec3(0.2, 0.3, 0.4); // сетка

  fragColor = vec4(col, 1.0);
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


