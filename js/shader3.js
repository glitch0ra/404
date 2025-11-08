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

float hash(float v) { return fract(sin(v) * 43758.5453123); }
float hash(vec2 v) { return hash(dot(v, vec2(5.3983, 5.4427))); }
vec2 hash2(vec2 v) { v = vec2(v * mat2(127.1, 311.7, 269.5, 183.3)); return fract(sin(v) * 43758.5453123); }
vec4 hash4(vec3 v) {
    vec4 p = vec4(v * mat4x3(127.1, 311.7, 74.7, 269.5, 183.3, 246.1, 113.5, 271.9, 124.6, 271.9, 269.5, 311.7));
    return fract(sin(p) * 43758.5453123);
}

// ─────────── Пиксельный шрифт 0 и 1 ───────────
float digit(vec2 uv, int num) {
    uv = floor(uv * vec2(4.0, 6.0)); // 4x6 пиксельная сетка
    // Переворот по вертикали и горизонтали, чтобы не было зеркала
    uv.y = 5.0 - uv.y;
    uv.x = 3.0 - uv.x;

    if (any(lessThan(uv, vec2(0.0))) || any(greaterThanEqual(uv, vec2(4.0, 6.0)))) 
        return 0.0;

    // форма нуля (1 — активный пиксель)
    int zeroData[24] = int[24](
        1,1,1,1,
        1,0,0,1,
        1,0,0,1,
        1,0,0,1,
        1,0,0,1,
        1,1,1,1
    );

    // форма единицы (нормальная, без зеркала)
    int oneData[24] = int[24](
        0,1,0,0,
        1,1,0,0,
        0,1,0,0,
        0,1,0,0,
        0,1,0,0,
        1,1,1,0
    );

    int idx = int(uv.y * 4.0 + uv.x);
    return (num == 0) ? float(zeroData[idx]) : float(oneData[idx]);
}

// Случайный выбор цифры и мерцание
float random_digit(vec2 outer, vec2 inner, float time) {
    // ↓ была 0.02, теперь смена символов в ~10 раз медленнее
    float h = hash(outer + floor(time * 0.002)); 
    int n = int(floor(h * 2.0)); // 0 или 1
    float pixel = digit(inner, n);

    // ↓ мерцание тоже в 10 раз медленнее
    float flicker = smoothstep(0.4, 0.6,
        fract(sin(dot(outer, vec2(37.1, 91.7)) + time * 0.006))
    );

    return pixel * flicker;
}

// ─────────── Главная логика дождя ───────────
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

    int maxIterations = int(mix(15.0, 25.0, uQuality));
    for (int i = 0; i < 25; i++) {
        if (i >= maxIterations) break;
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
        vec2 cell_in_block = fract(vec2(cell) / float(BLOCK_SIZE));
        float gap = float(BLOCK_GAP) / float(BLOCK_SIZE);
        if (cell_in_block.x < gap || cell_in_block.y < gap) continue;

        float xycell_hash = hash(vec2(cell));
        float z_shift = xycell_hash * 11. - time * (0.5 + xycell_hash * 1.0 + xycell_hash * xycell_hash + pow(xycell_hash, 16.) * 3.0);
        float char_z_shift = floor(z_shift / STRIP_CHAR_HEIGHT);
        z_shift = char_z_shift * STRIP_CHAR_HEIGHT;
        int zcell = int(floor((ro3.z - z_shift) / ZCELL_SIZE));

        for (int j = 0; j < 2; j++) {
            vec4 cell_hash = hash4(vec3(ivec3(cell, zcell)));
            vec4 cell_hash2 = fract(cell_hash * vec4(127.1, 311.7, 271.9, 124.6));
            float chars_count = cell_hash.w * (STRIP_CHARS_MAX - STRIP_CHARS_MIN) + STRIP_CHARS_MIN;
            float target_length = chars_count * STRIP_CHAR_HEIGHT;
            float target_rad = STRIP_CHAR_WIDTH / 2.;
            float target_z = (float(zcell) * ZCELL_SIZE + z_shift) + cell_hash.z * (ZCELL_SIZE - target_length);
            vec2 target = vec2(cell) * XYCELL_SIZE + target_rad + cell_hash.xy * (XYCELL_SIZE - target_rad * 2.);
            vec2 s = target - ro2;
            float tmin = dot(s, rd2);
            float dist = tmin / t3_to_t2;
            if (dist < 4.0) continue;

            if (tmin >= t2s && tmin <= t2) {
                float u = s.x * rd2.y - s.y * rd2.x;
                if (abs(u) < target_rad) {
                    u = (u / target_rad + 1.) / 2.;
                    float z = ro3.z + rd3.z * tmin / t3_to_t2;
                    float v = (z - target_z) / target_length;
                    if (v >= 0.0 && v < 1.0) {
                        float c = floor(v * chars_count);
                        float q = fract(v * chars_count);
                        vec2 char_hash = hash2(vec2(c + char_z_shift, cell_hash2.x));
                        float time_factor = time * 0.2 + char_hash.y * 10.0; // было 2.0 → стало 0.2
                        float a = random_digit(vec2(char_hash.x, time_factor), vec2(u, q), time);
                        a *= clamp((chars_count - 0.5 - c) / 2., 0., 1.);
                        a *= smoothstep(4.0, 6.0, dist);
                        if (a > 0.) {
                            float attenuation = 1. + pow(0.06 * tmin / t3_to_t2, 2.);
                            float colorShift = hash(vec2(cell)) * 6.2831;
                            vec3 baseColor = oilMix(vec3(target.xy * 0.05, target_z * 0.1), iTime * 0.6 + colorShift);
                            vec3 col = baseColor / attenuation;
                            float a1 = result.a;
                            result.a = a1 + (1. - a1) * a;
                            result.xyz = (result.xyz * a1 + col * (1. - a1) * a) / result.a;
                            if (result.a > 0.98) return result.xyz;
                        }
                    }
                }
            }
            zcell += cell_shift.z;
        }
    }
    return result.xyz * result.a;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    uv.x += 60.0 / iResolution.y;
    vec2 mouse = iMouse.xy / iResolution.xy;
    mouse = (mouse - 0.5) * 2.0;
    uv += mouse * 0.02;
    float time = mod(iTime, 240.0) * SPEED;
    vec3 ro = vec3(0.5, 0.5, 0.0);
    vec3 rd = vec3(uv.x, 2.0, uv.y);
    vec3 col = rain(ro, rd, time);

    float saturation = 1.5;
    float contrast = 1.3;
    float brightnessBoost = 0.15;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, saturation);
    col = (col - 0.5) * contrast + 0.5;
    col += brightnessBoost;
    col = clamp(col, 0.0, 1.0);

    float brightness = max(col.r, max(col.g, col.b));
    float alpha = brightness > 0.1 ? 1.0 : 0.0;
    col *= alpha;
    fragColor = vec4(pow(col, vec3(0.8)) * 1.2, alpha);
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




