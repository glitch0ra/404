// Anti-Throttling Full Protection Script
// Автор: GPT-5, 2025
(function() {
  console.log('%c[AntiThrottling] Запущен', 'color:lime');

  /*────────────────────
   * 1. Защита таймеров
   *────────────────────*/
  const _setTimeout = window.setTimeout;
  const _setInterval = window.setInterval;
  const _raf = window.requestAnimationFrame;

  const MIN_INTERVAL = 16; // ~60 FPS
  const timers = new Set();

  window.setTimeout = function(fn, delay, ...args) {
    return _setTimeout(fn, Math.max(delay, MIN_INTERVAL), ...args);
  };

  window.setInterval = function(fn, delay, ...args) {
    const realDelay = Math.max(delay, MIN_INTERVAL);
    const id = _setInterval(fn, realDelay, ...args);
    timers.add(id);
    return id;
  };

  window.requestAnimationFrame = function(cb) {
    return _raf(function step(ts) {
      cb(ts);
      _raf(step);
    });
  };

  /*────────────────────
   * 2. Защита видимости страницы
   *────────────────────*/
  const forceVisible = () => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  };
  forceVisible();

  document.addEventListener('visibilitychange', e => {
    forceVisible();
    e.stopImmediatePropagation();
    console.log('[AntiThrottling] visibilitychange блокирован');
  }, true);

  window.addEventListener('blur', e => {
    window.focus();
    e.stopImmediatePropagation();
    console.log('[AntiThrottling] blur блокирован');
  }, true);

  window.addEventListener('pagehide', e => {
    e.preventDefault();
    console.log('[AntiThrottling] pagehide отменён');
  });

  /*────────────────────
   * 3. Активность страницы (имитация)
   *────────────────────*/
  setInterval(() => {
    window.dispatchEvent(new Event('mousemove'));
    window.dispatchEvent(new Event('keydown'));
    navigator?.sendBeacon?.('', new Blob()); // держим процесс живым
  }, 5000);

  /*────────────────────
   * 4. Механизмы поддержки активности
   *────────────────────*/
  // MessageChannel ping
  const msgChannel = new MessageChannel();
  setInterval(() => msgChannel.port1.postMessage('ping'), 100);

  // BroadcastChannel keep-alive
  try {
    const bc = new BroadcastChannel('keep_alive');
    setInterval(() => bc.postMessage('still_alive'), 200);
  } catch(e) {}

  // AudioContext hack (заставляет браузер считать вкладку активной)
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    osc.frequency.value = 0.001; // неслышимый тон
    osc.connect(audioCtx.destination);
    osc.start();
  } catch(e) {
    console.warn('[AntiThrottling] AudioContext недоступен');
  }

  // WebSocket ping (если есть сеть)
  try {
    const ws = new WebSocket('wss://echo.websocket.org');
    ws.onopen = () => {
      setInterval(() => {
        if (ws.readyState === 1) ws.send('ping');
      }, 400);
    };
  } catch(e) {}

  /*────────────────────
   * 5. Защита от "background tab throttling"
   *────────────────────*/
  const noop = () => {};
  ['onfreeze', 'onresume', 'onvisibilitychange', 'onsuspend'].forEach(ev => {
    if (ev in document) document[ev] = noop;
    if (ev in window) window[ev] = noop;
  });

  if ('scheduler' in window && 'yield' in window.scheduler) {
    window.scheduler.yield = async () => Promise.resolve(); // нейтрализуем yield замедление
  }

  /*────────────────────
   * 6. Periodic Performance check
   *────────────────────*/
  let lastTS = performance.now();
  setInterval(() => {
    const now = performance.now();
    const diff = now - lastTS;
    if (diff > 40) console.warn(`[AntiThrottling] Обнаружено замедление: ${diff.toFixed(1)}ms`);
    lastTS = now;
  }, 100);

  console.log('%c[AntiThrottling] Все защиты активированы', 'color:lime');
})();
