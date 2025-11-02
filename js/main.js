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

#define S(a,b,t) smoothstep(a,b,t)
#define NUM_LAYERS 4.0

float N21(vec2 p){
    vec3 a = fract(vec3(p.xyx)*vec3(613.897,553.453,80.098));
    a += dot(a,a.yzx+88.76);
    return fract((a.x+a.y)*a.z);
}

vec2 GetPos(vec2 id, vec2 offs, float t){
    float n = N21(id+offs);
    float n1 = fract(n*0.7);
    float n2 = fract(n*79.7);
    float a = t+n;
    return offs + vec2(sin(a*n1), cos(a*n2))*0.5;
}

float df_line(vec2 a, vec2 b, vec2 p){
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
    return length(pa - ba*h);
}

float line(vec2 a, vec2 b, vec2 uv){
    float r1 = 0.005;
    float r2 = 0.0001;
    float d = df_line(a,b,uv);
    float d2 = length(a-b);
    float fade = S(0.005,0.05,d2);
    fade += S(0.0005,0.0002,abs(d2-0.025));
    return S(r1,r2,d)*fade;
}

float NetLayer(vec2 st, float n, float t){
    vec2 id = floor(st)+n;
    st = fract(st)-0.5;

    vec2 p[9];
    int idx = 0;
    for(float y = -1.0; y <= 1.0; y += 1.0) {
        for(float x = -1.0; x <= 1.0; x += 1.0) {
            p[idx++] = GetPos(id, vec2(x,y), t);
        }
    }

    float m = 0.0;
    float sparkle = 0.0;
    for(int i = 0; i < 9; i++) {
        m += line(p[4], p[i], st);
        float d = length(st - p[i]);
        float s = 0.002 / (d * d + 0.0001);
        s *= S(1.0, 0.1, d);
        float pulse = sin((fract(p[i].x) + fract(p[i].y) + t) * 5.0) * 0.4 + 0.6;
        pulse = pow(pulse, 20.0);
        s *= pulse;
        sparkle += s;
    }

    m += line(p[1], p[3], st);
    m += line(p[1], p[5], st);
    m += line(p[7], p[5], st);
    m += line(p[7], p[3], st);

    float sPhase = (sin(t + n) + sin(t * 0.1)) * 0.25 + 0.5;
    sPhase += pow(sin(t * 0.1) * 0.5 + 0.5, 50.0) * 5.0;
    m += sparkle * sPhase;

    return m;
}

void main(){
    vec2 fragCoord = vUv * iResolution.xy;
    vec2 uv = (fragCoord - iResolution.xy * 0.5) / iResolution.y;
    vec2 M = iMouse.xy / iResolution.xy - 0.5;
    float t = iTime * 0.0005;

    float s = sin(t);
    float c = cos(t);
    mat2 rot = mat2(c, -s, s, c);
    vec2 st = uv * rot;
    M *= rot;

    float m = 0.0;
    for(float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYERS){
        float z = fract(t + i);
        float size = mix(15.0, 0.0, z);
        float fade = S(0.0, 0.006, z) * S(0.0, 0.08, z);
        m += fade * NetLayer(st * size - M * z, i, iTime);
    }

    vec3 baseCol = vec3(s, cos(t * 0.1), -sin(t * 0.14)) * 0.1 + 0.1;
    vec3 col = baseCol * m;
    col *= 1.0 - dot(uv, uv); // vignette (чёрные края)

    // === ПЛАВНОЕ ПОЯВЛЕНИЕ ЗА 20 СЕКУНД, НО БЕЗ ИСЧЕЗНОВЕНИЯ ===
    float fadeIn = S(0.0, 20.0, iTime); // появляется за первые 20 сек
    col *= fadeIn;
    // ==============================================================

    gl_FragColor = vec4(col, 1.0);
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
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
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




