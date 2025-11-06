// assets/js/shader.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('shader-canvas');
    if (!canvas) {
        console.error('❌ Canvas #shader-canvas не найден!');
        return;
    }

    // Определение мобильного устройства
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const TARGET_DESKTOP_FPS = 50;
    const TARGET_MOBILE_FPS = isMobile ? 30 : TARGET_DESKTOP_FPS;
    const TARGET_FPS = isMobile ? TARGET_MOBILE_FPS : TARGET_DESKTOP_FPS;

    // WebGL контекст с оптимизациями
    const gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        failIfMajorPerformanceCaveat: true
    });

    if (!gl) {
        console.error('❌ WebGL2 не поддерживается');
        canvas.style.display = 'none';
        return;
    }

    console.log('✅ WebGL2 активен');
    console.log(`📱 Мобильное устройство: ${isMobile ? 'Да' : 'Нет'}`);
    console.log(`🎯 Целевой FPS: ${TARGET_FPS}`);

    /*───────────────────── Адаптивные параметры ─────────────────────*/
    let resolutionScale = isMobile ? 0.65 : 1.0;
    let qualityLevel = isMobile ? 0.6 : 1.0;
    let fps = TARGET_FPS;
    const fpsSamples = [];
    let lastTime = performance.now();
    let lastAdjustTime = performance.now();
    const ADJUST_INTERVAL = isMobile ? 800 : 500;
    let needsResize = true;
    let lastOverlayUpdate = 0;

    // Гистерезисные пороги
    const CRITICAL_THRESHOLD = TARGET_FPS * 0.55;
    const WARNING_THRESHOLD = TARGET_FPS * 0.75;
    const RECOVERY_THRESHOLD = TARGET_FPS * 1.15;

    /*───────────────────── Визуальная диагностика ─────────────────────*/
    // ⛔ УДАЛИТЬ ПЕРЕД ПРОДАКШЕНОМ ⛔
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 9999;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        padding: 6px 10px;
        border-radius: 8px;
        background: rgba(0,0,0,0.7);
        color: #00FFAA;
        pointer-events: none;
        user-select: none;
        backdrop-filter: blur(4px);
        white-space: pre;
        transition: opacity 0.3s;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '1'; }, 300);
    // ⛔ КОНЕЦ БЛОКА ДИАГНОСТИКИ ⛔

    /*───────────────────── Измерение FPS ─────────────────────*/
    function updatePerformance(now) {
        const delta = now - lastTime;
        lastTime = now;
        const currentFps = 1000 / delta;
        fpsSamples.push(currentFps);
        if (fpsSamples.length > 30) fpsSamples.shift();
        fps = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;
    }

    /*───────────────────── Адаптация с гистерезисом ─────────────────────*/
    function adjustQuality(now) {
        if (now - lastAdjustTime < ADJUST_INTERVAL) return;
        
        lastAdjustTime = now;
        const oldScale = resolutionScale;
        const oldQuality = qualityLevel;

        // Экспоненциальная адаптация с гистерезисом
        if (fps < CRITICAL_THRESHOLD) {
            resolutionScale = Math.max(0.4, resolutionScale * 0.7);
            qualityLevel = Math.max(0.4, qualityLevel * 0.6);
        } 
        else if (fps < WARNING_THRESHOLD) {
            resolutionScale = Math.max(0.55, resolutionScale * 0.9);
            qualityLevel = Math.max(0.55, qualityLevel * 0.85);
        }
        else if (fps > RECOVERY_THRESHOLD && resolutionScale < 1.0) {
            resolutionScale = Math.min(1.0, resolutionScale * 1.08);
            qualityLevel = Math.min(1.0, qualityLevel * 1.05);
        }

        // Активировать ресайз при значительных изменениях
        if (Math.abs(oldScale - resolutionScale) > 0.07 || 
            Math.abs(oldQuality - qualityLevel) > 0.07) {
            needsResize = true;
        }
    }

    /*────────────────────────────── GLSL ──────────────────────────────*/
    const vertexSrc = `#version 300 es
precision mediump float;
layout(location = 0) in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fragmentSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
uniform float uQuality;

vec3 oilMix(vec3 p, float t) {
    vec3 c1 = vec3(1.0, 0.0, 1.0);
    vec3 c2 = vec3(0.0, 1.0, 0.58);
    vec3 c3 = vec3(0.0, 1.0, 1.0);
    vec3 c4 = vec3(1.0, 0.4, 0.8);
    float n1 = sin(p.x * 0.35 + p.y * 0.25 + t * 2.8);
    float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 3.2);
    float n3 = sin(p.z * 0.45 + p.x * 0.4 - t * 2.6);
    float n4 = cos(p.x * 0.25 + p.y * 0.6 + t * 2.2);
    n1 = 0.5 + 0.5 * n1;
    n2 = 0.5 + 0.5 * n2;
    n3 = 0.5 + 0.5 * n3;
    n4 = 0.5 + 0.5 * n4;
    return normalize(c1 * n1 + c2 * n2 + c3 * n3 + c4 * n4);
}

void mainImage(out vec4 O, vec2 I) {
    float z = 0.0;
    float d = 0.0;
    O = vec4(0.0);
    float iter = mix(10.0, 20.0, uQuality);
    for (float i = 0.0; i < iter; i++) {
        vec3 p = z * normalize(vec3(I + I, 0.0) - iResolution.xyx) + 0.1;
        p = vec3( atan(p.y / 0.2, p.x) * 2.0, p.z / 3.0, length(p.xy) - 5.0 - z * 0.2 );
        for (float j = 1.0; j <= 7.0; j++)
            p += sin(p.yzx * j + iTime * 0.4 + 0.3 * i) / j;
        z += d = length(vec4(0.4 * cos(p) - 0.4, p.z));
        O.rgb += (1.0 + cos(p.x + i * 0.4 + z)) / d * oilMix(p, iTime);
    }
    O = tanh(O * O / 400.0);
    O.rgb = pow(O.rgb, vec3(0.8));
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
}`;

    /*──────────────────── Компиляция шейдеров ────────────────────*/
    function compileShader(type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('_SHADER_ERROR_', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vertexSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
    
    if (!vs || !fs) {
        canvas.style.display = 'none';
        overlay.textContent = '❌ Ошибка компиляции шейдеров';
        return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('_PROGRAM_LINK_ERROR_', gl.getProgramInfoLog(program));
        return;
    }
    
    gl.useProgram(program);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    /*──────────────────── Геометрия ────────────────────*/
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]), gl.STATIC_DRAW);
    
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    /*──────────────────── Uniforms ────────────────────*/
    const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iFrameLoc = gl.getUniformLocation(program, 'iFrame');
    const iMouseLoc = gl.getUniformLocation(program, 'iMouse');
    const uQualityLoc = gl.getUniformLocation(program, 'uQuality');

    /*──────────────────── Состояние ────────────────────*/
    let start = performance.now();
    let frame = 0;
    const mouse = [0, 0, 0, 0];
    let animationFrame = null;
    let isPaused = false;

    /*──────────────────── Обработчики событий ────────────────────*/
    if (!isMobile) {
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            mouse[0] = e.clientX - rect.left;
            mouse[1] = rect.height - (e.clientY - rect.top);
        });

        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            mouse[2] = e.clientX - rect.left;
            mouse[3] = rect.height - (e.clientY - rect.top);
        });
    }

    function pauseRendering() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        isPaused = true;
    }

    function resumeRendering() {
        isPaused = false;
        if (!animationFrame) {
            lastTime = performance.now();
            lastRenderTime = performance.now();
            animationFrame = requestAnimationFrame(render);
        }
    }

    document.addEventListener('visibilitychange', () => {
        document.hidden ? pauseRendering() : resumeRendering();
    });

    const observer = new IntersectionObserver(entries => {
        entries[0].isIntersecting ? resumeRendering() : pauseRendering();
    }, { threshold: 0.05 });
    observer.observe(canvas);

    /*──────────────────── Ресайз ────────────────────*/
    function resize() {
        if (!needsResize) return;
        
        const dpr = window.devicePixelRatio;
        const effectiveScale = Math.min(resolutionScale, 1.0);
        
        canvas.width = window.innerWidth * dpr * effectiveScale;
        canvas.height = window.innerHeight * dpr * effectiveScale;
        
        gl.viewport(0, 0, canvas.width, canvas.height);
        needsResize = false;
        
        console.log(`📏 Новое разрешение: ${canvas.width}x${canvas.height} (scale: ${effectiveScale.toFixed(2)})`);
    }

    window.addEventListener('resize', () => {
        needsResize = true;
    });

    /*──────────────────── Очистка ресурсов ────────────────────*/
    function cleanup() {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        observer.disconnect();
        
        if (gl) {
            gl.deleteBuffer(quad);
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
        }
        
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        
        console.log('♻️ WebGL ресурсы очищены');
    }

    window.addEventListener('beforeunload', cleanup);

    /*──────────────────── Цикл рендеринга ────────────────────*/
    let lastRenderTime = 0;

    function render(now) {
        if (isPaused) return;
        
        // Адаптация качества
        updatePerformance(now);
        adjustQuality(now);
        
        // Обработка ресайза
        if (needsResize) resize();
        
        // Расчет времени
        const elapsed = now - lastRenderTime;
        const minFrameTime = 1000 / (TARGET_FPS + 5); // Небольшой запас
        
        if (elapsed < minFrameTime) {
            animationFrame = requestAnimationFrame(render);
            return;
        }
        
        lastRenderTime = now;
        
        // Установка uniforms
        const t = (now - start) * 0.001;
        gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
        gl.uniform1f(iTimeLoc, t);
        gl.uniform1i(iFrameLoc, frame++);
        gl.uniform4f(iMouseLoc, mouse[0], mouse[1], mouse[2], mouse[3]);
        gl.uniform1f(uQualityLoc, qualityLevel);
        
        // Очистка и отрисовка
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Обновление оверлея (не каждый кадр)
        if (now - lastOverlayUpdate > 300) {
            overlay.textContent = `
FPS: ${fps.toFixed(1)} / ${TARGET_FPS}
RES: ${Math.round(resolutionScale * 100)}%
QUAL: ${Math.round(qualityLevel * 100)}%
Scale: ${isMobile ? 'MOBILE' : 'DESKTOP'}
Версия: 2.1 (оптимизировано)
            `.trim();
            lastOverlayUpdate = now;
        }
        
        animationFrame = requestAnimationFrame(render);
    }

    // Инициализация
    resize();
    resumeRendering();
    
    // Показать canvas после инициализации
    canvas.style.opacity = '1';
    canvas.style.transition = 'opacity 0.5s';
});


