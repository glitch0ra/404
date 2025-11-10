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
    for(int i = 0; i < 4; i++) {
      f += noise(uv) * amp;
      uv *= 2.0;
      amp *= 0.5;
    }
    return f;
  }
  
  float SDF(vec3 p) {
    vec3 spherePos = vec3(8.0, 6.0, 25.0);
    float sphere = length(p - spherePos) - 1.0;
    float water = p.y + 8.0 + octaves((p.xz / 30.0) + (iTime / 10.0) + sin(length(p.xz * 2.0)) * 0.04);
    return min(water, sphere);
  }
  
  float rayMarcher(vec3 ro, vec3 rd) {
    float tot = 0.0;
    for(int i = 0; i < MAX_DIST; i++) {
      vec3 p = ro + rd * tot;
      float diff = SDF(p);
      tot += diff;
      if(diff < EPSI || tot > float(MAX_DIST)) {
        return float(i) / float(MAX_DIST);
      }
    }
    return 1.0;
  }
  
  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    float hit = rayMarcher(ro, rd);
    fragColor = vec4(vec3(hit), 1.0);
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
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
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
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  
  requestAnimationFrame(render);
});
