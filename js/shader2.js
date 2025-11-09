// assets/js/shader2.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas2 = document.getElementById('shader-canvas2');
  if (!canvas2) return console.error('Canvas #shader-canvas2 не найден!');
  
  // Явно отключаем ненужные флаги для производительности
  const gl2 = canvas2.getContext('webgl2', {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    desynchronized: false
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

  // -------------------- Псевдослучай и шум --------------------
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
      while(count != 0) {
          val += amp * noise(uv + (rand(ceil(uv * 3.) / 3.) * 2.0 + (float(floor(iTime * 6.6) / 30.0)/float(count)) - 1.0), blockiness);
          amp *= 0.5;
          uv *= complexity;
          count--;
      }
      return val;
  }

  // -------------------- Бензиновая палитра --------------------
  vec3 iridescentColor(vec2 pos, float time, float phase)
  {
      vec3 c1 = vec3(0.0, 0.898, 1.0);   // #00E5FF — голубой
      vec3 c2 = vec3(0.451, 0.0, 1.0);   // #7300FF — фиолетовый
      vec3 c3 = vec3(1.0, 0.0, 0.816);   // #FF00D0 — розовый
      vec3 c4 = vec3(0.0, 1.0, 0.5);     // #00FF80 — зелёный

      // равномерная фаза движения
      float angle = time * 0.5 + pos.x * 0.3 + pos.y * 0.15 + phase * 0.5;
      float segment = fract(angle / (6.28318 / 4.0)) * 4.0;

      vec3 col;
      if (segment < 1.0)
          col = mix(c1, c2, smoothstep(0.0, 1.0, segment));
      else if (segment < 2.0)
          col = mix(c2, c3, smoothstep(1.0, 2.0, segment));
      else if (segment < 3.0)
          col = mix(c3, c4, smoothstep(2.0, 3.0, segment));
      else
          col = mix(c4, c1, smoothstep(3.0, 4.0, segment));

      // микроколебания масла
      float flow = sin(pos.x * 0.7 + pos.y * 0.9 + time * 1.5 + phase) * 0.06;
      col += flow;

      // коррекция насыщенности
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, 1.4);

      // ограничение яркости
      float maxVal = max(max(col.r, col.g), col.b);
      if (maxVal > 1.0) col /= (maxVal + 0.1);
      col = pow(clamp(col, 0.0, 1.0), vec3(0.95));
      return col;
  }

  // -------------------- Основной шейдер --------------------
  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      vec2 uv2 = uv;

      uv *= 3.5;
      uv.x *= fbm(uv, 2, 2.5, 1.0);
      float n = fbm(uv, 2, 2.0, 1.4);
      float glitch = smoothstep(0.55, 0.8, n);

      float pulse = sin(iTime * 0.8 + uv.x * 8.0) * 0.5 + 0.5;
      glitch *= pow(pulse, 0.6);

      // --- масляная динамика цвета ---
      float phase = sin(uv.x * 6.0 + uv.y * 3.0);
      vec3 oil = iridescentColor(uv * 1.2, iTime * 0.6, phase);

      // применяем "иридисцентный" цвет вместо фиксированного randomColor
      vec3 color = oil;

      // случайное затухание отдельных блоков
      float fade = rand(floor(uv * 12.0 + iTime));
      float alpha = glitch * smoothstep(0.2, 0.8, fade);

      // лёгкий контроль яркости
      color *= 1.25;
      alpha *= 1.15;

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

  // === Фиксированный FPS = 25 ===
  const FPS = 25;
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
    const t = ((now - start) * 0.001) % 300;
    gl2.uniform3f(iResolutionLoc, canvas2.width, canvas2.height, 1.0);
    gl2.uniform1f(iTimeLoc, t);
    gl2.drawArrays(gl2.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});

