(function AntiThrottlingModule() {
  // Конфигурация — можно подправить интервалы
  const FAKE_MOVE_INTERVAL_MS = 200;   // имитация мыши
  const PLAYKEEP_INTERVAL_MS = 100;    // запасной таймер для видео (fallback)
  const GL_CANVAS_SIZE = 1;             // 1x1 невидимый canvas

  // 1) Имитация активности пользователя (mousemove)
  function startFakeUserActivity() {
    let lastX = 1, lastY = 1;
    const makeMove = () => {
      lastX = (lastX + 13) % 100;
      lastY = (lastY + 7) % 100;
      const ev = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: lastX,
        clientY: lastY
      });
      document.dispatchEvent(ev);
    };
    const id = setInterval(makeMove, FAKE_MOVE_INTERVAL_MS);
    return () => clearInterval(id);
  }

  // 2) WebGL loop — держит compositor/GPU в активности
  function startWebGLLoop() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = GL_CANVAS_SIZE;
      canvas.height = GL_CANVAS_SIZE;
      canvas.style.position = 'fixed';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '1px';
      canvas.style.height = '1px';
      canvas.style.opacity = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '-9999';
      document.body.appendChild(canvas);

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return () => { canvas.remove(); };

      gl.clearColor(0,0,0,0);

      let running = true;
      function frame() {
        if (!running) return;
        gl.clear(gl.COLOR_BUFFER_BIT);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      return () => {
        running = false;
        try { canvas.remove(); } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  }

  // 3) Поддержка видео (requestVideoFrameCallback, fallback)
  function keepVideoAwake(video) {
    if (!video) return () => {};
    let rafActive = true;
    let fallbackId = null;

    if (typeof video.requestVideoFrameCallback === 'function') {
      const cb = (now, metadata) => {
        if (!rafActive) return;
        try {
          video.requestVideoFrameCallback(cb);
        } catch (e) {
          rafActive = false;
          startFallback();
        }
      };
      try {
        video.requestVideoFrameCallback(cb);
      } catch (e) {
        rafActive = false;
        startFallback();
      }
    } else {
      startFallback();
    }

    function startFallback() {
      fallbackId = setInterval(() => {
        if (video.paused) {
          video.play().catch(()=>{});
        } else {
          try {
            const orig = video.playbackRate || 1;
            video.playbackRate = orig * 1.0001;
            setTimeout(() => {
              try { video.playbackRate = orig; } catch(e){}
            }, 40);
          } catch(e){}
        }
      }, PLAYKEEP_INTERVAL_MS);
    }

    return () => {
      rafActive = false;
      if (fallbackId) clearInterval(fallbackId);
    };
  }

  // Инициализация
  function init() {
    const stopFake = startFakeUserActivity();
    const stopGL = startWebGLLoop();

    const videos = Array.from(document.querySelectorAll('video'));
    const stopFns = videos.map(v => keepVideoAwake(v));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // stopFake(); // при желании можно включить экономию
      }
    });

    return function stopAll() {
      try { stopFake(); } catch(e){}
      try { stopGL(); } catch(e){}
      stopFns.forEach(fn => { try { fn(); } catch(e){} });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
