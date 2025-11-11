// main.js - JavaScript для личной медиа-галереи
// Стили: Liquid Glass + Anti-Design

// ==================== ДАННЫЕ ДЛЯ ПРИМЕРА ====================
// В реальном проекте данные могут загружаться из JSON/API
const galleryData = {
  main: [
    {
      id: 1,
      title: "Проект 'Киберпанк 2077'",
      description: "Исследование будущего через призму киберпанка",
      mainImage: "https://picsum.photos/600/400?random=1",
      screenshots: [
        "https://picsum.photos/200/150?random=11",
        "https://picsum.photos/200/150?random=12",
        "https://picsum.photos/200/150?random=13"
      ],
      video: "https://www.w3schools.com/html/mov_bbb.mp4",
      alt: "Киберпанк проект"
    },
    {
      id: 2,
      title: "Абстрактные визуализации",
      description: "Эксперименты с формами и цветом",
      mainImage: "https://picsum.photos/600/400?random=2",
      screenshots: [
        "https://picsum.photos/200/150?random=21",
        "https://picsum.photos/200/150?random=22",
        "https://picsum.photos/200/150?random=23"
      ],
      video: "https://www.w3schools.com/html/mov_bbb.mp4",
      alt: "Абстрактная работа"
    }
  ],
  collections: [
    {
      id: "col-1",
      name: "Серия 'Неоновые сны'",
      images: Array.from({length: 8}, (_, i) => `https://picsum.photos/300/200?random=col1-${i}`)
    },
    {
      id: "col-2",
      name: "Фрактальные структуры",
      images: Array.from({length: 5}, (_, i) => `https://picsum.photos/300/200?random=col2-${i}`)
    }
  ],
  screenshots: [
    {
      id: "ss-1",
      title: "Процесс работы",
      description: "Различные этапы создания проектов",
      images: Array.from({length: 6}, (_, i) => `https://picsum.photos/300/200?random=ss1-${i}`)
    },
    {
      id: "ss-2",
      title: "UI/UX Прототипы",
      description: "Эскизы интерфейсов",
      images: Array.from({length: 4}, (_, i) => `https://picsum.photos/300/200?random=ss2-${i}`)
    }
  ],
  videos: [
    {
      id: "vid-1",
      title: "Таймлапсы",
      description: "Ускоренные записи процесса",
      videos: [
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://picsum.photos/300/200?random=vid1-1" },
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://picsum.photos/300/200?random=vid1-2" },
        { url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://picsum.photos/300/200?random=vid1-3" }
      ]
    }
  ],
  history: [
    {
      id: "h-1",
      title: "Проект 'Квантовый скачок'",
      description: "Это был долгий путь от идеи до реализации. Началось все с простого эскиза на бумаге в 3 часа ночи...",
      mainImage: "https://picsum.photos/300/400?random=hist1",
      verticalVideo: "https://www.w3schools.com/html/mov_bbb.mp4"
    },
    {
      id: "h-2",
      title: "Эволюция стиля",
      description: "Как я пришел к Anti-Design через боль и разочарование в современных трендах...",
      mainImage: "https://picsum.photos/300/400?random=hist2",
      verticalVideo: "https://www.w3schools.com/html/mov_bbb.mp4"
    }
  ]
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentModal = null;
let currentCarousel = {
  items: [],
  currentIndex: 0,
  groupId: null
};

// ==================== УТИЛИТЫ ====================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Создание элемента с классами
const createElement = (tag, classes = [], attrs = {}) => {
  const el = document.createElement(tag);
  if (classes.length) el.classList.add(...classes);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
};

// Генерация ID
const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ==================== СИСТЕМА ВКЛАДОК ====================
const TabManager = {
  tabs: [],
  activeTab: null,

  init() {
    this.cacheDOM();
    this.bindEvents();
    // Активировать первую вкладку
    const firstTab = $('.tab-button');
    if (firstTab) this.activateTab(firstTab.dataset.tab);
  },

  cacheDOM() {
    this.tabButtons = $$('.tab-button');
    this.tabContents = $$('.tab-content');
  },

  bindEvents() {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.activateTab(button.dataset.tab);
        // Добавить эффект жидкого стекла
        this.addLiquidEffect(button);
      });
    });
  },

  activateTab(tabName) {
    // Скрыть все вкладки
    this.tabContents.forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
    });
    
    // Снять активность с кнопок
    this.tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Показать выбранную вкладку
    const targetContent = $(`#${tabName}`);
    const targetButton = $(`[data-tab="${tabName}"]`);
    
    if (targetContent && targetButton) {
      targetContent.style.display = 'block';
      setTimeout(() => targetContent.classList.add('active'), 10);
      targetButton.classList.add('active');
      this.activeTab = tabName;
      
      // Загрузить контент для вкладки
      this.loadTabContent(tabName);
    }
  },

  loadTabContent(tabName) {
    const contentArea = $(`#${tabName} .content-area`);
    if (!contentArea) return;

    switch(tabName) {
      case 'main':
        this.renderMainFeed(contentArea);
        break;
      case 'collections':
        this.renderCollections(contentArea);
        break;
      case 'screenshots':
        this.renderScreenshots(contentArea);
        break;
      case 'videos':
        this.renderVideos(contentArea);
        break;
      case 'history':
        this.renderHistory(contentArea);
        break;
      case 'about':
        this.renderAbout(contentArea);
        break;
    }
  },

  renderMainFeed(container) {
    container.innerHTML = '';
    galleryData.main.forEach(item => {
      const block = createElement('div', ['feed-block', 'liquid-glass']);
      block.innerHTML = `
        <div class="block-header">
          <h3 class="cyber-title">${item.title}</h3>
          <p class="block-description">${item.description}</p>
        </div>
        <div class="media-grid">
          <div class="main-media">
            <img src="${item.mainImage}" alt="${item.alt}" data-action="open-modal" data-type="main" data-id="${item.id}">
          </div>
          <div class="screenshots-grid">
            ${item.screenshots.map((ss, i) => `
              <img src="${ss}" alt="Скриншот ${i+1}" data-action="open-modal" data-type="main" data-id="${item.id}" data-ss="${i}">
            `).join('')}
          </div>
          <div class="video-container">
            <video muted loop data-action="open-modal" data-type="main" data-id="${item.id}" data-video="true">
              <source src="${item.video}" type="video/mp4">
            </video>
            <div class="video-controls">
              <button class="play-btn">▶</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(block);
    });
    
    // Добавить обработчики для видео
    this.attachVideoHandlers();
  },

  renderCollections(container) {
    container.innerHTML = '';
    galleryData.collections.forEach(collection => {
      const block = createElement('div', ['collection-block', 'liquid-glass']);
      const titleEl = createElement('h3', ['collection-title']);
      titleEl.textContent = collection.name;
      block.appendChild(titleEl);
      
      const carousel = createElement('div', ['carousel']);
      const track = createElement('div', ['carousel-track']);
      
      collection.images.forEach((img, index) => {
        const slide = createElement('div', ['carousel-slide']);
        const imgEl = createElement('img', [], {
          src: img,
          'data-action': 'open-modal',
          'data-type': 'collection',
          'data-collection-id': collection.id,
          'data-image-index': index
        });
        slide.appendChild(imgEl);
        track.appendChild(slide);
      });
      
      carousel.appendChild(track);
      
      // Добавить кнопки навигации
      const prevBtn = createElement('button', ['carousel-btn', 'prev'], { 'data-action': 'carousel-prev' });
      const nextBtn = createElement('button', ['carousel-btn', 'next'], { 'data-action': 'carousel-next' });
      prevBtn.innerHTML = '‹';
      nextBtn.innerHTML = '›';
      carousel.appendChild(prevBtn);
      carousel.appendChild(nextBtn);
      
      block.appendChild(carousel);
      container.appendChild(block);
    });
    
    // Инициализировать карусели
    this.initCarousels();
  },

  renderScreenshots(container) {
    container.innerHTML = '';
    galleryData.screenshots.forEach(group => {
      const block = createElement('div', ['screenshot-group', 'liquid-glass']);
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
  },

  renderVideos(container) {
    container.innerHTML = '';
    galleryData.videos.forEach(group => {
      const block = createElement('div', ['video-group', 'liquid-glass']);
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
  },

  renderHistory(container) {
    container.innerHTML = '';
    galleryData.history.forEach(item => {
      const block = createElement('div', ['history-block', 'liquid-glass']);
      block.innerHTML = `
        <div class="history-media">
          <img src="${item.mainImage}" alt="${item.title}" class="history-main-img" data-action="open-modal" data-type="history-image" data-id="${item.id}">
          <video muted class="history-video" data-action="open-modal" data-type="history-video" data-id="${item.id}">
            <source src="${item.verticalVideo}" type="video/mp4">
          </video>
        </div>
        <div class="history-content">
          <h3 class="history-title">${item.title}</h3>
          <div class="history-description">${item.description}</div>
          <div class="history-meta">
            <span class="date">${new Date().toLocaleDateString()}</span>
            <button class="read-more" data-action="expand-history" data-id="${item.id}">Развернуть</button>
          </div>
        </div>
      `;
      container.appendChild(block);
    });
  },

  renderAbout(container) {
    // Если контент уже есть в HTML, не перерисовываем
    if (container.dataset.rendered) return;
    
    // Пример динамического контента
    const aboutData = {
      photo: "https://picsum.photos/200/200?random=author",
      name: "@Ваш Никнейм",
      bio: "Медиа-художник, исследующий цифровые границы реальности. 10+ лет в созидании визуальных концепций.",
      stats: {
        "Проектов": "150+",
        "Год опыта": "10+",
        "Стран": "25",
        "Наград": "12"
      },
      socials: {
        "Instagram": "#",
        "Behance": "#",
        "Twitter": "#",
        "Telegram": "#"
      }
    };
    
    container.innerHTML = `
      <div class="about-container liquid-glass">
        <div class="about-photo">
          <img src="${aboutData.photo}" alt="Автор">
          <div class="photo-glow"></div>
        </div>
        <div class="about-info">
          <h2 class="author-name">${aboutData.name}</h2>
          <p class="author-bio">${aboutData.bio}</p>
          <div class="stats-grid">
            ${Object.entries(aboutData.stats).map(([k, v]) => `
              <div class="stat-item">
                <span class="stat-value">${v}</span>
                <span class="stat-key">${k}</span>
              </div>
            `).join('')}
          </div>
          <div class="social-links">
            ${Object.entries(aboutData.socials).map(([name, url]) => `
              <a href="${url}" class="social-link" target="_blank">${name}</a>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    container.dataset.rendered = true;
  },

  attachVideoHandlers() {
    $$('video').forEach(video => {
      const playBtn = video.parentElement.querySelector('.play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (video.paused) {
            video.play();
            playBtn.style.opacity = '0';
          } else {
            video.pause();
            playBtn.style.opacity = '1';
          }
        });
        
        video.addEventListener('click', (e) => {
          e.stopPropagation();
          video.dataset.action = 'open-modal';
          video.dataset.type = 'main';
          video.click();
        });
      }
    });
  },

  initCarousels() {
    $$('.carousel').forEach(carousel => {
      const track = carousel.querySelector('.carousel-track');
      const slides = carousel.querySelectorAll('.carousel-slide');
      const prevBtn = carousel.querySelector('.carousel-btn.prev');
      const nextBtn = carousel.querySelector('.carousel-btn.next');
      
      let currentIndex = 0;
      
      const updateCarousel = () => {
        track.style.transform = `translateX(-${currentIndex * 320}px)`;
      };
      
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = Math.max(0, currentIndex - 1);
        updateCarousel();
      });
      
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = Math.min(slides.length - 1, currentIndex + 1);
        updateCarousel();
      });
    });
  },

  addLiquidEffect(element) {
    const ripple = createElement('div', ['liquid-ripple']);
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }
};

// ==================== МОДАЛЬНЫЕ ОКНА ====================
const ModalManager = {
  isOpen: false,
  
  init() {
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM() {
    this.modal = $('.modal-overlay');
    this.modalContent = $('.modal-content');
    this.closeBtn = $('.modal-close');
  },

  bindEvents() {
    // Обработка кликов по элементам с data-action="open-modal"
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action="open-modal"]');
      if (target) this.handleOpenModal(target.dataset, e);
    });
    
    // Закрытие модального окна
    this.closeBtn?.addEventListener('click', () => this.close());
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    
    // Обработка навигации в модальном окне
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.navigatePrev();
      if (e.key === 'ArrowRight') this.navigateNext();
    });
  },

  handleOpenModal(data, event) {
    const { type, id, collectionId, group, index, imageIndex, ss, video } = data;
    
    switch(type) {
      case 'main':
        this.openMainModal(id, ss, video);
        break;
      case 'collection':
        this.openCollectionModal(collectionId, imageIndex);
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
  },

  openMainModal(itemId, screenshotIndex = null, isVideo = null) {
    const item = galleryData.main.find(i => i.id == itemId);
    if (!item) return;
    
    const modalData = {
      title: item.title,
      content: `
        <div class="modal-media-grid">
          <div class="modal-main-image">
            <img src="${item.mainImage}" alt="${item.alt}" class="anti-image">
          </div>
          <div class="modal-screenshots">
            ${item.screenshots.map((ss, i) => `
              <img src="${ss}" alt="Скриншот ${i+1}" class="anti-thumbnail">
            `).join('')}
          </div>
          <video controls class="modal-video">
            <source src="${item.video}" type="video/mp4">
          </video>
        </div>
        <div class="modal-description">${item.description}</div>
      `
    };
    
    this.render(modalData);
  },

  openCollectionModal(collectionId, imageIndex) {
    const collection = galleryData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    const images = collection.images;
    const currentIndex = parseInt(imageIndex);
    
    currentCarousel = {
      items: images.map(src => ({ type: 'image', src, title: collection.name })),
      currentIndex: currentIndex,
      groupId: collectionId
    };
    
    const modalData = {
      title: collection.name,
      content: `
        <div class="modal-carousel">
          <img src="${images[currentIndex]}" alt="${collection.name}" class="anti-image">
          ${this.renderCarouselControls()}
        </div>
      `,
      showDownload: true
    };
    
    this.render(modalData);
  },

  openGroupModal(type, groupId, itemIndex) {
    const group = galleryData[type === 'screenshot' ? 'screenshots' : 'videos']
      .find(g => g.id === groupId);
    if (!group) return;
    
    const items = type === 'screenshot' 
      ? group.images.map(src => ({ type: 'image', src }))
      : group.videos.map(v => ({ type: 'video', src: v.url, thumb: v.thumb }));
    
    currentCarousel = {
      items: items,
      currentIndex: itemIndex,
      groupId: groupId
    };
    
    const currentItem = items[itemIndex];
    const content = currentItem.type === 'image'
      ? `<img src="${currentItem.src}" alt="${group.title}" class="anti-image">`
      : `<video controls class="modal-video"><source src="${currentItem.src}" type="video/mp4"></video>`;
    
    const modalData = {
      title: group.title,
      content: `
        <div class="modal-carousel">
          ${content}
          ${this.renderCarouselControls()}
        </div>
        <div class="modal-description">${group.description}</div>
      `,
      showDownload: type === 'screenshot'
    };
    
    this.render(modalData);
  },

  openHistoryImageModal(itemId) {
    const item = galleryData.history.find(i => i.id === itemId);
    if (!item) return;
    
    this.render({
      title: item.title,
      content: `<img src="${item.mainImage}" alt="${item.title}" class="anti-image">`
    });
  },

  openHistoryVideoModal(itemId) {
    const item = galleryData.history.find(i => i.id === itemId);
    if (!item) return;
    
    this.render({
      title: item.title,
      content: `<video controls class="modal-video"><source src="${item.verticalVideo}" type="video/mp4"></video>`
    });
  },

  renderCarouselControls() {
    return `
      <button class="carousel-nav prev" data-action="modal-prev">‹</button>
      <button class="carousel-nav next" data-action="modal-next">›</button>
    `;
  },

  render(data) {
    if (!this.modal) return;
    
    this.modalContent.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${data.title}</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body">${data.content}</div>
      ${data.showDownload ? '<button class="download-btn" data-action="download">Скачать</button>' : ''}
    `;
    
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    
    // Повторно привязать события для новых элементов
    this.cacheDOM();
    this.bindEvents();
  },

  close() {
    if (!this.modal) return;
    
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.isOpen = false;
    
    // Остановить все видео
    this.modalContent.querySelectorAll('video').forEach(v => v.pause());
  },

  navigatePrev() {
    if (!currentCarousel.items.length) return;
    
    currentCarousel.currentIndex = 
      (currentCarousel.currentIndex - 1 + currentCarousel.items.length) % currentCarousel.items.length;
    this.updateModalCarousel();
  },

  navigateNext() {
    if (!currentCarousel.items.length) return;
    
    currentCarousel.currentIndex = 
      (currentCarousel.currentIndex + 1) % currentCarousel.items.length;
    this.updateModalCarousel();
  },

  updateModalCarousel() {
    const item = currentCarousel.items[currentCarousel.currentIndex];
    const container = this.modalContent.querySelector('.modal-carousel');
    if (!container) return;
    
    container.innerHTML = `
      ${item.type === 'image' 
        ? `<img src="${item.src}" alt="${item.title || ''}" class="anti-image">`
        : `<video controls class="modal-video"><source src="${item.src}" type="video/mp4"></video>`
      }
      ${this.renderCarouselControls()}
    `;
    
    this.bindEvents();
  }
};

// ==================== ОБРАБОТЧИКИ СКАЧИВАНИЯ ====================
const DownloadManager = {
  init() {
    document.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'download') {
        this.downloadCurrentItem();
      }
    });
  },

  downloadCurrentItem() {
    const item = currentCarousel.items[currentCarousel.currentIndex];
    if (!item) return;
    
    const link = createElement('a', [], {
      href: item.src,
      download: `gallery-item-${Date.now()}.jpg`
    });
    
    link.click();
    link.remove();
    
    // Anti-Design эффект
    this.showGlitchMessage('Загрузка началась...');
  },

  showGlitchMessage(text) {
    const glitch = createElement('div', ['glitch-message'], { textContent: text });
    document.body.appendChild(glitch);
    setTimeout(() => glitch.remove(), 1500);
  }
};

// ==================== ЭФФЕКТЫ И АНИМАЦИИ ====================
const EffectsManager = {
  init() {
    this.addScrollEffects();
    this.addHoverEffects();
    this.addGlitchEffect();
  },

  addScrollEffects() {
    let ticking = false;
    
    const updateScrollEffects = () => {
      const blocks = $$('.feed-block, .collection-block, .screenshot-group, .video-group, .history-block');
      blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.85;
        
        if (isVisible) {
          block.style.opacity = '1';
          block.style.transform = 'translateY(0)';
        }
      });
      
      ticking = false;
    };
    
    const requestScrollUpdate = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollEffects);
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', requestScrollUpdate);
  },

  addHoverEffects() {
    // Эффект жидкого стекла при наведении
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
  },

  addGlitchEffect() {
    // Anti-Design: случайные глюки
    setInterval(() => {
      const elements = $$('.cyber-title, .modal-title');
      if (!elements.length) return;
      
      const el = elements[Math.floor(Math.random() * elements.length)];
      this.triggerGlitch(el);
    }, 5000);
  },

  triggerGlitch(element) {
    element.classList.add('glitch');
    setTimeout(() => element.classList.remove('glitch'), 300);
  }
};

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
  // Инициализировать все модули
  TabManager.init();
  ModalManager.init();
  DownloadManager.init();
  EffectsManager.init();
  
  // Добавить глобальные обработчики
  document.addEventListener('click', (e) => {
    // Навигация в модальном окне
    if (e.target.dataset.action === 'modal-prev') {
      ModalManager.navigatePrev();
    }
    if (e.target.dataset.action === 'modal-next') {
      ModalManager.navigateNext();
    }
    
    // Эффект Anti-Design при клике
    if (e.target.matches('h1, h2, h3')) {
      EffectsManager.triggerGlitch(e.target);
    }
  });
  
  // Обработка каруселей в коллекциях
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="carousel-prev"], [data-action="carousel-next"]');
    if (!btn) return;
    
    const carousel = btn.parentElement;
    const track = carousel.querySelector('.carousel-track');
    const direction = btn.dataset.action === 'carousel-prev' ? -1 : 1;
    
    // Простая карусель
    const currentTransform = track.style.transform || 'translateX(0)';
    const currentX = parseInt(currentTransform.match(/-?\d+/)?.[0] || 0);
    const newX = Math.max(Math.min(currentX - direction * 320, 0), -320 * (track.children.length - 1));
    
    track.style.transform = `translateX(${newX}px)`;
  });
  
  // Развернуть историю
  document.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'expand-history') {
      const block = e.target.closest('.history-block');
      const desc = block.querySelector('.history-description');
      desc.style.maxHeight = desc.scrollHeight + 'px';
      e.target.style.display = 'none';
    }
  });
  
  console.log('Галерея инициализирована. Anti-Design активен.');
});
