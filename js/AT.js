<!-- Вставь прямо перед </body> -->
<script>
(function AntiThrottlingModule() {
  // Конфигурация — можно подправить интервалы
  const FAKE_MOVE_INTERVAL_MS = 200;   // имитация мыши
  const PLAYKEEP_INTERVAL_MS = 100;    // запасной таймер для видео (fallback)
  const GL_CANVAS_SIZE = 1;             // 1x1 невидимый canvas

  // 1) Имитация активности пользователя (mousemove)
  function startFakeUserActivity() {
    let lastX = 1, lastY = 1;
    const makeMove = () => {
      // немного дергаем координаты, чтобы событие не было идентичным
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
      // минимально видно на странице, но не мешает
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

    // если доступен requestVideoFrameCallback — используем его рекурсивно
    if (typeof video.requestVideoFrameCallback === 'function') {
      const cb = (now, metadata) => {
        if (!rafActive) return;
        try {
          // просто перезапрашиваем кадр — не меняем playback
          video.requestVideoFrameCallback(cb);
        } catch (e) {
          // если что-то пошло не так — включаем fallback
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
      // fallback: периодически вызывать video.play() и обновлять playbackRate на микроскопические интервалы
      // чтобы не ломать синхронизацию заметно, мы вызываем play() и иногда коротко слегка трогаем playbackRate
      fallbackId = setInterval(() => {
        if (video.paused) {
          video.play().catch(()=>{ /* ignore autoplay rejection */ });
        } else {
          // небольшой "импульс" - увеличиваем playbackRate на очень маленькую величину на 40ms
          // не всегда нужно; это попытка "разбудить" декодер на некоторых движках
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

    // вернуть функцию остановки
    return () => {
      rafActive = false;
      if (fallbackId) clearInterval(fallbackId);
    };
  }

  // Управление модулем: находим все целевые видео и запускаем "содержатели"
  function init() {
    const stopFake = startFakeUserActivity();
    const stopGL = startWebGLLoop();

    // Поддерживаем все видео на странице (или можно выбрать по селекторам)
    const videos = Array.from(document.querySelectorAll('video'));
    const stopFns = videos.map(v => keepVideoAwake(v));

    // Управляем видимостью страницы: при скрытии мы можем остановить часть активности
    // (по желанию — оставляем или выключаем, здесь мы выключаем fake activity, но GL loop можно оставить)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // при скрытии вкладки: попытаться минимизировать нагрев — остановим fake mouse
        // но GL loop мы оставим, чтобы сохранить максимум шансов на устойчивый FPS в некоторых браузерах.
        // Если хочешь экономить — раскомментируй следующую строку:
        // stopFake();
      } else {
        // при возврате — снова включаем fake activity (если она была остановлена)
        // простая реализация: ничего не делаем (fake работает постоянно)
      }
    });

    // Возвращаем stop-функцию на случай, если захочешь выключить
    return function stopAll() {
      try { stopFake(); } catch(e){}
      try { stopGL(); } catch(e){}
      stopFns.forEach(fn => { try { fn(); } catch(e){} });
    };
  }

  // Запуск после DOMReady (или сразу, если DOM уже готов)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose for debugging: window.__antiThrottleStop = stopFunction (не обязателен)
  // Мы не сохраняем stop в window по умолчанию, чтобы не мусорить, но если нужно — раскомментируй.
})();
</script>

