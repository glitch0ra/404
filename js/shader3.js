// assets/js/shader3.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas3 = document.getElementById("shader-canvas3");
  if (!canvas3) return console.error("Canvas #shader-canvas3 не найден!");
  const gl3 = canvas3.getContext("webgl2");
  if (!gl3) return console.error("WebGL2 не поддерживается.");

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas3.width = window.innerWidth * dpr;
    canvas3.height = window.innerHeight * dpr;
    gl3.viewport(0, 0, gl3.drawingBufferWidth, gl3.drawingBufferHeight);
  }
  window.addEventListener("resize", resize);
  resize();

  const vertexSrc = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  // Адаптированная статичная версия "Matrix 3D Rain"
  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  const int ITER = 25;
  const float SPEED = 0.3;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.0, 289.0))) * 45758.5453); }

  // Генерация простого псевдо-символа (не текстура, а блоб)
  float symbol(vec2 uv, vec2 seed) {
      float d = length(fract(uv * 4.0 + seed) - 0.5);
      return smoothstep(0.3, 0.1, d);
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = (fragCoord.xy / iResolution.xy) * 2.0 - 1.0;
      uv.x *= iResolution.x / iResolution.y;

      // имитация перспективы
      float depth = 0.0;
      vec3 col = vec3(0.0);

      for (int i = 0; i < ITER; i++) {
          float layer = float(i) / float(ITER);
          float z = mix(0.2, 2.5, layer);
          float t = iTime * SPEED * (1.0 + layer * 0.5);
          vec2 pos = uv * z;

          pos.y += t - floor(t);  // падение вниз с циклом
          pos.x += hash(vec2(layer, 1.0)) * 4.0 - 2.0;

          vec2 cell = floor(pos * 10.0);
          vec2 f = fract(pos * 10.0);

          float c = symbol(f, cell);
          float fade = exp(-3.0 * layer);

          // зелёный "матрица" цвет с глубиной
          col += vec3(0.2, 1.0, 0.3) * c * fade;
      }

      col = clamp(col, 0.0, 1.0);
      fragColor = vec4(col, 1.0);
  }

  void main() {
      vec4 c;
      mainImage(c, gl_FragCoord.xy);
      fragColor = c;
  }`;

  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
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
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    gl3.STATIC_DRAW
  );
  gl3.enableVertexAttribArray(0);
  gl3.vertexAttribPointer(0, 2, gl3.FLOAT, false, 0, 0);

  const iResolutionLoc = gl3.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl3.getUniformLocation(prog, "iTime");

  let start = performance.now();
  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl3.uniform3f(iResolutionLoc, canvas3.width, canvas3.height, 1.0);
    gl3.uniform1f(iTimeLoc, t);
    gl3.drawArrays(gl3.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
