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

  // ---------- Полный фрагментный шейдер (готовый к использованию) ----------
  const fragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec3 iResolution; // x = width, y = height, z = 1.0
uniform float iTime;
uniform vec4 iMouse;
uniform float uQuality;
uniform sampler2D uFontAtlas;

const float PI = 3.141592653589793;
const float CHAR_SCALE = 1.2; // масштаб символа (1.2 как ты просил)
const int COLUMNS = 60; // количество колонн (регулируй для плотности)
const int ROWS = 80;   // сколько символов по вертикали логически

// быстрые хэши
float hash13(float n) {
    return fract(sin(n) * 43758.5453123);
}
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}
vec2 hash22(vec2 p) {
    vec2 q = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
    return fract(sin(q) * 43758.5453123);
}

// берём пиксель из атласа: слева '1', справа '0' (каждый занимает половину по X)
float sampleGlyphAlpha(vec2 innerUV, int digit) {
    // innerUV: локальные координаты символа 0..1 (x,y)
    // увеличиваем область выборки, чтобы символы были крупнее
    innerUV = (innerUV - 0.5) / CHAR_SCALE + 0.5;

    // отражаем по X, если нужно (развернуть символы)
    innerUV.x = 1.0 - innerUV.x;

    float xOffset = (digit == 1) ? 0.0 : 0.5; // слева 1, справа 0
    vec2 atlasUV = vec2(xOffset + innerUV.x * 0.5, 1.0 - innerUV.y);
    vec4 t = texture(uFontAtlas, atlasUV);
    // используем альфу как маску (предполагаем прозрачный фон)
    return t.a;
}

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

void mainImage(out vec4 outColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord.xy / res; // 0..1
    // flip Y to match texture orientation if needed
    uv.y = 1.0 - uv.y;

    // сохраняем aspect для корректного расположения по X
    float aspect = res.x / res.y;
    vec2 uvA = vec2(uv.x * aspect, uv.y);

    // базовый цвет
    vec3 accum = vec3(0.0);

    // параметры контролируемые
    float speedGlobal = 0.00001; // сверхмедленное изменение символов/смещение
    float dropSpeed = 0.05; // скорость падения (модифицируй при необходимости)

    // loop по колонкам — распределяем равномерно по ширине
    for (int ci = 0; ci < COLUMNS; ci++) {
        float idx = float(ci);

        // равномерная базовая позиция X (0..1)
        float colWidth = 1.0 / float(COLUMNS);
        float baseX = (idx + 0.5) * colWidth;

        // небольшой детерминированный джиттер (без bias'а в центр)
        float jitter = (hash21(vec2(idx, 12.34)) - 0.5) * colWidth * 0.4;
        float colX = baseX + jitter;

        // если пиксель далеко по X — пропускаем
        float dx = abs(uv.x - colX);
        if (dx > colWidth * 0.6) continue;

        // вертикальный оффсет для этой колонки — равномерный, с зависимостью от iTime
        // используем детерминированный базовый оффсет per-column
        float baseOffset = hash21(vec2(idx, 56.78));
        // движение вниз: iTime влияет, но сильно замедленно для редких смен
        float scroll = fract(baseOffset + iTime * dropSpeed);

        // каждая колонка содержит логически ROWS символов по Y
        // вычислим, в какую строку попадает текущий пиксель относительно этой колонки
        float localY = fract((uv.y + scroll) * float(ROWS));

        // высота символа в UV-координатах
        float symHeight = 1.0 / float(ROWS);
        // расстояние в Y от центра символа в данной колонке
        float centerY = floor((uv.y + scroll) * float(ROWS)) * symHeight + symHeight * 0.5;
        float dy = abs(uv.y - centerY);

        // ограничитель по Y — только если близко к центру символа, иначе пропускаем
        if (dy > symHeight * 0.6) continue;

        // определяем индекс символа (строка внутри столбца)
        float rowIndex = floor((uv.y + scroll) * float(ROWS));

        // выбор цифры 0/1 детерминировано от столбца и строки, но очень медленно меняется со временем
        float slowTime = floor(iTime * speedGlobal); // change in huge intervals
        float pickHash = hash21(vec2(idx * 12.989, rowIndex * 78.233 + slowTime));
        int digit = (pickHash < 0.5) ? 0 : 1;

        // innerUV внутри символа 0..1
        // innerX — нормализуем по ширине колонки: uv.x в пределах [colX - colWidth/2, colX + colWidth/2]
        float innerX = (uv.x - (colX - colWidth * 0.5)) / (colWidth);
        float innerY = fract((uv.y + scroll) * float(ROWS));

        // sample alpha из атласа
        float glyphA = sampleGlyphAlpha(vec2(innerX, innerY), digit);

        if (glyphA <= 0.003) continue;

        // цвет колонки (производим oilMix для вариативности)
        float colorShift = hash21(vec2(idx, rowIndex)) * 6.28318;
        vec3 baseColor = oilMix(vec3(colX * 0.05, rowIndex * 0.02, scroll), iTime * 0.6 + colorShift);
        // делаем более зеленый тон
        vec3 glyphColor = mix(vec3(0.1, 0.8, 0.45), baseColor, 0.6);

        // attenuation по расстоянию от центра символа (чтобы края мягче)
        float att = smoothstep(0.6, 0.0, dx / (colWidth * 0.5)) * smoothstep(0.6, 0.0, dy / (symHeight * 0.5));

        accum += glyphColor * glyphA * att;
    }

    // post processing: contrast/brightness
    float saturation = 1.4;
    float contrast = 1.2;
    float brightnessBoost = 0.05;
    float lum = dot(accum, vec3(0.299, 0.587, 0.114));
    accum = mix(vec3(lum), accum, saturation);
    accum = (accum - 0.5) * contrast + 0.5;
    accum += brightnessBoost;
    accum = clamp(accum, 0.0, 1.0);

    float alpha = max(accum.r, max(accum.g, accum.b)) > 0.01 ? 1.0 : 0.0;
    outColor = vec4(pow(accum, vec3(0.9)) * 1.1, alpha);
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
  if (!vs || !fs) return; // если компиляция упала — выходим

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
  const uFontAtlasLoc = gl3.getUniformLocation(prog, "uFontAtlas");

  // ───── подготовка текстуры атласа (texture01.png) ─────
  const texture01 = gl3.createTexture();
  const image = new Image();
  image.src = "assets/texture01.png"; // путь к твоей текстуре — проверь, что файл по этому пути находится
  image.onload = () => {
    gl3.bindTexture(gl3.TEXTURE_2D, texture01);
    gl3.texImage2D(gl3.TEXTURE_2D, 0, gl3.RGBA, gl3.RGBA, gl3.UNSIGNED_BYTE, image);
    // для пиксельного шрифта NEAREST предпочтительно
    gl3.texParameteri(gl3.TEXTURE_2D, gl3.TEXTURE_MIN_FILTER, gl3.NEAREST);
    gl3.texParameteri(gl3.TEXTURE_2D, gl3.TEXTURE_MAG_FILTER, gl3.NEAREST);
    gl3.texParameteri(gl3.TEXTURE_2D, gl3.TEXTURE_WRAP_S, gl3.CLAMP_TO_EDGE);
    gl3.texParameteri(gl3.TEXTURE_2D, gl3.TEXTURE_WRAP_T, gl3.CLAMP_TO_EDGE);

    // назначаем uniform один раз
    gl3.useProgram(prog);
    gl3.activeTexture(gl3.TEXTURE0);
    gl3.bindTexture(gl3.TEXTURE_2D, texture01);
    if (uFontAtlasLoc) gl3.uniform1i(uFontAtlasLoc, 0);
  };
// fallback если картинка не загрузилась
image.onerror = () => {
  const whitePixel = new Uint8Array([255, 255, 255, 255]);
  gl3.bindTexture(gl3.TEXTURE_2D, texture01);
  gl3.texImage2D(gl3.TEXTURE_2D, 0, gl3.RGBA, 1, 1, 0, gl3.RGBA, gl3.UNSIGNED_BYTE, whitePixel);
  gl3.texParameteri(gl3.TEXTURE_2D, gl3.TEXTURE_MIN_FILTER, gl3.NEAREST);
  gl3.texParameteri(gl3.TEXTURE_2D, gl3.TEXTURE_MAG_FILTER, gl3.NEAREST);
  if (uFontAtlasLoc) {
    gl3.useProgram(prog);
    gl3.activeTexture(gl3.TEXTURE0);
    gl3.bindTexture(gl3.TEXTURE_2D, texture01);
    gl3.uniform1i(uFontAtlasLoc, 0);
  }
};

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

    // биндим текстуру и шейдерные униформы
    gl3.activeTexture(gl3.TEXTURE0);
    gl3.bindTexture(gl3.TEXTURE_2D, texture01);
    if (uFontAtlasLoc) gl3.uniform1i(uFontAtlasLoc, 0);

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
