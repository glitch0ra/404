// assets/js/shader2.js
document.addEventListener('DOMContentLoaded', () => {

  const canvas2 = document.getElementById('shader-canvas2');
  if (!canvas2) {
    console.error('Canvas #shader-canvas2 не найден!');
    return;
  }

  const gl2 = canvas2.getContext('webgl2');
  if (!gl2) {
    console.error('WebGL2 не поддерживается для второго шейдера.');
    return;
  }

  // Поддержка чётких размеров
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas2.width = Math.round(window.innerWidth * dpr);
    canvas2.height = Math.round(window.innerHeight * dpr);
    canvas2.style.width = window.innerWidth + 'px';
    canvas2.style.height = window.innerHeight + 'px';
    gl2.viewport(0, 0, gl2.drawingBufferWidth, gl2.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  // Прозрачное наложение
  gl2.enable(gl2.BLEND);
  gl2.blendFunc(gl2.SRC_ALPHA, gl2.ONE_MINUS_SRC_ALPHA);

  const vertexSrc2 = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  const fragmentSrc2 = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  // Случайность
  float rand(vec2 p) {
      // Замедление в 3 раза и постоянная активность
      float t = mod(iTime * 6.67, 100.0); // вместо floor(iTime * 20.) / 10.
      return fract(sin(dot(p, vec2(t * 12.9898, t * 78.233))) * 43758.5453);
  }

  float noise(vec2 uv, float blockiness) {
      vec2 lv = fract(uv);
      vec2 id = floor(uv);

      float n1 = rand(id);
      float n2 = rand(id + vec2(1.0, 0.0));
      float n3 = rand(id + vec2(0.0, 1.0));
      float n4 = rand(id + vec2(1.0, 1.0));

      vec2 u = smoothstep(0.0, 1.0 + blockiness, lv);
      return mix(mix(n1, n2, u.x), mix(n3, n4, u.x), u.y);
  }

  float fbm(vec2 uv, int count, float blockiness, float complexity) {
      float val = 0.0;
      float amp = 0.5;

      while(count != 0) {
          val += amp * noise(uv + (rand(ceil(uv * 3.0) / 3.0) * 2.0
                + (float(floor(iTime * 6.67) / 10.0) / float(count)) - 1.0), blockiness);
          amp *= 0.5;
          uv *= complexity;
          count--;
      }
      return val;
  }

  // 4 неоновых цвета для случайных "кусочков"
  vec3 getRandomColor(vec2 uv) {
      float r = rand(uv * 12.345 + iTime);
      if (r < 0.25) return vec3(1.0, 0.0, 1.0);    // 💜 пурпурный
      else if (r < 0.5) return vec3(0.0, 1.0, 0.58); // 💚 зелёный
      else if (r < 0.75) return vec3(0.0, 1.0, 1.0); // 💙 голубой
      else return vec3(1.0, 0.4, 0.8);               // 💗 розовый
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      vec2 uv2 = uv;

      uv *= 5.0;
      uv.x *= fbm(uv, 2, 3.0, 1.0);

      // ↓ плотность шумовых блоков уменьшена в 1.5 раза
      float noiseVal = smoothstep(0.55, 1.0, fbm(uv * 0.8, 2, 3.0, 1.3));

      // случайный цвет для каждой области
      vec3 color = getRandomColor(floor(uv * 10.0));

      // применяем альфа и плавность появления
      float intensity = smoothstep(0.22, 0.33, noiseVal);

      fragColor = vec4(color * intensity, intensity * 0.8);
  }

  void main() {
      vec4 c;
      mainImage(c, gl_FragCoord.xy);
      fragColor = c;
  }`;

  // компиляция
  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs2 = compileShader(gl2, gl2.VERTEX_SHADER, vertexSrc2);
  const fs2 = compileShader(gl2, gl2.FRAGMENT_SHADER, fragmentSrc2);
  if (!vs2 || !fs2) return;

  const prog2 = gl2.createProgram();
  gl2.attachShader(prog2, vs2);
  gl2.attachShader(prog2, fs2);
  gl2.linkProgram(prog2);
  if (!gl2.getProgramParameter(prog2, gl2.LINK_STATUS)) {
    console.error('Program link error:', gl2.getProgramInfoLog(prog2));
    return;
  }
  gl2.useProgram(prog2);

  // Квад
  const quad2 = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, quad2);
  gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1
  ]), gl2.STATIC_DRAW);

  gl2.enableVertexAttribArray(0);
  gl2.vertexAttribPointer(0, 2, gl2.FLOAT, false, 0, 0);

  const iResolutionLoc2 = gl2.getUniformLocation(prog2, 'iResolution');
  const iTimeLoc2 = gl2.getUniformLocation(prog2, 'iTime');

  let start = performance.now();
  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl2.useProgram(prog2);
    gl2.uniform3f(iResolutionLoc2, canvas2.width, canvas2.height, 1.0);
    gl2.uniform1f(iTimeLoc2, t);
    gl2.drawArrays(gl2.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
