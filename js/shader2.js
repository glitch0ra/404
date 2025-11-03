// assets/js/shader2.js
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

  // Немного замедляем тайм — 3× медленнее
  float rand(vec2 p) {
      float t = floor(iTime * 6.6) / 30.0; // вместо 20 — 3x медленнее
      return fract(sin(dot(p, vec2(t * 12.9898, t * 78.233))) * 43758.5453);
  }

  float noise(vec2 uv, float blockiness) {
      vec2 lv = fract(uv);
      vec2 id = floor(uv);
      float n1 = rand(id);
      float n2 = rand(id + vec2(1,0));
      float n3 = rand(id + vec2(0,1));
      float n4 = rand(id + vec2(1,1));
      vec2 u = smoothstep(0.0, 1.0 + blockiness, lv);
      return mix(mix(n1, n2, u.x), mix(n3, n4, u.x), u.y);
  }

  float fbm(vec2 uv, int count, float blockiness, float complexity) {
      float val = 0.0;
      float amp = 0.5;
      while(count != 0) {
          val += amp * noise(uv + (rand(ceil(uv * 3.) / 3.) * 2.0 + (float(floor(iTime * 6.6) / 30.0)/float(count)) - 1.0), blockiness);
          amp *= 0.5;
          uv *= complexity;
          count--;
      }
      return val;
  }

  // 4 ярких цвета 💜💚💙💗
  vec3 randomColor(vec2 uv) {
      float r = rand(uv * 10.0 + iTime * 0.5);
      if (r < 0.25) return vec3(1.0, 0.0, 1.0);   // пурпурный
      else if (r < 0.5) return vec3(0.0, 1.0, 0.58); // зелёный
      else if (r < 0.75) return vec3(0.0, 1.0, 1.0); // голубой
      else return vec3(1.0, 0.4, 0.8);               // розовый
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      vec2 uv2 = uv;

      // меньше масштаба — реже блоки
      uv *= 3.5;

      // характерные “ломаные” искажения
      uv.x *= fbm(uv, 2, 2.5, 1.0);

      float n = fbm(uv, 2, 2.0, 1.4);

      // создаем редкие, но явные всплески
      float glitch = smoothstep(0.55, 0.8, n);

      // теперь глитчи живут дольше и исчезают плавно
      float pulse = sin(iTime * 0.8 + uv.x * 8.0) * 0.5 + 0.5;
      glitch *= pow(pulse, 0.6);

      vec3 color = randomColor(floor(uv * 12.0));
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
