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
    desynchronized: false,
  });

  if (!gl3) return console.error("WebGL2 не поддерживается.");

  function resize() {
    const dpr = window.devicePixelRatio || 1;
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

  const int ITERATIONS = 25;
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

  float hash(float v) { return fract(sin(v) * 43758.5453123); }
  float hash(vec2 v) { return hash(dot(v, vec2(5.3983, 5.4427))); }

  vec2 hash2(vec2 v) {
    v = vec2(v * mat2(127.1, 311.7, 269.5, 183.3));
    return fract(sin(v) * 43758.5453123);
  }

  vec4 hash4(vec3 v) {
    vec4 p = vec4(v * mat4x3(
      127.1, 311.7, 74.7,
      269.5, 183.3, 246.1,
      113.5, 271.9, 124.6,
      271.9, 269.5, 311.7
    ));
    return fract(sin(p) * 43758.5453123);
  }

  float rune_line(vec2 p, vec2 a, vec2 b) {
    p -= a;
    b -= a;
    float h = clamp(dot(p, b) / dot(b, b), 0., 1.);
    return length(p - b * h);
  }

  float rune(vec2 U, vec2 seed, float highlight) {
    float d = 1e5;
    for (int i = 0; i < 4; i++) {
      vec4 pos = hash4(vec3(seed, float(i)));
      if (i == 0) pos.y = 0.0;
      if (i == 1) pos.x = 0.999;
      if (i == 2) pos.x = 0.0;
      if (i == 3) pos.y = 0.999;
      vec4 snaps = vec4(2, 3, 2, 3);
      pos = (floor(pos * snaps) + 0.5) / snaps;
      if (pos.xy != pos.zw) d = min(d, rune_line(U, pos.xy, pos.zw + 0.001));
    }
    return smoothstep(0.1, 0., d) + highlight * smoothstep(0.4, 0., d);
  }

  float random_char(vec2 outer, vec2 inner, float highlight) {
    vec2 seed = vec2(dot(outer, vec2(269.5, 183.3)), dot(outer, vec2(113.5, 271.9)));
    return rune(inner, seed, highlight);
  }

  vec3 rain(vec3 ro3, vec3 rd3, float time) {
    vec4 result = vec4(0.);
    vec2 ro2 = vec2(ro3);
    vec2 rd2 = normalize(vec2(rd3));
    bool prefer_dx = abs(rd2.x) > abs(rd2.y);
    float t3_to_t2 = prefer_dx ? rd3.x / rd2.x : rd3.y / rd2.y;
    ivec3 cell_side = ivec3(step(0., rd3));
    ivec3 cell_shift = ivec3(sign(rd3));
    float t2 = 0.;
    vec2 adjustedRo2 = ro2 + vec2(XYCELL_SIZE * 0.5);
    ivec2 next_cell = ivec2(floor(adjustedRo2 / XYCELL_SIZE));

    for (int i = 0; i < ITERATIONS; i++) {
      ivec2 cell = next_cell;
      float t2s = t2;
      vec2 side = vec2(next_cell + cell_side.xy) * XYCELL_SIZE;
      vec2 t2_side = (side - ro2) / rd2;
      if (t2_side.x < t2_side.y) {
        t2 = t2_side.x;
        next_cell.x += cell_shift.x;
      } else {
        t2 = t2_side.y;
        next_cell.y += cell_shift.y;
      }
      float xycell_hash = hash(vec2(cell));
      float z_shift = xycell_hash * 11. - time * (0.5 + xycell_hash * 1.0 +
                      xycell_hash * xycell_hash + pow(xycell_hash, 16.) * 3.0);
      int zcell = int(floor((ro3.z - z_shift) / ZCELL_SIZE));
      for (int j = 0; j < 2; j++) {
        vec4 cell_hash = hash4(vec3(cell, zcell));
        float chars_count = cell_hash.w * (STRIP_CHARS_MAX - STRIP_CHARS_MIN) + STRIP_CHARS_MIN;
        float target_length = chars_count * STRIP_CHAR_HEIGHT;
        vec2 target = vec2(cell) * XYCELL_SIZE + cell_hash.xy * XYCELL_SIZE;
        float tmin = dot(target - ro2, rd2);
        if (tmin >= t2s && tmin <= t2) {
          float u = (target.x - ro2.x) * rd2.y - (target.y - ro2.y) * rd2.x;
          if (abs(u) < STRIP_CHAR_WIDTH) {
            float z = ro3.z + rd3.z * tmin / t3_to_t2;
            float v = fract((z - z_shift) / target_length);
            float c = floor(v * chars_count);
            float q = fract(v * chars_count);
            vec2 char_hash = hash2(vec2(c, cell_hash.z));
            float a = random_char(vec2(char_hash.x, time * 2.0), vec2(u, q), 0.3);
            result.rgb += oilMix(vec3(u, q, z), time * 0.6) * a;
          }
        }
        zcell += cell_shift.z;
      }
    }
    return result.rgb;
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    vec2 mouse = iMouse.xy / iResolution.xy;
    mouse = (mouse - 0.5) * 2.0;
    uv += mouse * 0.05;

    float time = mod(iTime, 240.0) * SPEED;
    vec3 ro = vec3(0.5, 0.5, 0.0);
    vec3 rd = vec3(uv.x, 2.0, uv.y);
    vec3 col = rain(ro, rd, time);
    fragColor = vec4(col, length(col) > 0.001 ? 1.0 : 0.0);
  }

  void main() {
    vec4 c;
    mainImage(c, gl_FragCoord.xy);
    fragColor = c;
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

  let start = performance.now();
  let mouseX = 0, mouseY = 0;
  let scrollSpeed = 0;
  let scrollPos = window.scrollY;
  let timeScale = 1;

  window.addEventListener("mousemove", (e) => {
    const rect = canvas3.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
  });

  // Скролл управляет направлением и скоростью времени
  window.addEventListener("scroll", () => {
    const newPos = window.scrollY;
    const delta = newPos - scrollPos;
    scrollSpeed = delta * -0.002; // чем больше delta, тем быстрее реверс
    scrollPos = newPos;
  });

  // Плавное затухание эффекта скролла
  setInterval(() => {
    scrollSpeed *= 0.9;
  }, 30);

  let isPaused = false;
  document.addEventListener("visibilitychange", () => { isPaused = document.hidden; });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  observer.observe(canvas3);

  function render(now) {
    requestAnimationFrame(render);
    if (isPaused) return;

    resize();
    const elapsed = (now - start) * 0.001;

    // Скролл добавляет отрицательное ускорение ко времени
    timeScale += scrollSpeed;
    timeScale = Math.max(-2, Math.min(2, timeScale)); // ограничим диапазон
    const time = elapsed * timeScale;

    gl3.clearColor(0, 0, 0, 0);
    gl3.clear(gl3.COLOR_BUFFER_BIT);

    gl3.uniform3f(iResolutionLoc, canvas3.width, canvas3.height, 1.0);
    gl3.uniform1f(iTimeLoc, time);
    gl3.uniform4f(iMouseLoc, mouseX, mouseY, 0.0, 0.0);

    gl3.drawArrays(gl3.TRIANGLES, 0, 6);
  }

  requestAnimationFrame(render);
});
