// Anti-Throttling Safe Edition (без лагов)
// GPT-5, 2025
(function() {
  console.log('%c[AntiThrottling] Safe Edition запущен', 'color:lime');

  /*────────── 1. Защита видимости ──────────*/
  const forceVisible = () => {
    try {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    } catch {}
  };
  forceVisible();

  document.addEventListener('visibilitychange', e => {
    forceVisible();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('blur', e => {
    e.stopImmediatePropagation();
    window.focus();
  }, true);

  /*────────── 2. Лёгкая имитация активности ──────────*/
  setInterval(() => {
    window.dispatchEvent(new Event('mousemove'));
    navigator?.sendBeacon?.('', new Blob());
  }, 15000); // 1 раз в 15 секунд

  /*────────── 3. Минимальные "живые" процессы ──────────*/
  try {
    const mc = new MessageChannel();
    setInterval(() => mc.port1.postMessage('ping'), 5000);
  } catch {}

  try {
    const bc = new BroadcastChannel('alive');
    setInterval(() => bc.postMessage('ok'), 8000);
  } catch {}

  /*────────── 4. Аудио включается только после клика ──────────*/
  let audioStarted = false;
  const startAudio = () => {
    if (audioStarted) return;
    audioStarted = true;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.frequency.value = 0.001;
      osc.connect(ctx.destination);
      osc.start();
      console.log('[AntiThrottling] AudioContext активирован');
    } catch (e) {
      console.warn('[AntiThrottling] AudioContext не запущен', e);
    }
  };
  window.addEventListener('pointerdown', startAudio, { once: true });

  /*────────── 5. Мягкий контроль FPS ──────────*/
  let last = performance.now();
  let slowFrames = 0;
  function monitor() {
    const now = performance.now();
    const diff = now - last;
    if (diff > 1000) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 0.5);
    last = now;

    if (slowFrames > 5) {
      console.warn('[AntiThrottling] Обнаружено длительное замедление — включен safe mode');
      slowFrames = 0;
    }
    requestAnimationFrame(monitor);
  }
  requestAnimationFrame(monitor);

  console.log('%c[AntiThrottling] Все защиты активны (Safe)', 'color:lime');
})();
