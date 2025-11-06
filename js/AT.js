(function() {
  const state = {
    wakeLockSentinel: null,
    audioCtx: null,
    oscillator: null,
    gain: null,
    active: false,
    triedWakeLock: false,
    triedAudio: false
  };

  // Логирование (можешь убрать)
  function log(...args) { console.info('[anti-throttle]', ...args); }

  // ---------- 1) Wake Lock API ----------
  async function tryWakeLock() {
    if (!('wakeLock' in navigator)) {
      log('Wake Lock API не поддерживается');
      return false;
    }
    try {
      state.triedWakeLock = true;
      // request may fail if document.hidden or user settings
      const sentinel = await navigator.wakeLock.request('screen');
      state.wakeLockSentinel = sentinel;
      state.active = true;
      log('WakeLock получен');
      // Перезапрашивать при visibilitychange (специально по рекомендациям)
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && !state.wakeLockSentinel) {
          try {
            state.wakeLockSentinel = await navigator.wakeLock.request('screen');
            log('WakeLock восстановлен после visibilitychange');
          } catch (e) {
            log('Не удалось восстановить WakeLock:', e && e.message);
          }
        }
      });
      // освобождение при релизе
      sentinel.addEventListener('release', () => {
        log('WakeLock released');
        state.wakeLockSentinel = null;
        state.active = false;
      });
      return true;
    } catch (err) {
      log('WakeLock request rejected:', err && err.message);
      return false;
    }
  }

  // ---------- 2) WebAudio fallback (тихий сигнал) ----------
  // Примечание: WebAudio может требовать пользовательский жест (resume())
  function tryAudioKeepAlive() {
    try {
      state.triedAudio = true;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        log('Web Audio API не поддерживается');
        return false;
      }
      const ctx = new AudioCtx({ latencyHint: 'playback' });
      // some browsers suspend audio context until user gesture; we'll try to resume if suspended
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        // Не вызываем resume автоматически в некоторых політиках — делаем попытку и если отклонено, пользователю нужен клик.
        ctx.resume().catch(()=>{/*ignore*/});
      }

      // Создаём тихий осциллятор - сигнал почти не слышен
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // почти 0 — минимальная нагрузка на звук (избегаем audible)
      osc.type = 'sine';
      osc.frequency.value = 20; // низкая частота
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);

      state.audioCtx = ctx;
      state.oscillator = osc;
      state.gain = gain;
      state.active = true;
      log('Audio keep-alive started (может требовать пользовательский жест)');
      return true;
    } catch (e) {
      log('Ошибка при старте Audio keep-alive:', e && e.message);
      return false;
    }
  }

  // Отключить аудио
  function stopAudioKeepAlive() {
    try {
      if (state.oscillator) {
        state.oscillator.stop();
        state.oscillator.disconnect();
      }
      if (state.gain) state.gain.disconnect();
      if (state.audioCtx) {
        // don't close immediately to avoid errors, but close to free resources
        if (typeof state.audioCtx.close === 'function') state.audioCtx.close().catch(()=>{});
      }
    } catch(e){}
    state.audioCtx = state.oscillator = state.gain = null;
    state.active = false;
  }

  // ---------- 3) Лёгкая имитация активности (последнее средство) ----------
  let activityInterval = null;
  function startFakeActivity(interval = 200) {
    if (activityInterval) return;
    const fakeEvt = new MouseEvent('mousemove', { bubbles: true });
    activityInterval = setInterval(() => {
      window.dispatchEvent(fakeEvt);
      // небольшая DOM-мелочь без reflow
      document.documentElement.style.setProperty('--anti-throttle', Date.now());
    }, interval);
    log('Fake activity started');
  }
  function stopFakeActivity() {
    if (!activityInterval) return;
    clearInterval(activityInterval);
    activityInterval = null;
    log('Fake activity stopped');
  }

  // ---------- 4) Главное включение: пробуем wakeLock, иначе audio, иначе fake activity ----------
  async function enableAntiThrottle() {
    if (state.active) {
      log('Anti-throttle уже включён');
      return true;
    }

    // 1) Попробуем wake lock
    const wakeOk = await tryWakeLock().catch(()=>false);
    if (wakeOk) {
      startFakeActivity(300); // поддержка слоем имитации (малый overhead)
      return true;
    }

    // 2) Попробуем аудио-фоллбек
    const audioOk = tryAudioKeepAlive();
    if (audioOk) {
      startFakeActivity(300);
      return true;
    }

    // 3) Если ничего не прошло — включаем только лёгкую имитацию активности
    startFakeActivity(150);
    log('Включен только fake activity (лучшее из доступного)');
    return false;
  }

  // Автоматическая попытка включиться — но если autoplay ограничения мешают, мы оставляем публичный API
  (async function auto() {
    // Ждём, пока DOM готов (но не ждём пользовательского клика)
    if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    }

    // если документ видим — пробуем сразу; иначе включится при видимости
    if (document.visibilityState === 'visible') {
      const ok = await enableAntiThrottle();
      // Если не получилось (например, audio заблокирован), добавим слушатель клика для попытки вручную
      if (!ok) {
        log('Anti-throttle: требуется пользовательское взаимодействие для полного включения. Вызови enableAntiThrottle() после клика или нажми на страницу.');
      }
    } else {
      document.addEventListener('visibilitychange', async function onVisible() {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          await enableAntiThrottle();
        }
      });
    }
  })();

  // Публичная машина управления (если захочешь вызвать вручную)
  window.AntiThrottle = {
    enable: enableAntiThrottle,
    disable: async function() {
      try {
        if (state.wakeLockSentinel && typeof state.wakeLockSentinel.release === 'function') {
          await state.wakeLockSentinel.release();
        }
      } catch(e){}
      stopAudioKeepAlive();
      stopFakeActivity();
      state.wakeLockSentinel = null;
      state.active = false;
      log('Anti-throttle выключен');
    },
    status: () => ({ active: state.active, triedWakeLock: state.triedWakeLock, triedAudio: state.triedAudio })
  };

})();
