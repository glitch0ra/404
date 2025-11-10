// js/shader5.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('shader-canvas5');
  if (!canvas) {
    console.error('shader5: canvas #shader-canvas5 not found');
    return;
  }

  const gl = canvas.getContext('webgl2', {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true
  });
  
  if (!gl) {
    console.error('shader5: WebGL2 not supported in this browser');
    return;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Vertex shader
  const vertexSrc = `#version 300 es
  precision mediump float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;
  
   // Fragment shader
  const fragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec3 iResolution;
uniform float iTime;

const int MAX_DIST = 300;
const float EPSI = 0.009;

// -------------------- noise / fbm (использует твой пример) --------------------
float random(vec2 p) {
    return fract(sin(p.x * 431.0 + p.y * 707.0) * 7443.0);
}

float noise(vec2 uv) {
    vec2 id = floor(uv * 10.0);
    vec2 lc = smoothstep(0.0, 1.0, fract(uv * 10.0));
    float a = random(id);
    float b = random(id + vec2(1.0, 0.0));
    float c = random(id + vec2(0.0, 1.0));
    float d = random(id + vec2(1.0, 1.0));
    return mix(mix(a, b, lc.x), mix(c, d, lc.x), lc.y);
}

float octaves(vec2 uv) {
    float amp = 0.5;
    float f = 0.0;
    for (int i = 0; i < 4; i++) {
        f += noise(uv) * amp;
        uv *= 2.0;
        amp *= 0.5;
    }
    return f;
}

// -------------------- scene mapping --------------------
vec3 spherePos = vec3(8.0, 6.0, 25.0);

float mapSphere(vec3 p) {
    return length(p - spherePos) - 1.0;
}

float mapWater(vec3 p) {
    // та же структура, просто волны выше (как в примере)
    float wave = octaves((p.xz / 30.0) + (iTime / 19.0) + sin(length(p.xz * 2.0)) * 0.04);
    return p.y + 8.0 + wave * 5.0;
}

// -------------------- normals (для простого освещения) --------------------
vec3 getNormalWater(vec3 p) {
    // численная производная карты воды
    float h = 0.02;
    float cx = mapWater(vec3(p.x + h, p.y, p.z)) - mapWater(vec3(p.x - h, p.y, p.z));
    float cz = mapWater(vec3(p.x, p.y, p.z + h)) - mapWater(vec3(p.x, p.y, p.z - h));
    vec3 n = normalize(vec3(cx, 2.0 * h, cz));
    return n;
}

// -------------------- бензиновый (oil-slick) эффект --------------------
vec3 benzineShade(vec3 p, float t) {
    // 1) UV для паттерна
    vec2 uv = p.xz * 0.12;

    // 2) слои фрактала
    float q = octaves(uv + vec2(0.0, t * 0.03));
    float r = octaves(uv + vec2(5.2, -t * 0.015));
    float f = octaves(uv + r + q);

    // 3) палитра (подгоняй, если надо)
    vec3 spectrum0 = vec3(0.94, 0.02, 0.03);
    vec3 spectrum1 = vec3(0.04, 0.04, 0.22);
    vec3 spectrum2 = vec3(1.00, 0.80, 1.00);
    vec3 spectrum3 = vec3(0.20, 0.40, 0.50);

    // 4) микс цветов
    vec3 oil = mix(spectrum1, spectrum3, pow(abs(q), 4.0));
    oil = mix(oil, spectrum0, pow(abs(r), 1.4));
    oil = mix(oil, spectrum2, clamp(f, 0.0, 1.0));
    oil = pow(oil, vec3(2.0));

    // 5) маска покрытия (чтобы не заливать всю поверхность)
    float slickMask = smoothstep(0.05, 0.6, f + 0.5 * q);
    slickMask *= smoothstep(0.1, 0.65, r);

    // 6) базовый цвет воды
    vec3 baseWater = vec3(0.02, 0.04, 0.12);

    // 7) простая аппрокс. fresnel по высоте (плоские участки сильнее)
    float fresnel = pow(clamp(1.0 - (p.y + 8.0) / 6.0, 0.0, 1.0), 1.3);

    // 8) итоговый микс
    float mixFactor = clamp(slickMask * (0.6 + 0.4 * fresnel), 0.0, 1.0);
    vec3 color = mix(baseWater, oil, mixFactor);

    // 9) тонкий specular для мокрого блеска
    float spec = pow(clamp(1.0 - abs(q * 0.8 + f * 0.2), 0.0, 1.0), 6.0) * 0.12;
    color += spec;

    return color;
}

// -------------------- простая шейдинг-сфера --------------------
vec3 shadeSphere(vec3 p) {
    vec3 lightDir = normalize(vec3(-0.5, 0.6, -0.7));
    vec3 n = normalize(p - spherePos);
    float diff = max(dot(n, lightDir), 0.0);

    vec3 base = vec3(0.9, 0.75, 0.6);
    vec3 rim = vec3(0.2, 0.25, 0.35) * pow(1.0 - diff, 3.0);
    vec3 color = base * (0.2 + 0.8 * diff) + rim;

    // небольшой ambient
    color *= 0.9;
    return color;
}

// -------------------- raymarch --------------------
vec4 rayMarch(vec3 ro, vec3 rd) {
    float total = 0.0;

    for (int i = 0; i < MAX_DIST; i++) {
        vec3 p = ro + rd * total;
        float dSphere = mapSphere(p);
        float dWater = mapWater(p);
        float d = min(dSphere, dWater);

        total += d;
        if (d < EPSI) {
            if (dSphere < dWater) {
                // попали в сферу
                vec3 col = shadeSphere(p);
                return vec4(col, 1.0);
            } else {
                // попали в воду — применяем бензиновый эффект, не трогая форму волн
                vec3 base = benzineShade(p, iTime);

                // тонкое освещение по нормали для глубины/блеска
                vec3 n = getNormalWater(p);
                vec3 light = normalize(vec3(-0.5, 0.8, -0.6));
                float diffuse = max(dot(n, light), 0.0);
                float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0) * 0.2;

                vec3 finalCol = base * (0.6 + 0.4 * diffuse) + rim;
                return vec4(finalCol, 1.0);
            }
        }

        if (total > float(MAX_DIST)) break;
    }

    // ничего не попало → прозрачность/фон
    return vec4(0.0, 0.0, 0.0, 0.0);
}

// -------------------- main --------------------
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    vec4 col = rayMarch(ro, rd);

    // Если прозрачный (ничего не попало) — можно добавить фон, сейчас оставляем прозрачным
    fragColor = col;
}`;

  // Shader compilation
  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  
  if (!vs || !fs) return;
  
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  
  gl.useProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Fullscreen quad setup (CORRECTED)
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer); // FIXED: use ARRAY_BUFFER not ATTRIB_BUFFER
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');

  // Resize handling
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  
  window.addEventListener('resize', resize);
  resize();

  // Visibility handling
  let isPaused = false;
  let lastRenderTime = 0;
  const FPS = 50;
  const FRAME_INTERVAL = 1000 / FPS;
  const startTime = performance.now();

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  
  observer.observe(canvas);

  // Render loop
  function render(now) {
    if (isPaused) {
      requestAnimationFrame(render);
      return;
    }
    
    if (now - lastRenderTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }
    
    lastRenderTime = now;
    resize();
    
    const t = ((now - startTime) * 0.001) % 300;
    
    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);
    
    // Очистка с прозрачным фоном
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  
  requestAnimationFrame(render);
});








