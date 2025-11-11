// ============================================================================
// ЛИЧНАЯ МЕДИА-ГАЛЕРЕЯ
// JavaScript для стилей Liquid Glass + Anti-Design
// ============================================================================

// ==================== БАЗОВЫЕ ДАННЫЕ ====================
const GALLERY_DATA = {
  main: [
    {
      id: 1,
      title: "Проект 'Киберпанк 2077'",
      description: "Исследование будущего через призму киберпанка. Эксперименты с неоновыми эффектами и дисторсией.",
      mainImage: "https://picsum.photos/1200/600?random=1",
      screenshots: [
        "https://picsum.photos/400/300?random=11",
        "https://picsum.photos/400/300?random=12",
        "https://picsum.photos/400/300?random=13"
      ],
      video: "https://www.w3schools.com/html/mov_bbb.mp4",
      date: "2025-01-15"
    },
    {
      id: 2,
      title: "Абстрактные визуализации",
      description: "Эксперименты с формами и цветом в стиле Anti-Design. Разрушение канонов типографики и композиции.",
      mainImage: "https://picsum.photos/1200/600?random=2",
      screenshots: [
        "https://picsum.photos/400/300?random=21",
        "https://picsum.photos/400/300?random=22",
        "https://picsum.photos/400/300?random=23"
      ],
      video: "https://www.w3schools.com/html/mov_bbb.mp4",
      date: "2025-01-10"
    }
  ],
  
  collections: [
    {
      id: "col-1",
      name: "Серия 'Неоновые сны'",
      description: "Серия работ в жанре цифрового арта с яркими неоновыми акцентами",
      images: Array.from({length: 8}, (_, i) => `https://picsum.photos/500/500?random=col1-${i}`)
    },
    {
      id: "col-2",
      name: "Фрактальные структуры",
      description: "Минималистичные композиции на основе фрактальных паттернов",
      images: Array.from({length: 5}, (_, i) => `https://picsum.photos/500/500?random=col2-${i}`)
    }
  ],
  
  screenshots: [
    {
      id: "ss-1",
      title: "Этапы разработки проекта A",
      description: "Процесс создания первой версии интерфейса",
      images: Array.from({length: 6}, (_, i) => `https://picsum.photos/600/400?random=ss1-${i}`)
    },
    {
      id: "ss-2",
      title: "UI/UX Прототипы",
      description: "Эскизы интерфейсов и варианты взаимодействия",
      images: Array.from({length: 4}, (_, i) => `https://picsum.photos/600/400?random=ss2-${i}`)
    }
  ],
  
  videos: [
    {
      id: "vid-1",
      title: "Видео-процессы создания",
      description: "Записи экрана и таймлапсы работы над проектами",
      videos: [
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://picsum.photos/800/450?random=vid1-1" },
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://picsum.photos/800/450?random=vid1-2" },
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://picsum.photos/800/450?random=vid1-3" }
      ]
    }
  ],
  
  history: [
    {
      id: "h-1",
      title: "Проект 'Квантовый скачок'",
      description: "Это был долгий путь от идеи до реализации. Началось все с простого эскиза на бумаге в 3 часа ночи. Проект начался в 2024 году как эксперимент по объединению двух стилей: Liquid Glass и Anti-Design.",
      mainImage: "https://picsum.photos/600/800?random=hist1",
      verticalVideo: "https://www.w3schools.com/html/mov_bbb.mp4",
      date: "2024-12-01"
    },
    {
      id: "h-2",
      title: "Эволюция стиля",
      description: "Как я пришел к Anti-Design через боль и разочарование в современных трендах. Ключевым моментом стала разработка системы сеток, которая позволяла бы размещать большое количество элементов без ощущения захламленности.",
      mainImage: "https://picsum.photos/600/800?random=hist2",
      verticalVideo: "https://www.w3schools.com/html/mov_bbb.mp4",
      date: "2024-11-15"
    }
  ]
};

// ==================== УТИЛИТЫ ====================
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => context.querySelectorAll(selector);
const createElement = (tag, classes = [], attrs = {}) => {
  const el = document.createElement(tag);
  if (classes.length) el.classList.add(...classes);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
};

// ==================== МЕНЕДЖЕР ВКЛАДОК ====================
class TabManager {
  constructor() {
    this.activeTab = null;
    this.tabButtons = $$('.tab-button');
    this.tabContents = $$('.tab-content');
    this.init();
  }

  init() {
    this.bindEvents();
    // Автоматически активируем первую вкладку
    const firstTab = this.tabButtons[0];
    if (firstTab) this.activateTab(firstTab.dataset.tab);
  }

  bindEvents() {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => this.activateTab(button.dataset.tab));
    });
  }

  activateTab(tabName) {
    // Скрыть все вкладки
    this.tabContents.forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
    });

    // Снять активность с кнопок
    this.tabButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });

    // Показать выбранную вкладку
    const targetContent = $(`#${tabName}`);
    const targetButton = $(`[data-tab="${tabName}"]`);

    if (targetContent && targetButton) {
      targetContent.style.display = 'block';
      requestAnimationFrame(() => targetContent.classList.add('active'));
      targetButton.classList.add('active');
      targetButton.setAttribute('aria-selected', 'true');
      this.activeTab = tabName;

      // Загрузить контент
      this.loadTabContent(tabName, targetContent);
    }
  }

  loadTabContent(tabName, container) {
    const contentArea = $('.content-area', container);
    if (!contentArea || contentArea.dataset.rendered) return;

    switch(tabName) {
      case 'tab-main':
        this.renderMainFeed(contentArea);
        break;
      case 'tab-collections':
        this.renderCollections(contentArea);
        break;
      case 'tab-screenshots':
        this.renderScreenshots(contentArea);
        break;
      case 'tab-videos':
        this.renderVideos(contentArea);
        break;
      case 'tab-history':
        this.renderHistory(contentArea);
        break;
      case 'tab-about':
        this.renderAbout(contentArea);
        break;
    }
    
    contentArea.dataset.rendered = 'true';
  }

  renderMainFeed(container) {
    container.innerHTML = '';
    GALLERY_DATA.main.forEach(item => {
      const block = createElement('article', ['feed-block', 'liquid-glass']);
      block.innerHTML = `
        <div class="block-header">
          <h3 class="cyber-title">${item.title}</h3>
          <p class="block-description">${item.description}</p>
          <time class="project-date" datetime="${item.date}">${new Date(item.date).toLocaleDateString('ru-RU')}</time>
        </div>
        <div class="media-grid">
          <div class="main-media">
            <img src="${item.mainImage}" alt="${item.title}" data-action="open-modal" data-type="main" data-id="${item.id}">
          </div>
          <div class="screenshots-grid">
            ${item.screenshots.map((ss, i) => `
              <img src="${ss}" alt="Скриншот ${i+1}" data-action="open-modal" data-type="screenshot" data-group="main-${item.id}" data-index="${i}">
            `).join('')}
          </div>
          <div class="video-container" data-action="open-modal" data-type="video" data-group="main-${item.id}" data-index="0">
            <video muted loop poster="https://picsum.photos/800/450?random=video-${item.id}">
              <source src="${item.video}" type="video/mp4">
            </video>
            <div class="video-controls">
              <button class="play-btn" aria-label="Воспроизвести видео">▶</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(block);
    });
    
    this.attachVideoHandlers();
  }

  renderCollections(container) {
    container.innerHTML = '';
    GALLERY_DATA.collections.forEach(collection => {
      const block = createElement('article', ['collection-block', 'liquid-glass']);
      block.innerHTML = `
        <h3 class="collection-title">${collection.name}</h3>
        <p class="collection-description">${collection.description}</p>
        <div class="carousel" data-carousel-id="${collection.id}">
          <div class="carousel-track">
            ${collection.images.map((img, index) => `
              <div class="carousel-slide">
                <img src="${img}" alt="${collection.name} - работа ${index + 1}" 
                     data-action="open-modal" data-type="collection" data-collection-id="${collection.id}" data-image-index="${index}">
              </div>
            `).join('')}
          </div>
          <button class="carousel-btn prev" aria-label="Предыдущее изображение">‹</button>
          <button class="carousel-btn next" aria-label="Следующее изображение">›</button>
        </div>
      `;
      container.appendChild(block);
    });
    
    this.initCarousels();
  }

  renderScreenshots(container) {
    container.innerHTML = '';
    GALLERY_DATA.screenshots.forEach(group => {
      const block = createElement('article', ['screenshot-group', 'liquid-glass']);
      block.innerHTML = `
        <h3 class="group-title">${group.title}</h3>
        <p class="group-description">${group.description}</p>
        <div class="screenshot-grid">
          ${group.images.map((img, i) => `
            <img src="${img}" alt="Скриншот ${i+1}" data-action="open-modal" data-type="screenshot" data-group="${group.id}" data-index="${i}">
          `).join('')}
        </div>
      `;
      container.appendChild(block);
    });
  }

  renderVideos(container) {
    container.innerHTML = '';
    GALLERY_DATA.videos.forEach(group => {
      const block = createElement('article', ['video-group', 'liquid-glass']);
      block.innerHTML = `
        <h3 class="group-title">${group.title}</h3>
        <p class="group-description">${group.description}</p>
        <div class="video-grid">
          ${group.videos.map((vid, i) => `
            <div class="video-item" data-action="open-modal" data-type="video" data-group="${group.id}" data-index="${i}">
              <img src="${vid.thumb}" alt="Видео ${i+1}">
              <div class="video-overlay">▶</div>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(block);
    });
  }

  renderHistory(container) {
    container.innerHTML = '';
    GALLERY_DATA.history.forEach(item => {
      const block = createElement('article', ['history-block', 'liquid-glass']);
      block.innerHTML = `
        <div class="history-media">
          <img src="${item.mainImage}" alt="${item.title}" class="history-main-image" 
               data-action="open-modal" data-type="history-image" data-id="${item.id}">
          <video muted class="history-vertical-video" data-action="open-modal" data-type="history-video" data-id="${item.id}">
            <source src="${item.verticalVideo}" type="video/mp4">
          </video>
        </div>
        <div class="history-content">
          <h3 class="history-title">${item.title}</h3>
          <div class="history-description">
            <p>${item.description}</p>
          </div>
          <div class="history-meta">
            <time class="date" datetime="${item.date}">${new Date(item.date).toLocaleDateString('ru-RU')}</time>
            <button class="read-more" data-action="expand-history" data-text="${item.description}">Развернуть</button>
          </div>
        </div>
      `;
      container.appendChild(block);
    });
  }

  renderAbout(container) {
    if (container.dataset.rendered) return;
    
    const aboutData = {
      photo: "https://picsum.photos/400/400?random=author",
      nickname: "@Creative_Mind",
      bio: "Цифровой художник и медиа-дизайнер с 5-летним опытом создания визуального контента. Специализируюсь на экспериментальных техниках и нестандартных подходах к визуальной коммуникации.",
      stats: {
        "Проектов": "47",
        "Работ": "320+",
        "Опыт": "5 лет",
        "Локация": "Digital Space"
      },
      socials: {
        "Instagram": "#",
        "Behance": "#",
        "Dribbble": "#",
        "Twitter": "#",
        "YouTube": "#",
        "Telegram": "#"
      }
    };
    
    container.innerHTML = `
      <div class="about-container liquid-glass">
        <div class="about-photo-container">
          <img src="${aboutData.photo}" alt="Фотография автора" class="author-photo">
        </div>
        <div class="author-details">
          <h2 class="author-nickname">${aboutData.nickname}</h2>
          <div class="author-bio">
            <h3>О себе</h3>
            <p>${aboutData.bio}</p>
          </div>
          <div class="author-stats">
            <h3>Данные</h3>
            <ul>
              ${Object.entries(aboutData.stats).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}
            </ul>
          </div>
          <div class="author-links">
            <h3>Соцсети</h3>
            <ul>
              ${Object.entries(aboutData.socials).map(([name, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${name}</a></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
    
    container.dataset.rendered = 'true';
  }

  attachVideoHandlers() {
    $$('.video-container video').forEach(video => {
      const playBtn = video.parentElement.querySelector('.play-btn');
      if (!playBtn) return;
      
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
          video.play().then(() => {
            playBtn.style.opacity = '0';
          }).catch(() => {
            // Браузер заблокировал автовоспроизведение
            playBtn.style.opacity = '1';
          });
        } else {
          video.pause();
          playBtn.style.opacity = '1';
        }
      });
    });
  }

  initCarousels() {
    $$('.carousel').forEach(carousel => {
      const track = $('.carousel-track', carousel);
      const slides = $$('.carousel-slide', carousel);
      const prevBtn = $('.carousel-btn.prev', carousel);
      const nextBtn = $('.carousel-btn.next', carousel);
      
      if (!track || slides.length === 0) return;
      
      let currentIndex = 0;
      
      const updateCarousel = () => {
        const slideWidth = slides[0].offsetWidth + 20; // gap учтён
        track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
      };
      
      prevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = Math.max(0, currentIndex - 1);
        updateCarousel();
      });
      
      nextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = Math.min(slides.length - 1, currentIndex + 1);
        updateCarousel();
      });
      
      // Инициализация
      updateCarousel();
    });
  }
}

// ==================== МЕНЕДЖЕР МОДАЛЬНЫХ ОКОН ====================
class ModalManager {
  constructor() {
    this.overlay = $('#modal-overlay');
    this.content = $('.modal-content', this.overlay);
    this.title = $('#modal-title', this.overlay);
    this.body = $('.modal-body', this.content);
    this.closeBtn = $('.modal-close', this.overlay);
    this.isOpen = false;
    this.currentCarousel = null;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Закрытие
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    
    // Клавиатура
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft' && this.currentCarousel) this.navigatePrev();
      if (e.key === 'ArrowRight' && this.currentCarousel) this.navigateNext();
    });

    // Обработчик открытия (делегирование)
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-action="open-modal"]');
      if (!trigger) return;
      
      const { type, id, collectionId, group, index, imageIndex } = trigger.dataset;
      
      switch(type) {
        case 'main':
          this.openMainModal(id);
          break;
        case 'collection':
          this.openCollectionModal(collectionId, parseInt(imageIndex));
          break;
        case 'screenshot':
        case 'video':
          this.openGroupModal(type, group, parseInt(index));
          break;
        case 'history-image':
          this.openHistoryImageModal(id);
          break;
        case 'history-video':
          this.openHistoryVideoModal(id);
          break;
      }
    });
  }

  openMainModal(itemId) {
    const item = GALLERY_DATA.main.find(i => String(i.id) === itemId);
    if (!item) return;

    this.currentCarousel = {
      items: item.screenshots.map(src => ({ type: 'image', src, title: `${item.title} - Скриншот` })),
      currentIndex: 0,
      groupId: `main-${item.id}`
    };

    this.render({
      title: item.title,
      content: `
        <div class="modal-media-grid">
          <img src="${item.mainImage}" alt="${item.title}" class="modal-main-image">
          <div class="modal-screenshots">
            ${item.screenshots.map((ss, i) => `
              <img src="${ss}" alt="Скриншот ${i+1}" data-action="open-modal" data-type="screenshot" data-group="main-${item.id}" data-index="${i}">
            `).join('')}
          </div>
          <video controls class="modal-video">
            <source src="${item.video}" type="video/mp4">
          </video>
          <div class="modal-description">${item.description}</div>
        </div>
      `
    });
  }

  openCollectionModal(collectionId, imageIndex) {
    const collection = GALLERY_DATA.collections.find(c => c.id === collectionId);
    if (!collection) return;

    this.currentCarousel = {
      items: collection.images.map(src => ({ type: 'image', src, title: collection.name })),
      currentIndex: imageIndex,
      groupId: collectionId
    };

    this.render({
      title: collection.name,
      content: this.renderCarouselContent()
    });
  }

  openGroupModal(type, groupId, itemIndex) {
    const group = GALLERY_DATA[type === 'screenshot' ? 'screenshots' : 'videos']
      .find(g => g.id === groupId);
    if (!group) return;

    this.currentCarousel = {
      items: type === 'screenshot' 
        ? group.images.map(src => ({ type: 'image', src }))
        : group.videos.map(v => ({ type: 'video', src: v.url, thumb: v.thumb })),
      currentIndex: itemIndex,
      groupId: groupId
    };

    this.render({
      title: group.title,
      content: `
        ${this.renderCarouselContent()}
        <div class="modal-description">${group.description}</div>
        ${type === 'screenshot' ? '<button class="download-btn" data-action="download-current">Скачать</button>' : ''}
      `
    });
  }

  openHistoryImageModal(itemId) {
    const item = GALLERY_DATA.history.find(i => i.id === itemId);
    if (!item) return;

    this.render({
      title: item.title,
      content: `<img src="${item.mainImage}" alt="${item.title}" class="modal-main-image">`
    });
  }

  openHistoryVideoModal(itemId) {
    const item = GALLERY_DATA.history.find(i => i.id === itemId);
    if (!item) return;

    this.render({
      title: item.title,
      content: `<video controls class="modal-video"><source src="${item.verticalVideo}" type="video/mp4"></video>`
    });
  }

  renderCarouselContent() {
    const item = this.currentCarousel.items[this.currentCarousel.currentIndex];
    return `
      <div class="modal-carousel">
        ${item.type === 'image' 
          ? `<img src="${item.src}" alt="${item.title}" class="modal-main-image">`
          : `<video controls class="modal-video"><source src="${item.src}" type="video/mp4"></video>`
        }
        <div class="carousel-controls">
          <button class="carousel-nav prev" data-action="modal-prev">‹</button>
          <span class="carousel-counter">${this.currentCarousel.currentIndex + 1} / ${this.currentCarousel.items.length}</span>
          <button class="carousel-nav next" data-action="modal-next">›</button>
        </div>
      </div>
    `;
  }

  render(data) {
    this.title.textContent = data.title;
    this.body.innerHTML = data.content;
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
  }

  close() {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
    this.isOpen = false;
    this.currentCarousel = null;
    
    // Остановить видео
    $$('video', this.body).forEach(v => v.pause());
  }

  navigatePrev() {
    if (!this.currentCarousel?.items.length) return;
    this.currentCarousel.currentIndex = 
      (this.currentCarousel.currentIndex - 1 + this.currentCarousel.items.length) % this.currentCarousel.items.length;
    this.updateCarousel();
  }

  navigateNext() {
    if (!this.currentCarousel?.items.length) return;
    this.currentCarousel.currentIndex = 
      (this.currentCarousel.currentIndex + 1) % this.currentCarousel.items.length;
    this.updateCarousel();
  }

  updateCarousel() {
    const carousel = $('.modal-carousel', this.body);
    if (!carousel || !this.currentCarousel) return;
    
    carousel.outerHTML = this.renderCarouselContent();
  }
}

// ==================== МЕНЕДЖЕР ЗАГРУЗОК ====================
class DownloadManager {
  constructor(modalManager) {
    this.modalManager = modalManager;
    this.init();
  }

  init() {
    document.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'download-current') {
        this.downloadCurrentItem();
      }
    });
  }

  downloadCurrentItem() {
    const carousel = this.modalManager.currentCarousel;
    if (!carousel) return;
    
    const item = carousel.items[carousel.currentIndex];
    if (!item || item.type !== 'image') return;

    const link = createElement('a', [], {
      href: item.src,
      download: `gallery-item-${Date.now()}.jpg`,
      target: '_blank'
    });
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    // Anti-Design эффект
    this.showGlitchMessage('Загрузка началась...');
  }

  showGlitchMessage(text) {
    const glitch = createElement('div', ['glitch-message'], { textContent: text });
    document.body.appendChild(glitch);
    setTimeout(() => glitch.remove(), 1500);
  }
}

// ==================== ЭФФЕКТЫ И АНИМАЦИИ ====================
class EffectsManager {
  constructor() {
    this.init();
  }

  init() {
    this.addScrollEffects();
    this.addHoverEffects();
    this.addGlitchEffect();
  }

  addScrollEffects() {
    const updateScrollEffects = () => {
      const blocks = $$('.liquid-glass');
      blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
        
        if (isVisible && !block.classList.contains('loaded')) {
          block.classList.add('loaded');
          block.style.opacity = '1';
          block.style.transform = 'translateY(0)';
        }
      });
    };
    
    // Инициализация
    updateScrollEffects();
    window.addEventListener('scroll', updateScrollEffects, { passive: true });
  }

  addHoverEffects() {
    document.addEventListener('mouseenter', (e) => {
      const el = e.target.closest('.liquid-glass');
      if (el) {
        el.style.transform = 'translateY(-5px) scale(1.02)';
        el.style.boxShadow = '0 0 30px rgba(0, 229, 255, 0.3)';
      }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
      const el = e.target.closest('.liquid-glass');
      if (el) {
        el.style.transform = '';
        el.style.boxShadow = '';
      }
    }, true);
  }

  addGlitchEffect() {
    // Случайные глюки для заголовков
    setInterval(() => {
      const elements = $$('.cyber-title, .site-title');
      if (!elements.length) return;
      
      const el = elements[Math.floor(Math.random() * elements.length)];
      this.triggerGlitch(el);
    }, 5000);
  }

  triggerGlitch(element) {
    element.classList.add('glitch');
    setTimeout(() => element.classList.remove('glitch'), 300);
  }
}

// ==================== ОБРАБОТЧИКИ ДРУГИХ ЭЛЕМЕНТОВ ====================
function initCustomHandlers(modalManager) {
  // Развернуть историю
  document.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'expand-history') {
      const block = e.target.closest('.history-block');
      const desc = $('.history-description', block);
      if (desc) {
        desc.style.maxHeight = desc.scrollHeight + 'px';
        e.target.style.display = 'none';
      }
    }
    
    // Навигация в модалке
    if (e.target.dataset.action === 'modal-prev') {
      modalManager.navigatePrev();
    }
    if (e.target.dataset.action === 'modal-next') {
      modalManager.navigateNext();
    }
  });
}

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
  // Создаем экземпляры классов
  const tabManager = new TabManager();
  const modalManager = new ModalManager();
  const downloadManager = new DownloadManager(modalManager);
  const effectsManager = new EffectsManager();
  
  // Инициализируем кастомные обработчики
  initCustomHandlers(modalManager);
  
  console.log('Галерея инициализирована. Anti-Design активен. Все системы работают.');
});
