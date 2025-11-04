// assets/js/shader2.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas2 = document.getElementById('shader-canvas2');
  if (!canvas2) return console.error('Canvas #shader-canvas2 не найден!');
  
  // Явно отключаем ненужные флаги для производительности
  const gl2 = canvas2.getContext('webgl2', {
    preserveDrawingBuffer: false,
    alpha: true
  });
  if (!gl2) return console.error('WebGL2 не поддерживается.');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas2.width = window.innerWidth * dpr;
    canvas2.height = window.innerHeight * dpr;
    gl2.viewport(0, 0, canvas2.width, canvas2.height);
  }
  window.addEventListener('resize', resize);
  resize();

  gl2.enable(gl2.BLEND);
  gl2.blendFunc(gl2.SRC_ALPHA, gl2.ONE_MINUS_SRC_ALPHA);

  const vertexSrc = `#version 300 es
  precision mediump float;
  layout(location = 0) in vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const fragmentSrc = `#version 300 es
  precision mediump float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  // замедляем — 3x медленнее
  float rand(vec2 p) {
      float t = floor(iTime * 6.6) / 30.0;
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
      // ↓ уменьшено с 2 до 2 — оставлено, так как и так минимально
      // но цикл оставлен как есть, так как он очень лёгкий
      while(count != 0) {
          val += amp * noise(uv + (rand(ceil(uv * 3.) / 3.) * 2.0 + (float(floor(iTime * 6.6) / 30.0)/float(count)) - 1.0), blockiness);
          amp *= 0.5;
          uv *= complexity;
          count--;
      }
      return val;
  }

  // цвета 💜💚💙💗
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

      uv *= 3.5;
      uv.x *= fbm(uv, 2, 2.5, 1.0);
      float n = fbm(uv, 2, 2.0, 1.4);
      float glitch = smoothstep(0.55, 0.8, n);

      float pulse = sin(iTime * 0.8 + uv.x * 8.0) * 0.5 + 0.5;
      glitch *= pow(pulse, 0.6);

      vec3 color = randomColor(floor(uv * 12.0));

      // 🔥 повысим видимость (яркость и альфа)
      float alpha = glitch * 1.2;
      color *= 1.5;

      fragColor = vec4(color * alpha, clamp(alpha, 0.0, 1.0));
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

  // === Пауза при невидимости ===
  let isPaused = false;
  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });
  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  observer.observe(canvas2);

  // === Фиксированный FPS = 50 ===
  const FPS = 50;
  const FRAME_INTERVAL = 1000 / FPS;
  let lastRenderTime = 0;

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
    const t = (now - start) * 0.001;
    gl2.uniform3f(iResolutionLoc, canvas2.width, canvas2.height, 1.0);
    gl2.uniform1f(iTimeLoc, t);
    gl2.drawArrays(gl2.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
