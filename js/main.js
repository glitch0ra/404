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
