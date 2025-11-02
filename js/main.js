// === ВСТРОЕННЫЙ WEBGL-ШЕЙДЕР: The Universe Within (BigWings) ===
(() => {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vertSrc = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragSrc = `
   precision mediump float;
varying vec2 vUv;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

// --- Параметры ---
#define USE_AA 0      // 1 = сглаживание (медленнее), 0 = без (быстрее)
#define K 8.0

// SDF сферы
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// SDF сцены
float map(vec3 pos) {
    float r = 0.5;
    vec3 d = vec3(0.2, 0.7, 0.2);
    float h = -cos(iTime * 0.125) * 5.0;

    float sminAcc = 0.0;
    sminAcc += exp2(-K * sdSphere(pos - d * vec3(sin(iTime*0.5 + 0.2), sin(iTime*0.476 + 0.4) + h, sin(iTime*0.435 + 0.7)), r));
    sminAcc += exp2(-K * sdSphere(pos - d * vec3(sin(iTime*0.417 + 1.3), sin(iTime*0.526 + 0.5) + h, sin(iTime*0.4 + 0.2)), r));
    sminAcc += exp2(-K * sdSphere(pos - d * vec3(sin(iTime*0.345 + 2.3), sin(iTime*0.333 + 0.3) + h, sin(iTime*0.385 + 0.8)), r));
    sminAcc += exp2(-K * sdSphere(pos - d * vec3(sin(iTime*0.455 + 2.9), sin(iTime*0.357 + 0.8) + h, sin(iTime*0.556 + 0.9)), r));

    // Пол (горизонтальная плоскость)
    sminAcc += exp2(-K * (2.0 - abs(pos.y)));

    return -log2(sminAcc) / K;
}

// Нормаль через конечные разности
vec3 calcNormal(vec3 pos) {
    const float eps = 0.0005;
    const vec2 h = vec2(eps, 0.0);
    float d = map(pos);
    return normalize(vec3(
        map(pos + h.xyy) - d,
        map(pos + h.yxy) - d,
        map(pos + h.yyx) - d
    ));
}

// Туман (fog)
vec3 applyFog(vec3 rgb, float distance, vec3 fogColor) {
    float fogAmount = 1.0 - exp(-distance * 0.3);
    return mix(rgb, fogColor, fogAmount);
}

// Камера
mat3 setCamera(vec3 ro, vec3 ta) {
    vec3 cw = normalize(ta - ro);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 cu = normalize(cross(cw, up));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

// Рендер лавовой лампы с модифицированными линиями
vec3 lavaLamp(vec3 ro, vec3 rd, vec3 cd, float maxDist) {
    float t = 1.0;
    float d = 0.0;

    for (int i = 0; i < 64; i++) {
        vec3 p = ro + t * rd;
        float h = map(p);
        t += h;
        d = dot(t * rd, cd);
        if (abs(h) < 0.001 || d > maxDist) break;
    }

    vec3 col = vec3(0.0);
    if (d < maxDist) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        // Проекция "клетчатого" узора — линии тоньше
        pos *= 3.0;
        pos.z += iTime * 0.4;
        vec3 proj = abs(fract(pos) - 0.5);
        proj = smoothstep(0.15, 0.0, proj); // ← тоньше линии (было 0.1)
        col = proj * smoothstep(0.1, 0.9, vec3(1.0) - abs(nor));
        col = vec3(max(max(col.x, col.y), col.z));

        // Градиент по ВЕРТИКАЛИ: сверху — фиолетовый, снизу — зелёный
        float uvy = (pos.y + 3.0) / 6.0; // нормализация по Y
        uvy = clamp(uvy, 0.0, 1.0);
        vec3 topColor = vec3(0.8, 0.0, 1.0);    // фиолетовый
        vec3 bottomColor = vec3(0.0, 1.0, 0.3); // зелёный
        col *= mix(bottomColor, topColor, uvy); // сверху → topColor, снизу → bottomColor

        col = applyFog(col, d, vec3(0.0));
    }
    return col;
}

void main() {
    vec2 fragCoord = vUv * iResolution.xy;

    vec3 total = vec3(0.0);

#if USE_AA
    vec2 rook[4];
    rook[0] = vec2(1.0/8.0, 3.0/8.0);
    rook[1] = vec2(3.0/8.0, -1.0/8.0);
    rook[2] = vec2(-1.0/8.0, -3.0/8.0);
    rook[3] = vec2(-3.0/8.0, 1.0/8.0);
    for (int n = 0; n < 4; n++) {
        vec2 p = (-iResolution.xy + 2.0 * (fragCoord + rook[n])) / iResolution.y;
#else
        vec2 p = (-iResolution.xy + 2.0 * fragCoord) / iResolution.y;
#endif

        // Позиция камеры
        vec3 ro = vec3(0.0, 0.5, 4.0);
        vec3 ta = vec3(0.0, 0.0, 0.0);
        mat3 cam = setCamera(ro, ta);
        vec3 rd = cam * normalize(vec3(p, 1.0));

        vec3 col = lavaLamp(ro, rd, cam[2], 7.0);
        total += col;

#if USE_AA
    }
    total /= 4.0;
#endif

    // Гамма-коррекция
    total = pow(total, vec3(1.0 / 2.2));

    // Прозрачность ограничена до 50%
    float alpha = min(0.5, length(total) * 2.0);
    gl_FragColor = vec4(total, alpha);
}
  `;

  function compileShader(src, type) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const v = compileShader(vertSrc, gl.VERTEX_SHADER);
  const f = compileShader(fragSrc, gl.FRAGMENT_SHADER);
  if (!v || !f) return;

  const program = gl.createProgram();
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const posLoc = gl.getAttribLocation(program, 'aPosition');
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uniRes = gl.getUniformLocation(program, 'iResolution');
  const uniTime = gl.getUniformLocation(program, 'iTime');
  const uniMouse = gl.getUniformLocation(program, 'iMouse');

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function fitCanvas() {
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    resizeCanvas();
  }

  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  let mouseX = 0, mouseY = 0, clickX = 0, clickY = 0;
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mouseX = (e.clientX - rect.left) * dpr;
    mouseY = (rect.height - (e.clientY - rect.top)) * dpr;
  });
  window.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    clickX = (e.clientX - rect.left) * dpr;
    clickY = (rect.height - (e.clientY - rect.top)) * dpr;
  });

  let startTime = performance.now();
function render(now) {
  resizeCanvas();
  const t = (now - startTime) / 1000.0;
  if (uniRes) gl.uniform3f(uniRes, canvas.width, canvas.height, 0.0);
  if (uniTime) gl.uniform1f(uniTime, t);
  if (uniMouse) gl.uniform4f(uniMouse, mouseX, mouseY, clickX, clickY);
  gl.clearColor(0, 0, 0, 0);              
  gl.clear(gl.COLOR_BUFFER_BIT);           
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
})();


document.addEventListener('DOMContentLoaded', () => {
  const galleries = {
    vhs: [
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #01", desc: "Analog decay with hidden signal." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #02", desc: "Magnetic distortion, encrypted layer." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #03", desc: "Time-stretched reality glitch." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #04", desc: "Signal lost in tape warp." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #05", desc: "Ghost frame from parallel broadcast." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #06", desc: "Digital rupture in analog shell." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #07", desc: "Tape hiss artifact." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #08", desc: "Vertical hold failure." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #09", desc: "Chroma bleed signal." },
      { src: "https://glichorahost.pages.dev/Shylily.png", title: "VHS Glitch #10", desc: "Final frame corruption." }
    ],
    matrix: [
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #01", desc: "Matrix code breach with hidden layer." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #02", desc: "Reality fracture in 4K noise." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #03", desc: "Encrypted motion in digital void." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #04", desc: "Signal from the other side." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #05", desc: "Glitch as poetic artifact." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #06", desc: "Forbidden animation in noise." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #07", desc: "Data stream collapse." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #08", desc: "Recursive reality loop." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #09", desc: "Neural net overflow." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #10", desc: "Terminal signal received." }
    ]
  };

  // --- ИНИЦИАЛИЗАЦИЯ Intersection Observer для ленивой загрузки (из предыдущего ответа) ---
  let mediaObserver;

  function initMediaObserver() {
    if (mediaObserver) return;

    const observerOptions = {
      root: null,
      rootMargin: '100px',
      threshold: 0.01,
    };

    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const bgUrl = target.getAttribute('data-bg');
          if (bgUrl) {
            target.style.backgroundImage = `url(${bgUrl})`;
            target.removeAttribute('data-bg');
            target.classList.remove('lazy-bg');
            observer.unobserve(target);
          }
        }
      });
    };

    mediaObserver = new IntersectionObserver(observerCallback, observerOptions);
  }
  // --- /ИНИЦИАЛИЗАЦИЯ Intersection Observer ---

  function initCarousel(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || container.hasAttribute('data-loaded')) return;

    // Инициализируем наблюдатель при первой загрузке карусели
    initMediaObserver();

    const inner = container.querySelector('.inner');
    const quantity = items.length;
    inner.style.setProperty('--quantity', quantity);
    inner.innerHTML = '';

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--index', index);

      // Создаём div для изображения
      const imgDiv = document.createElement('div');
      imgDiv.className = 'img lazy-bg'; // Добавляем класс-маркер
      imgDiv.setAttribute('data-bg', item.src); // Сохраняем URL в data-bg

      card.appendChild(imgDiv);
      inner.appendChild(card);

      card.addEventListener('click', () => {
        document.getElementById('modal-image').src = item.src;
        document.getElementById('modal-title').textContent = item.title;
        document.getElementById('modal-description').textContent = item.desc;
        document.getElementById('modal').classList.add('show');
        document.body.style.overflow = 'hidden';
      });

      card.addEventListener('mouseenter', () => {
        inner.classList.add('paused');
        container.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });

      card.addEventListener('mouseleave', () => {
        inner.classList.remove('paused');
        card.classList.remove('active');
      });

      // НАБЛЮДЕНИЕ ЗА КАРТОЧКОЙ ИЗОБРАЖЕНИЯ
      if (mediaObserver) {
        mediaObserver.observe(imgDiv);
      }
    });

    container.setAttribute('data-loaded', 'true');
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('show');
    document.body.style.overflow = '';
  }

  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const actionBtn = modal.querySelector('.btn');
    if (actionBtn) actionBtn.addEventListener('click', closeModal);
  }

  // === Переключение вкладок с хэшем ===
  function showPage(pageId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
    if (page && btn) {
      btn.classList.add('active');
      page.classList.add('active');
      if (pageId === 'vhs') initCarousel('carousel-vhs', galleries.vhs);
      if (pageId === 'matrix') initCarousel('carousel-matrix', galleries.matrix);
    }
  }

  document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
      const pageId = button.dataset.page;
      window.location.hash = pageId;
      showPage(pageId);
    });
  });

  const hash = window.location.hash.replace('#', '') || 'home';
  showPage(hash);

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    showPage(hash);
  });
});













