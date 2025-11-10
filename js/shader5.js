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

vec3 spherePos = vec3(8.0, 6.0, 25.0);

float mapSphere(vec3 p) {
  return length(p - spherePos) - 1.0;
}

float mapWater(vec3 p) {
  float wave = octaves((p.xz / 30.0) + (iTime / 19.0) + sin(length(p.xz * 2.0)) * 0.04);
  return p.y + 8.0 + wave * 5.0;
}

// === бензиновая иридисценция поверх воды ===
vec3 iridescent(vec2 uv, float t) {
  // лёгкий многочастотный шум для переливов
  float n = octaves(uv * 1.5 + t * 0.05);
  float angle = sin(uv.x * 4.0 + n * 6.283 + t * 0.2)
              + cos(uv.y * 3.0 - n * 3.141 + t * 0.3);
  angle = fract(angle * 0.25 + n * 0.75);

  // базовая палитра бензина
  vec3 c1 = vec3(0.0, 0.9, 1.0);   // #00e5ff
  vec3 c2 = vec3(1.0, 0.0, 0.82);  // #ff00d0
  vec3 c3 = vec3(0.45, 0.0, 1.0);  // #7300ff
  vec3 c4 = vec3(0.0, 1.0, 0.5);   // #00ff80

  // локальное чередование в зависимости от угла
  vec3 col;
  if (angle < 0.25) col = mix(c1, c2, smoothstep(0.0, 0.25, angle));
  else if (angle < 0.5) col = mix(c2, c3, smoothstep(0.25, 0.5, angle));
  else if (angle < 0.75) col = mix(c3, c4, smoothstep(0.5, 0.75, angle));
  else col = mix(c4, c1, smoothstep(0.75, 1.0, angle));

  // насыщенность низкая, эффект поверх чёрной воды
  return col * 0.25;
}

vec3 shade(vec3 p, float t) {
  // чёрная база по глубине
  vec3 base = vec3(pow(1.0 - t, 2.0));
  // добавляем мягкий бензиновый слой
  vec3 oil = iridescent(p.xz * 0.15, iTime);
  return base + oil;
}

vec4 rayMarch(vec3 ro, vec3 rd) {
  float total = 0.0;
  float hitType = 0.0;
  for (int i = 0; i < MAX_DIST; i++) {
    vec3 p = ro + rd * total;
    float dSphere = mapSphere(p);
    float dWater = mapWater(p);
    float d = min(dSphere, dWater);
    total += d;
    if (d < EPSI) {
      hitType = (dSphere < dWater) ? 2.0 : 1.0;
      vec3 col = shade(p, float(i) / float(MAX_DIST));
      // если сфера — чистая без перелива
      if (hitType > 1.5) col = vec3(float(i) / float(MAX_DIST));
      return vec4(col, 1.0);
    }
    if (total > float(MAX_DIST)) break;
  }
  return vec4(0.0, 0.0, 0.0, 0.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
  vec3 ro = vec3(0.0, 0.0, -8.0);
  vec3 rd = normalize(vec3(uv, 1.0));
  vec4 col = rayMarch(ro, rd);

  float fade = smoothstep(0.235, 0.52, gl_FragCoord.y / iResolution.y);
  float brightness = dot(col.rgb, vec3(0.333));
  if (brightness < 0.6) col.a *= 1.0 - fade;

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





