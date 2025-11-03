document.addEventListener('DOMContentLoaded', () => {
  const canvas2 = document.getElementById('shader-canvas2');
  if (!canvas2) return console.error('Canvas #shader-canvas2 не найден!');
  const gl2 = canvas2.getContext('webgl2');
  if (!gl2) return console.error('WebGL2 не поддерживается.');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas2.width = window.innerWidth * dpr;
    canvas2.height = window.innerHeight * dpr;
    gl2.viewport(0, 0, gl2.drawingBufferWidth, gl2.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  gl2.enable(gl2.BLEND);
  gl2.blendFunc(gl2.SRC_ALPHA, gl2.ONE_MINUS_SRC_ALPHA);

  const vertexSrc = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  // Вечный шум — цикличный каждые 120 секунд
  float rand(vec2 p, float t) {
      return fract(sin(dot(p, vec2(12.9898, 78.233)) + t * 1.2) * 43758.5453);
  }

  float noise(vec2 uv, float t) {
      vec2 i = floor(uv);
      vec2 f = fract(uv);
      float a = rand(i, t);
      float b = rand(i + vec2(1.0, 0.0), t);
      float c = rand(i + vec2(0.0, 1.0), t);
      float d = rand(i + vec2(1.0, 1.0), t);
      vec2 u = smoothstep(0.0, 1.0, f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 uv, float t) {
      float val = 0.0;
      float amp = 0.6;
      for (int i = 0; i < 4; i++) {
          val += amp * noise(uv, t);
          uv *= 2.1;
          amp *= 0.5;
      }
      return val;
  }

  // 💜💚💙💗 — выбираем случайный цвет для каждого блока
  vec3 randomColor(vec2 uv, float t) {
      float r = rand(uv, t);
      if (r < 0.25) return vec3(1.0, 0.0, 1.0);     // пурпурный
      else if (r < 0.5) return vec3(0.0, 1.0, 0.58); // зелёный
      else if (r < 0.75) return vec3(0.0, 1.0, 1.0); // голубой
      else return vec3(1.0, 0.4, 0.8);               // розовый
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      uv *= vec2(8.0, 5.0); // структура глитч-блоков

      float t = mod(iTime * 0.33, 120.0); // замедление ×3

      float n = fbm(uv + vec2(0.0, t * 0.6), t);
      float glitch = smoothstep(0.7, 0.95, n); // более контрастно

      // делаем появление блоков менее частым
      if (rand(floor(uv), t) > 0.65) glitch = 0.0;

      vec3 color = randomColor(floor(uv), t);
      float alpha = glitch * 0.8;

      fragColor = vec4(color * alpha, alpha);
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

  const vs = compileShader(gl2, gl2.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl2, gl2.FRAGMENT_SHADER, fragmentSrc);
  const prog = gl2.createProgram();
  gl2.attachShader(prog, vs);
  gl2.attachShader(prog, fs);
  gl2.linkProgram(prog);
  if (!gl2.getProgramParameter(prog, gl2.LINK_STATUS))
    return console.error(gl2.getProgramInfoLog(prog));

  gl2.useProgram(prog);

  const quad = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, quad);
  gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(0);
  gl2.vertexAttribPointer(0, 2, gl2.FLOAT, false, 0, 0);

  const iResolutionLoc = gl2.getUniformLocation(prog, 'iResolution');
  const iTimeLoc = gl2.getUniformLocation(prog, 'iTime');

  let start = performance.now();
  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl2.uniform3f(iResolutionLoc, canvas2.width, canvas2.height, 1.0);
    gl2.uniform1f(iTimeLoc, t);
    gl2.drawArrays(gl2.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
