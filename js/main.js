document.addEventListener("DOMContentLoaded", () => {
  /* =======================
     ДАННЫЕ: Примеры
     ======================= */
  const data = {
    main: [
      {
        title: "Проект ‘Глитч-Реальность’",
        image: "https://glichorahost.pages.dev/Shylily.png",
        screenshots: [
          "https://glichorahost.pages.dev/Shylily.png",
          "https://glichorahost.pages.dev/Akai.png",
          "https://glichorahost.pages.dev/Shylily.png",
        ],
        video: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        desc: "Исследование цифровых искажений и аналоговых шумов как художественного эффекта.",
      },
    ],
    collections: [
      {
        name: "VHS-Глитчи",
        desc: "Серия из 10 аналоговых искажений, оцифрованных вручную.",
        items: Array.from({ length: 8 }, (_, i) => ({
          src: `https://glichorahost.pages.dev/Shylily.png`,
          title: `VHS #0${i + 1}`,
          desc: "Глитч-артефакт на магнитной плёнке.",
        })),
      },
      {
        name: "Matrix Fracture",
        desc: "Кадры, где реальность ломается.",
        items: Array.from({ length: 6 }, (_, i) => ({
          src: `https://glichorahost.pages.dev/Akai.png`,
          title: `Rupture #0${i + 1}`,
          desc: "Разрыв сигнала.",
        })),
      },
    ],
    screenshots: [
      {
        title: "Серия «Neon Contrast»",
        desc: "Игры с контрастом и отражением света.",
        items: [
          "https://glichorahost.pages.dev/Shylily.png",
          "https://glichorahost.pages.dev/Akai.png",
          "https://glichorahost.pages.dev/Shylily.png",
        ],
      },
    ],
    videos: [
      {
        title: "Glitch Motion",
        desc: "Короткий визуальный эксперимент с цифровыми шумами.",
        items: [
          "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
          "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
        ],
      },
    ],
    history: [
      {
        title: "Истоки цифрового шума",
        image: "https://glichorahost.pages.dev/Shylily.png",
        video: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
        desc: "Работа началась как исследование визуальных сбоев и видеошумов в VHS-потоках.",
      },
    ],
    about: {
      avatar: "https://glichorahost.pages.dev/Shylily.png",
      name: "penik",
      desc: "Медиа-художник, исследующий форму, шум, глитч и анти-дизайн.",
      socials: {
        Instagram: "#",
        YouTube: "#",
        GitHub: "#",
      },
    },
  };

  /* =======================
     УТИЛИТЫ
     ======================= */
  function createEl(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  }

  let mediaObserver;
  function initMediaObserver() {
    if (mediaObserver) return;
    const opts = { root: null, rootMargin: "100px", threshold: 0.01 };
    mediaObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const t = entry.target;
          const bg = t.getAttribute("data-bg");
          if (bg) {
            t.style.backgroundImage = `url(${bg})`;
            t.classList.remove("lazy-bg");
            t.removeAttribute("data-bg");
            obs.unobserve(t);
          }
        }
      });
    }, opts);
  }

  /* =======================
     ГЛАВНАЯ (лента)
     ======================= */
  const mainPage = document.getElementById("page-main");
  data.main.forEach((post) => {
    const block = createEl("div", "feed-item");

    const left = createEl("div");
    const mainImg = createEl("div", "main-thumb lazy-bg");
    mainImg.setAttribute("data-bg", post.image);
    left.append(mainImg);

    const right = createEl("div");
    right.innerHTML = `<h3>${post.title}</h3><p>${post.desc}</p>`;

    const thumbs = createEl("div", "small-grid");
    post.screenshots.forEach((s) => {
      const img = createEl("img");
      img.src = s;
      thumbs.append(img);
      img.addEventListener("click", () => openModalImage(s, post.title, post.desc));
    });
    right.append(thumbs);

    const vid = document.createElement("video");
    vid.src = post.video;
    vid.controls = true;
    vid.style.width = "100%";
    right.append(vid);

    block.append(left, right);
    mainPage.append(block);

    initMediaObserver();
    mediaObserver.observe(mainImg);
  });

  /* =======================
     КОЛЛЕКЦИИ
     ======================= */
  const colPage = document.getElementById("page-collections");
  data.collections.forEach((col, idx) => {
    const block = createEl("div", "collection-block");
    block.innerHTML = `<h3 class="collection-title">${col.name}</h3>
                       <p class="collection-desc">${col.desc}</p>`;
    const carousel = createEl("div", "glitch-carousel", `
        <div class="wrapper">
          <div class="inner" id="carousel-${idx}"></div>
        </div>`);
    block.append(carousel);
    colPage.append(block);
    initCarousel(`carousel-${idx}`, col.items);
  });

  function initCarousel(id, items) {
    const container = document.getElementById(id);
    if (!container) return;
    const inner = container;
    inner.style.setProperty("--quantity", items.length);
    inner.innerHTML = "";
    initMediaObserver();

    items.forEach((item, i) => {
      const card = createEl("div", "card");
      card.style.setProperty("--index", i);
      const img = createEl("div", "img lazy-bg");
      img.setAttribute("data-bg", item.src);
      card.append(img);
      card.addEventListener("click", () => openModalImage(item.src, item.title, item.desc));
      inner.append(card);
      mediaObserver.observe(img);
    });
  }

  /* =======================
     СКРИНШОТЫ / ВИДЕО
     ======================= */
  function fillMediaList(pageId, arr, type = "img") {
    const page = document.getElementById(pageId);
    arr.forEach((block, i) => {
      const b = createEl("div", "simple-block");
      b.innerHTML = `<div><h3>${block.title}</h3><p>${block.desc}</p></div>`;
      const list = createEl("div", "small-grid");
      block.items.forEach((src, j) => {
        const el = createEl(type === "img" ? "img" : "video");
        el.src = src;
        if (type === "img") el.classList.add("lazy-bg");
        if (type === "video") el.controls = true;
        list.append(el);
        el.addEventListener("click", () => openModalSeries(block.items, j, block.title, block.desc, type));
      });
      b.append(list);
      page.append(b);
    });
  }

  fillMediaList("page-screenshots", data.screenshots, "img");
  fillMediaList("page-videos", data.videos, "video");

  /* =======================
     ИСТОРИЯ
     ======================= */
  const histPage = document.getElementById("page-history");
  data.history.forEach((h) => {
    const block = createEl("div", "history-item");
    const img = createEl("img", "main");
    img.src = h.image;
    const vid = createEl("video", "vert");
    vid.src = h.video;
    vid.controls = true;
    const desc = createEl("div");
    desc.innerHTML = `<h3>${h.title}</h3><p>${h.desc}</p>`;
    block.append(img, vid, desc);
    histPage.append(block);
  });

  /* =======================
     ОБ АВТОРЕ
     ======================= */
  const about = document.getElementById("page-about");
  about.innerHTML = `
    <div class="about-content">
      <img class="avatar" src="${data.about.avatar}" alt="${data.about.name}">
      <div class="bio">
        <h2>${data.about.name}</h2>
        <p>${data.about.desc}</p>
        <div class="social-links">
          ${Object.entries(data.about.socials)
            .map(([n, l]) => `<a href="${l}" target="_blank">${n}</a>`)
            .join("")}
        </div>
      </div>
    </div>`;

  /* =======================
     МОДАЛКИ
     ======================= */
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modal-image");
  const modalTitle = document.getElementById("modal-title");
  const modalDesc = document.getElementById("modal-description");

  function openModalImage(src, title, desc) {
    modalImage.src = src;
    modalTitle.textContent = title;
    modalDesc.textContent = desc || "";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  let currentSet = [];
  let currentIndex = 0;
  let currentType = "img";

  function openModalSeries(set, index, title, desc, type) {
    currentSet = set;
    currentIndex = index;
    currentType = type;
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    showModalMedia();
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function showModalMedia() {
    const src = currentSet[currentIndex];
    const container = document.querySelector(".modal-media");
    container.innerHTML = "";
    const el = document.createElement(currentType === "video" ? "video" : "img");
    el.src = src;
    if (currentType === "video") el.controls = true;
    container.append(el);
  }

  function closeModal() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  modal.querySelector(".modal-close").addEventListener("click", closeModal);
  modal.querySelector(".close-btn").addEventListener("click", closeModal);

  document.querySelector(".modal-arrow.left").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + currentSet.length) % currentSet.length;
    showModalMedia();
  });

  document.querySelector(".modal-arrow.right").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % currentSet.length;
    showModalMedia();
  });

  /* =======================
     НАВИГАЦИЯ
     ======================= */
  const tabs = document.querySelectorAll(".tab-btn");
  const pages = document.querySelectorAll(".page");

  function showPage(id) {
    tabs.forEach((b) => b.classList.remove("active"));
    pages.forEach((p) => p.classList.remove("active"));
    const btn = document.querySelector(`.tab-btn[data-page="${id}"]`);
    const page = document.getElementById(`page-${id}`);
    if (btn && page) {
      btn.classList.add("active");
      page.classList.add("active");
    }
  }

  tabs.forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.page;
      window.location.hash = id;
      showPage(id);
    })
  );

  showPage(window.location.hash.replace("#", "") || "main");
  window.addEventListener("hashchange", () => {
    showPage(window.location.hash.replace("#", "") || "main");
  });
});
