document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('shader-canvas');
  if (!canvas) {
    console.error('Canvas #shader-canvas не найден!');
    return;
  }

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL2 не поддерживается');
    return;
  }

  console.log('Используется контекст: WebGL2');

  /* =======================
     Твои галереи и UI код
     ======================= */
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

  let mediaObserver;
  function initMediaObserver() {
    if (mediaObserver) return;
    const opts = { root: null, rootMargin: '100px', threshold: 0.01 };
    mediaObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const t = entry.target;
          const bgUrl = t.getAttribute('data-bg');
          if (bgUrl) {
            t.style.backgroundImage = `url(${bgUrl})`;
            t.removeAttribute('data-bg');
            t.classList.remove('lazy-bg');
            observer.unobserve(t);
          }
        }
      });
    }, opts);
  }

  function initCarousel(id, items) {
    const container = document.getElementById(id);
    if (!container || container.hasAttribute('data-loaded')) return;
    initMediaObserver();
    const inner = container.querySelector('.inner');
    inner.style.setProperty('--quantity', items.length);
    inner.innerHTML = '';
    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--index', i);
      const img = document.createElement('div');
      img.className = 'img lazy-bg';
      img.setAttribute('data-bg', item.src);
      card.appendChild(img);
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
      mediaObserver.observe(img);
    });
    container.setAttribute('data-loaded', 'true');
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('show');
    document.body.style.overflow = '';
  }
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('.btn')?.addEventListener('click', closeModal);
  }

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
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pageId = btn.dataset.page;
      window.location.hash = pageId;
      showPage(pageId);
    });
  });
  showPage(window.location.hash.replace('#', '') || 'home');
  window.addEventListener('hashchange', () => {
    showPage(window.location.hash.replace('#', '') || 'home');
  });

  /* =======================
     WebGL2: Оригинальный "Accretion" by XorDev
     ======================= */

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  const vertexSrc = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;
  uniform int iFrame;
  uniform vec4 iMouse;

  void mainImage(out vec4 O, vec2 I)
  {
      float z = 0.0;
      float d = 0.0;
      O = vec4(0.0);

      for (float i = 0.0; i < 20.0; i++)
      {
          vec3 p = z * normalize(vec3(I + I, 0.0) - iResolution.xyx) + 0.1;
          p = vec3(
              atan(p.y / 0.2, p.x) * 2.0,
              p.z / 3.0,
              length(p.xy) - 5.0 - z * 0.2
          );

          for (float j = 1.0; j <= 7.0; j++)
              p += sin(p.yzx * j + iTime + 0.3 * i) / j;

          z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));

          O += (1.0 + cos(p.x + i * 0.4 + z + vec4(6.0, 1.0, 2.0, 0.0))) / d;
      }

      O = tanh(O * O / 400.0);
  }

  void main() {
      vec4 color = vec4(0.0);
      mainImage(color, gl_FragCoord.xy);
      fragColor = color;
  }`;

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
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');
  const iFrameLoc = gl.getUniformLocation(program, 'iFrame');
  const iMouseLoc = gl.getUniformLocation(program, 'iMouse');

  let start = performance.now();
  let frame = 0;
  const mouse = [0, 0, 0, 0];

  // интерактивность мыши
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse[0] = e.clientX - rect.left;
    mouse[1] = rect.height - (e.clientY - rect.top);
  });
  canvas.addEventListener('mousedown', e => {
    mouse[2] = mouse[0];
    mouse[3] = mouse[1];
  });

  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);
    gl.uniform1i(iFrameLoc, frame++);
    gl.uniform4f(iMouseLoc, mouse[0], mouse[1], mouse[2], mouse[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

});
