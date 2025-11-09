// assets/js/shader3.js

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("shader-canvas3");
  if (!canvas) return console.error("Canvas #shader-canvas3 не найден!");

  const gl = canvas.getContext("webgl2", {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true
  });
  if (!gl) return console.error("WebGL2 не поддерживается.");

  /* ---------------- Dynamic / Adaptive parameters ---------------- */
  let resolutionScale = 1.0; // 0.55 .. 1.0
  let qualityLevel = 1.0;    // 0.55 .. 1.0
  let fps = 60;
  const fpsSamples = [];
  let lastTimePerf = performance.now();
  let lastAdjustTime = performance.now();
  const ADJUST_INTERVAL = 500;

  /* ---------------- Overlay (diagnostics) ---------------- */
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.bottom = '10px';
  overlay.style.left = '10px';
  overlay.style.zIndex = '9999';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '13px';
  overlay.style.padding = '6px 10px';
  overlay.style.borderRadius = '8px';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.color = '#FFFF00';
  overlay.style.pointerEvents = 'none';
  overlay.style.userSelect = 'none';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.whiteSpace = 'pre';
  document.body.appendChild(overlay);

  function updatePerformance(now) {
    const delta = now - lastTimePerf;
    lastTimePerf = now;
    const currentFps = 1000 / delta;
    fpsSamples.push(currentFps);
    if (fpsSamples.length > 30) fpsSamples.shift();
    fps = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;
  }

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

  function resizeCanvas() {
    const dpr = window.devicePixelRatio * resolutionScale;
    canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /* ---------------- GLSL (vertex + fragment) ---------------- */
  const vertexSrc = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  // Адаптирован фрагментный шейдер из "Новый шейдер.txt" (с исправлениями для texelFetch и size)
  const fragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec3 iResolution;    // (px, px, 1.0)
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform float uQuality;

#define GRID 60.0

// Возвращает "масляный" цвет (без искусственного увеличения яркости)
vec3 iridescentColor(vec2 pos, float time, float phase)
{
    // насыщенные базовые тона (оставляем значения в 0..1)
    vec3 c1 = vec3(0.85, 0.25, 1.00); // фиолетовый
    vec3 c2 = vec3(0.20, 1.00, 0.45); // зелёный
    vec3 c3 = vec3(0.25, 0.80, 1.00); // голубой
    vec3 c4 = vec3(1.00, 0.35, 0.70); // розовый

    float n1 = sin(pos.x * 0.45 + pos.y * 0.25 + time * 2.8 + phase);
    float n2 = cos(pos.y * 0.35 - pos.x * 0.40 + time * 3.2 - phase * 0.7);
    float n3 = sin(pos.x * 0.50 + pos.y * 0.60 - time * 2.6 + phase * 1.3);
    float n4 = cos(pos.x * 0.30 + pos.y * 0.55 + time * 2.2 - phase * 2.1);

    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;

    // Смешиваем волны
    vec3 raw = c1 * n1 + c2 * n2 + c3 * n3 + c4 * n4;

    // Увеличиваем насыщенность (S) без подъёма яркости (V)
    // Приём: перевод к яркости (luminance), затем миксуем
    float lum = dot(raw, vec3(0.299, 0.587, 0.114));
    float saturationBoost = 1.5; // 1.0 = исходная, 1.5 = сильнее насыщение
    vec3 saturated = mix(vec3(lum), raw, saturationBoost);

    // Лёгкая тональная компрессия чтобы предотвратить клиппинг
    // (сглаживаем пиковые значения, чтобы не уходили в белый)
    saturated = saturated / (1.0 + 0.25 * pow(saturated, vec3(2.0)));

    // Небольшая гамма-коррекция (делает цвета живее без клипа)
    return pow(clamp(saturated, 0.0, 1.0), vec3(0.95));
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  
    // === Исправлено: нормализуем по высоте, чтобы символы были квадратные ===
    vec2 grid = floor(fragCoord / iResolution.y * GRID) / (GRID - 1.0);
    float t = grid.y;
    grid += vec2(1.0);

    float speed = sin(grid.x * 532.116 + cos(grid.x * sin(grid.x * 221.215) * 731.55) * 114.124) * 0.4 + 0.6;
    speed *= 0.5;

    t += sin((grid.x + cos(grid.x * 15.0)) * 22.121) * 123.324;
    // ускорение падения зелёной подсветки ×6
    t += speed * (iTime * 6.0) / (GRID - 1.0);
    t *= 0.02 * GRID;
    float q = sin(grid.x * 252.249 + cos(grid.x * sin(grid.x * 112.139) * 13.11) * 55.1) * 1.0 + 2.0;
    float count = floor(t / q);
    t = mod(t, q);
    if (t > 1.0 || t < 0.0) t = 1.0;

        float phase = sin(grid.x * 12.731 + grid.y * 3.91);
vec3 oil = iridescentColor(grid * 0.7, iTime * 0.5, phase);

// контролируемая насыщенность и итоговая яркость (без клиппинга)
float fade = pow(1.0 - t, 3.0);

// Доп. усилитель насыщенности (не яркости) — 1.0..2.0
float finalSaturation = 1.25;
float lumOil = dot(oil, vec3(0.299, 0.587, 0.114));
vec3 oilSat = mix(vec3(lumOil), oil, finalSaturation);

// Итоговый цвет строки (без умножения >1.0 яркости)
vec3 col = clamp(oilSat * fade, 0.0, 1.0);


    // === Исправлено: та же нормализация по высоте для локального uv ===
    vec2 localUV = mod(fragCoord / iResolution.y * GRID, vec2(1.0));

        // --- Генерация псевдослучайного индекса символа с "дрожанием" во времени ---
    float seedBase = sin(grid.x * cos(grid.y * 21952.1112 + count * 11.195 + grid.x * 592.111) * 92.221 +
                         sin(grid.x * 592.5429 * cos(grid.y * 259.6 + count * 23.223))) * 0.5 + 0.5;
    
    // Добавляем временной шум, чтобы символы изредка менялись
    float flicker = fract(sin(grid.x * 93.1 + grid.y * 97.7 + floor(iTime * 7.5)) * 43758.5453);
    
    // Если flicker > 0.5 — перескакиваем на другой символ
    float seed = mix(seedBase, fract(seedBase + flicker * 37.0), step(0.98, flicker));
    
    // Индекс символа из 16x16 атласа
    float random_letter = min(floor(seed * 256.0), 255.0);

    ivec2 atlasSize = textureSize(iChannel0, 0);
    vec2 atlasSizeF = vec2(atlasSize);
    vec2 cell = atlasSizeF / vec2(16.0, 16.0);

    float idxX = floor(random_letter / 16.0);
    float idxY = mod(random_letter, 16.0);

    vec2 charUVpx = (vec2(idxX, idxY) + localUV) * cell;
    ivec2 texCoord = ivec2(floor(charUVpx));
    texCoord = clamp(texCoord, ivec2(0), atlasSize - ivec2(1));

    vec4 letter_mask = texelFetch(iChannel0, texCoord, 0);

    float mask = 1.0 - step(0.5, letter_mask.a);
    float f = max(1.0 - 500.0 * t, 0.0) * 0.35;
    if (mask == 0.0 && f != 0.0)
        mask += smoothstep(0.5 + f, 0.5, pow(letter_mask.a, 0.5)) * 2.0;
    col *= mask;

    fragColor = vec4(col, mask);
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}`;

  /* ---------------- Shader compile/link helpers ---------------- */
  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error("Shader compile error:", log);
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vs || !fs) {
    console.error("Не удалось скомпилировать шейдеры.");
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // Fullscreen quad
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1
  ]), gl.STATIC_DRAW);

  // a_position at location=0 in vertex shader
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const iResolutionLoc = gl.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl.getUniformLocation(prog, "iTime");
  const iMouseLoc = gl.getUniformLocation(prog, "iMouse");
  const uQualityLoc = gl.getUniformLocation(prog, "uQuality");
  const iChannel0Loc = gl.getUniformLocation(prog, "iChannel0");

  /* ---------------- Texture (iChannel0) ---------------- */
  // Загружаем из assets/texture.png
  const texture = gl.createTexture();
  const img = new Image();
  img.crossOrigin = ""; // если понадобится
  img.src = "assets/texture.png";
  let textureLoaded = false;

  img.onload = () => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Заливаем изображение в текстуру
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Если размеры — степень двойки, можно mipmap; иначе — clamp/no-mipmap
    function isPOT(v) { return (v & (v - 1)) === 0; }
    if (isPOT(img.width) && isPOT(img.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.uniform1i(iChannel0Loc, 0);
    textureLoaded = true;
    console.log("iChannel0 texture loaded:", img.width, "x", img.height);
  };

  img.onerror = (e) => {
    console.error("Не удалось загрузить текстуру assets/texture.png", e);
  };

  /* ---------------- Input: mouse, scroll, visibility ---------------- */
  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
  });

  // Scroll influence logic (как в вашем коде)
  let lastScrollY = window.scrollY;
  let scrollSpeed = 0;
  let scrollInfluence = 0;
  let lastScrollTime = performance.now();

  window.addEventListener("scroll", () => {
    const now = performance.now();
    const deltaTime = Math.max(1, now - lastScrollTime);
    lastScrollTime = now;
    const currentScroll = window.scrollY;
    const deltaY = currentScroll - lastScrollY;
    lastScrollY = currentScroll;
    scrollSpeed = deltaY / deltaTime;
    scrollInfluence = scrollSpeed * 0.15;
  });

  let isPaused = false;
  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  observer.observe(canvas);

  /* ---------------- Render loop ---------------- */
  const TARGET_FPS = 30;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let lastRenderTime = performance.now();
  let startTime = performance.now();
  let timeOffset = 0;

  function render(now) {
    // now in ms
    if (isPaused) {
      requestAnimationFrame(render);
      return;
    }

    updatePerformance(now);
    adjustQuality(now);

    if (now - lastRenderTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }

    const dt = (now - lastRenderTime) * 0.001;
    lastRenderTime = now;

    // Resize if needed
    resizeCanvas();

    // Scroll influence decays
    scrollInfluence *= 0.9;
    timeOffset += scrollInfluence * dt * 50.0;

    const t = (now - startTime) * 0.001 + timeOffset;

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Обновляем uniform'ы
    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);
    gl.uniform4f(iMouseLoc, mouseX, mouseY, 0.0, 0.0);
    gl.uniform1f(uQualityLoc, qualityLevel);

    // Если текстура ещё не загружена — рисуем пусто/чёрно, но цикл продолжается.
    if (textureLoaded) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(iChannel0Loc, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    overlay.textContent = `FPS: ${fps.toFixed(1)}\nRES: ${(resolutionScale * 100).toFixed(0)}%\nQUAL: ${(qualityLevel * 100).toFixed(0)}%`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});












