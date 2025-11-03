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
     WebGL2 Shader Section
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

/*──────────────────────────────
  Оригинальная бензиновая волна
──────────────────────────────*/
vec3 oilMix(vec3 p, float t) {
    vec3 c1 = vec3(1.0, 0.0, 1.0);   // 💜 пурпурный
    vec3 c2 = vec3(0.0, 1.0, 0.58);  // 💚 зелёный
    vec3 c3 = vec3(0.0, 1.0, 1.0);   // 💙 голубой
    vec3 c4 = vec3(1.0, 0.4, 0.8);   // 💗 розовый

    // ускоренная смена цветов ×2
    float n1 = sin(p.x * 0.35 + p.y * 0.25 + t * 2.8);
    float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 3.2);
    float n3 = sin(p.z * 0.45 + p.x * 0.4 - t * 2.6);
    float n4 = cos(p.x * 0.25 + p.y * 0.6 + t * 2.2);

    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;

    vec3 neon = normalize(
        c1 * n1 +
        c2 * n2 +
        c3 * n3 +
        c4 * n4
    );
    return neon;
}

/*──────────────────────────────
  Дополнительный glitch noise
──────────────────────────────*/
float rand(vec2 p) {
    float t = floor(iTime * 20.0) / 10.0;
    return fract(sin(dot(p, vec2(t * 12.9898, t * 78.233))) * 43758.5453);
}

float noise(vec2 uv, float blockiness) {
    vec2 lv = fract(uv);
    vec2 id = floor(uv);
    float n1 = rand(id);
    float n2 = rand(id + vec2(1.0, 0.0));
    float n3 = rand(id + vec2(0.0, 1.0));
    float n4 = rand(id + vec2(1.0, 1.0));
    vec2 u = smoothstep(0.0, 1.0 + blockiness, lv);
    return mix(mix(n1, n2, u.x), mix(n3, n4, u.x), u.y);
}

float fbm(vec2 uv, int count, float blockiness, float complexity) {
    float val = 0.0;
    float amp = 0.5;
    while(count != 0) {
        val += amp * noise(uv + (rand(ceil(uv * 3.0) / 3.0) * 2.0 + (float(floor(iTime * 20.0) / 10.0) / float(count)) - 1.0), blockiness);
        amp *= 0.5;
        uv *= complexity;
        count--;
    }
    return val;
}

/*──────────────────────────────
  Основное изображение
──────────────────────────────*/
vec4 mainImage(vec2 fragCoord)
{
    vec4 O = vec4(0.0);
    float z = 0.0;
    float d = 0.0;

    for (float i = 0.0; i < 20.0; i++)
    {
        // замедление движения ×2.5
        vec3 p = z * normalize(vec3(fragCoord + fragCoord, 0.0) - iResolution.xyx) + 0.1;
        p = vec3(
            atan(p.y / 0.2, p.x) * 2.0,
            p.z / 3.0,
            length(p.xy) - 5.0 - z * 0.2
        );

        for (float j = 1.0; j <= 7.0; j++)
            p += sin(p.yzx * j + iTime * 0.4 + 0.3 * i) / j;

        z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));

        vec3 neon = oilMix(p, iTime);
        O.rgb += (1.0 + cos(p.x + i * 0.4 + z)) / d * neon;
    }

    // tanh тонмап и гамма
    O = tanh(O * O / 400.0);
    O.rgb = pow(O.rgb, vec3(0.8));

    /*──────────────────────
      Glitch поверх волн
    ──────────────────────*/
    vec2 uv = fragCoord / iResolution.xy;
    uv *= 5.0;

    float glitchVal = smoothstep(0.5, 1.0, fbm(uv + iTime * 0.3, 2, 3.0, 1.5));
    float glitchPower = step(0.96, fract(sin(iTime * 0.8) * 0.5 + 0.5));

    vec3 g1 = vec3(1.0, 0.0, 1.0);   // 💜
    vec3 g2 = vec3(0.0, 1.0, 0.58);  // 💚
    vec3 g3 = vec3(0.0, 1.0, 1.0);   // 💙
    vec3 g4 = vec3(1.0, 0.4, 0.8);   // 💗
    vec3 glitchColor = normalize(g1 + g2 + g3 + g4) * glitchVal * glitchPower;

    O.rgb += glitchColor * 0.4;
    return O;
}

/*──────────────────────────────
  MAIN
──────────────────────────────*/
void main() {
    vec4 color = mainImage(gl_FragCoord.xy);
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






