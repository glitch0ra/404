document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('shader-canvas');
  if (!canvas) {
    console.error('Canvas #shader-canvas не найден!');
    return;
  }

  // Попытка WebGL2, затем fallback на WebGL1
  let gl = canvas.getContext('webgl2');
  const isWebGL2 = !!gl;
  if (!gl) {
    console.warn('WebGL2 не поддерживается, fallback на WebGL1');
    gl = canvas.getContext('webgl');
  }
  if (!gl) {
    alert('Ваш браузер не поддерживает WebGL вообще');
    return;
  }

  console.log('Используется контекст:', isWebGL2 ? 'WebGL2' : 'WebGL1');

  /* =======================
     Твои галереи и UI код (без изменений, слегка отформатирован)
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
      { src: "https://zlichorahost.pages.dev/Akai.png", title: "Rupture #07", desc: "Data stream collapse." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #08", desc: "Recursive reality loop." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #09", desc: "Neural net overflow." },
      { src: "https://glichorahost.pages.dev/Akai.png", title: "Rupture #10", desc: "Terminal signal received." }
    ]
  };

  // --- Intersection Observer для ленивой загрузки
  let mediaObserver;
  function initMediaObserver() {
    if (mediaObserver) return;
    const observerOptions = { root: null, rootMargin: '100px', threshold: 0.01 };
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

  function initCarousel(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || container.hasAttribute('data-loaded')) return;
    initMediaObserver();
    const inner = container.querySelector('.inner');
    const quantity = items.length;
    inner.style.setProperty('--quantity', quantity);
    inner.innerHTML = '';
    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--index', index);
      const imgDiv = document.createElement('div');
      imgDiv.className = 'img lazy-bg';
      imgDiv.setAttribute('data-bg', item.src);
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
      if (mediaObserver) mediaObserver.observe(imgDiv);
    });
    container.setAttribute('data-loaded', 'true');
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('show');
    document.body.style.overflow = '';
  }
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const actionBtn = modal.querySelector('.btn');
    if (actionBtn) actionBtn.addEventListener('click', closeModal);
  }

  // Переключение страниц
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

  /* =======================
     Шейдерная часть (WebGL2 / WebGL1 fallback)
     ======================= */

  // Resize canvas -> match display size
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // --- GLSL 300 (WebGL2) sources ---
  const vertexSrcGL3 = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  const fragmentSrcGL3 = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 iResolution;
uniform float iTime;

// blendNeon: локальное одновременное смешение 4 неоновых цветов
vec3 blendNeon(vec3 p, float t) {
    vec3 c1 = vec3(1.0, 0.0, 1.0);   // пурпурный
    vec3 c2 = vec3(0.0, 1.0, 0.6);   // зелёный
    vec3 c3 = vec3(0.0, 1.0, 1.0);   // голубой
    vec3 c4 = vec3(1.0, 0.4, 0.8);   // розовый

    float n1 = sin(p.x * 0.3 + p.y * 0.2 + t * 1.4);
    float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 1.1);
    float n3 = sin(p.z * 0.5 + p.x * 0.4 - t * 1.6);
    float n4 = cos(p.x * 0.2 + p.y * 0.6 + t * 1.8);

    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;

    vec3 neon = normalize(c1 * n1 + c2 * n2 + c3 * n3 + c4 * n4);
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

        p = z * normalize(vec3(I + I, 0.0) - iResolution.xyx) + 0.1;
        p = vec3(
            atan(p.y / 0.2, p.x) * 2.0,
            p.z / 3.0,
            length(p.xy) - 5.0 - z * 0.2
        );

        for (int j = 1; j <= 7; j++) {
            float fj = float(j);
            p += sin(p.yzx * fj + iTime * 0.5 + 0.3 * fi) / fj;
        }

        z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));
        vec3 neon = blendNeon(p, iTime);
        O.rgb += (1.0 + cos(p.x + fi * 0.4 + z)) / d * neon;
    }

    // tanh эквивалент
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

  // --- GLSL 100 (WebGL1) fallback sources ---
  const vertexSrcGL1 = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  // WebGL1-safe fragment shader (matching visual behavior)
  const fragmentSrcGL1 = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;

vec3 blendNeon(vec3 p, float t) {
    vec3 c1 = vec3(1.0, 0.0, 1.0);
    vec3 c2 = vec3(0.0, 1.0, 0.6);
    vec3 c3 = vec3(0.0, 1.0, 1.0);
    vec3 c4 = vec3(1.0, 0.4, 0.8);

    float n1 = sin(p.x * 0.3 + p.y * 0.2 + t * 1.4);
    float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 1.1);
    float n3 = sin(p.z * 0.5 + p.x * 0.4 - t * 1.6);
    float n4 = cos(p.x * 0.2 + p.y * 0.6 + t * 1.8);

    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;

    vec3 neon = normalize(c1 * n1 + c2 * n2 + c3 * n3 + c4 * n4);
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
        p = z * normalize(vec3(I + I, 0.0) - iResolution.xyx) + 0.1;
        p = vec3(atan(p.y / 0.2, p.x) * 2.0, p.z / 3.0, length(p.xy) - 5.0 - z * 0.2);

        for (int j = 1; j <= 7; j++) {
            float fj = float(j);
            p += sin(p.yzx * fj + iTime * 0.5 + 0.3 * fi) / fj;
        }

        z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));
        vec3 neon = blendNeon(p, iTime);
        O.rgb += (1.0 + cos(p.x + fi * 0.4 + z)) / d * neon;
    }

    O = (exp(O * O / 400.0) - exp(-O * O / 400.0)) / (exp(O * O / 400.0) + exp(-O * O / 400.0));
    O.rgb = pow(O.rgb, vec3(0.8));
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}
`;

  // Утилиты компиляции и сборки программы
  function compileShader(glContext, type, source) {
    const sh = glContext.createShader(type);
    glContext.shaderSource(sh, source);
    glContext.compileShader(sh);
    if (!glContext.getShaderParameter(sh, glContext.COMPILE_STATUS)) {
      const err = glContext.getShaderInfoLog(sh);
      console.error((type === glContext.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT') + ' SHADER ERROR:\n', err);
      glContext.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createProgram(glContext, vsSource, fsSource, useGL3) {
    const vs = compileShader(glContext, glContext.VERTEX_SHADER, vsSource);
    const fs = compileShader(glContext, glContext.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const program = glContext.createProgram();
    glContext.attachShader(program, vs);
    glContext.attachShader(program, fs);
    // Для WebGL2 мы используем layout(location=0) в вершинном шейдере, поэтому не нужно bindAttribLocation
    glContext.linkProgram(program);
    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      console.error('Program link error:', glContext.getProgramInfoLog(program));
      glContext.deleteProgram(program);
      return null;
    }
    // shaders can be deleted after linking
    glContext.deleteShader(vs);
    glContext.deleteShader(fs);
    return program;
  }

  // Выбрать набор шейдеров в зависимости от контекста
  const useGL3 = isWebGL2;
  const vertexSrc = useGL3 ? vertexSrcGL3 : vertexSrcGL1;
  const fragmentSrc = useGL3 ? fragmentSrcGL3 : fragmentSrcGL1;

  // Создать программу
  const program = createProgram(gl, vertexSrc, fragmentSrc, useGL3);
  if (!program) {
    console.error('Не удалось создать GL программу');
    return;
  }
  gl.useProgram(program);

  // Полный экранный quad (буфер)
  const quadVerts = new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  if (useGL3) {
    // WebGL2: vertex shader использует layout(location = 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  } else {
    // WebGL1: надо получить location по имени
    const posLoc = gl.getAttribLocation(program, 'a_position');
    if (posLoc === -1) {
      console.warn('Attribute a_position не найден');
    } else {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  // Uniform locations
  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');

  // Рендер-цикл
  let start = performance.now();
  function render(now) {
    resize();
    const t = performance.now() - start;
    if (iResolutionLoc) gl.uniform2f(iResolutionLoc, canvas.width, canvas.height);
    if (iTimeLoc) gl.uniform1f(iTimeLoc, t * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

});
