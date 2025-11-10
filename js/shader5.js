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

  
const vertexSrc = `#version 300 es
in vec4 a_position;
void main() {
    gl_Position = a_position;
}`;
  
  // Vertex shader
  const fragmentSrc = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec3 iResolution;
uniform float iTime;

const int MAX_DIST = 300;
const float EPSI = 0.009;

// --- Сфера ---
vec3 spherePos = vec3(8.0, 6.0, 25.0);

float mapSphere(vec3 p) {
    return length(p - spherePos) - 1.0;
}

vec3 shade(vec3 p, float t) {
    // Чёрная сфера
    return vec3(0.0);
}

vec4 rayMarch(vec3 ro, vec3 rd) {
    float total = 0.0;
    for (int i = 0; i < MAX_DIST; i++) {
        vec3 p = ro + rd * total;
        float dSphere = mapSphere(p);
        total += dSphere;
        if (dSphere < EPSI) {
            // Возвращаем непрозрачную чёрную сферу
            return vec4(shade(p, float(i) / float(MAX_DIST)), 1.0);
        }
        if (total > float(MAX_DIST)) break;
    }
    // Прозрачный фон
    return vec4(0.0, 0.0, 0.0, 0.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    vec4 col = rayMarch(ro, rd);
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

