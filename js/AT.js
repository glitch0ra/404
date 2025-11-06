(function AntiBrowserThrottling() {
  console.log('%c[Anti-Throttling] Active', 'color:#0f0;font-weight:bold;');

  // 1️⃣ Поддержка "активности" страницы
  //    Имитация микро-действий, чтобы браузер не считал вкладку "пассивной"
  const fakeEvt = new MouseEvent('mousemove', { bubbles: true });
  setInterval(() => {
    window.dispatchEvent(fakeEvt);
    document.body.style.opacity = '0.9999';
    document.body.offsetHeight; // форсирует reflow
    document.body.style.opacity = '1';
  }, 150);

  // 2️⃣ Независимая GPU-петля (без использования твоих canvas)
  //    Создаёт 1×1 canvas в offscreen для постоянного compositor activity
  const hiddenCanvas = document.createElement('canvas');
  hiddenCanvas.width = hiddenCanvas.height = 1;
  hiddenCanvas.style.cssText =
    'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-9999;';
  document.body.appendChild(hiddenCanvas);

  let gl =
    hiddenCanvas.getContext('webgl2', { powerPreference: 'low-power' }) ||
    hiddenCanvas.getContext('webgl', { powerPreference: 'low-power' });

  if (gl) {
    const v = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(v, 'void main(){gl_Position=vec4(0.0);}');
    gl.compileShader(v);

    const f = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(
      f,
      'precision mediump float;void main(){gl_FragColor=vec4(0.0,0.0,0.0,1.0);}'
    );
    gl.compileShader(f);

    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.useProgram(p);

    // GPU tick loop — минимальный, но держит compositor активным
    (function render() {
      gl.drawArrays(gl.POINTS, 0, 1);
      requestAnimationFrame(render);
    })();
  } else {
    console.warn('[Anti-Throttling] WebGL unavailable, using fake activity only');
  }

  // 3️⃣ Контроль стабильности FPS — необязательный, но полезный
  //    Если браузер снова режет FPS, скрипт сам “пошевелит” DOM сильнее
  let lastTime = performance.now();
  let frames = 0;
  function monitor() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 200) {
      const fps = (frames * 100) / (now - lastTime);
      if (fps < 50) {
        document.body.style.transform = 'translateZ(0)';
        document.body.style.willChange = 'transform';
        console.warn('[Anti-Throttling] FPS drop detected, refreshing compositor');
      }
      frames = 0;
      lastTime = now;
    }
    requestAnimationFrame(monitor);
  }
  monitor();
})();
