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
  
  // === GLSL Shader: "Accretion" by @XorDev ===
(() => {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webg2');
  if (!gl) {
    console.error('WebGL не поддерживается.');
    return;
  }

  // Размер под окно
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  // Вершинный шейдер
  const vertexSrc = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Фрагментный шейдер (твой Accretion)
  const fragmentSrc = `
#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 iResolution;
uniform float iTime;


vec3 blendNeon(vec3 p, float t) {
    // Базовые цвета
    vec3 c1 = vec3(1.0, 0.0, 1.0);   // 💜 пурпурный
    vec3 c2 = vec3(0.0, 1.0, 0.6);   // 💚 зелёный
    vec3 c3 = vec3(0.0, 1.0, 1.0);   // 💙 голубой
    vec3 c4 = vec3(1.0, 0.4, 0.8);   // 💗 розовый

    // Хаотичные фазы для каждого цвета — даёт "масляное" смешение
    float n1 = sin(p.x * 0.3 + p.y * 0.2 + t * 1.4);
    float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 1.1);
    float n3 = sin(p.z * 0.5 + p.x * 0.4 - t * 1.6);
    float n4 = cos(p.x * 0.2 + p.y * 0.6 + t * 1.8);

    // Каждое значение от -1..1 → 0..1
    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;

    // Смешиваем четыре цвета на основе локальных шумов
    vec3 neon = normalize(
        c1 * n1 +
        c2 * n2 +
        c3 * n3 +
        c4 * n4
    );

    return neon;
}

void mainImage(out vec4 O, vec2 I)
{
    O = vec4(0.0);
    float z = 0.0;
    float d = 0.0;
    vec3 p;

    for (int i = 0; i < 20; i++) {
        float fi = float(i);

        // движение немного замедляем (iTime * 0.5)
        p = z * normalize(vec3(I + I, 0.0) - iResolution.xyx) + 0.1;
        p = vec3(
            atan(p.y / 0.2, p.x) * 2.0,
            p.z / 3.0,
            length(p.xy) - 5.0 - z * 0.2
        );

        // Турбулентность
        for (int j = 1; j <= 7; j++) {
            float fj = float(j);
            p += sin(p.yzx * fj + iTime * 0.5 + 0.3 * fi) / fj;
        }

        z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));

        // <-- Вместо глобального mix теперь локальное смешение по координатам -->
        vec3 neon = blendNeon(p, iTime);

        // Суммируем освещение с локальной палитрой
        O.rgb += (1.0 + cos(p.x + fi * 0.4 + z)) / d * neon;
    }

    // "tanh"-тонмап
    O = (exp(O * O / 400.0) - exp(-O * O / 400.0)) /
        (exp(O * O / 400.0) + exp(-O * O / 400.0));

    O.rgb = pow(O.rgb, vec3(0.8));
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
}
`;


  function compileShader(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');

  function render(time) {
    gl.uniform2f(iResolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(iTimeLoc, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  
})();
});












