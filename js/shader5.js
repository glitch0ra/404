// js/shader5.js
(() => {
  const canvas = document.getElementById('shader-canvas5');
  if (!canvas) {
    console.error('shader5: canvas #shader-canvas5 not found');
    return;
  }

  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) {
    console.error('shader5: WebGL2 not supported in this browser');
    return;
  }

  // Vertex shader (fullscreen triangle)
  const vertSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    // convert fullscreen triangle coords to uv 0..1
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  // Fragment shader: adapted from user's code, GLSL 300 es
  const fragSrc = `#version 300 es
  precision highp float;
  precision highp int;

  in vec2 v_uv;
  out vec4 fragColor;

  // Uniforms (names preserved from your original shader)
  uniform vec3 iResolution; // viewport resolution (in pixels)
  uniform float iTime; // shader playback time (in seconds)
  uniform float iTimeDelta;
  uniform float iFrameRate;
  uniform int iFrame;
  uniform float iChannelTime[4];
  uniform vec3 iChannelResolution[4];
  uniform vec4 iMouse;
  uniform sampler2D iChannel0;
  uniform vec4 iDate;

  const int MAX_DIST = 300;
  const float EPSI = 0.009;

  float random(vec2 p){
    return fract(sin(p.x*431. + p.y*707.) * 7443.);
  }

  float noise(vec2 uv){
    vec2 id = floor(uv*10.0);
    vec2 lc = smoothstep(0.0, 1.0, fract(uv*10.0));
    float a = random(id);
    float b = random(id + vec2(1.0,0.0));
    float c = random(id + vec2(0.0,1.0));
    float d = random(id + vec2(1.0,1.0));
    float ud = mix(a, b, lc.x);
    float lr = mix(c, d, lc.x);
    float fin = mix(ud, lr, lc.y);
    return fin;
  }

  float octaves(vec2 uv){
    float amp = 0.5;
    float f = 0.0;
    // 4 octaves like original (i from 1 to 4)
    for(int i = 0; i < 4; i++){
      f += noise(uv) * amp;
      uv *= 2.0;
      amp *= 0.5;
    }
    return f;
  }

  float SDF(vec3 p){
    vec3 spherePos = vec3(8.0, 6.0, 25.0);
    float sphere = length(p - spherePos) - 1.0;
    float water = p.y + 8.0 + octaves((p.xz / 30.0) + (iTime / 10.0) + sin(length(p.xz * 2.0)) * 0.04);
    float mindst = min(water, sphere);
    return mindst;
  }

  float rayMarcher(vec3 ro, vec3 rd){
    float tot = 0.0;
    for(int i = 0; i < MAX_DIST; i++){
      vec3 p = ro + rd * tot;
      float diff = SDF(p);
      tot += diff;
      if(diff < EPSI || tot > float(MAX_DIST)){
        // return normalized hit distance (0..1)
        return float(i) / float(MAX_DIST);
      }
    }
    return 1.0;
  }

  void mainImage(out vec4 outColor, in vec2 fragCoord){
    // fragCoord in pixels
    vec2 uvp = fragCoord;
    vec2 uv = (uvp - 0.5 * iResolution.xy) / iResolution.x;
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    vec3 col = vec3(rayMarcher(ro, rd));
    outColor = vec4(col, 1.0);
  }

  void main() {
    // fragCoord in pixels
    vec2 fragCoord = v_uv * iResolution.xy;
    vec4 color;
    mainImage(color, fragCoord);
    fragColor = color;
  }`;

  // helpers: compile shader/link program
  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Shader compile error: ' + msg);
    }
    return s;
  }

  function createProgram(vsSrc, fsSrc) {
    const vs = compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = compileShader(fsSrc, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error('Program link error: ' + msg);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  let program;
  try {
    program = createProgram(vertSrc, fragSrc);
  } catch (e) {
    console.error('shader5: failed to create program:', e);
    return;
  }

  // attribute / vao setup (fullscreen triangle)
  const posLoc = gl.getAttribLocation(program, 'a_position');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Fullscreen triangle (3 vertices)
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  const positions = new Float32Array([
    -1, -1,
     3, -1,
    -1,  3
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // uniform locations
  const u_iResolution = gl.getUniformLocation(program, 'iResolution');
  const u_iTime = gl.getUniformLocation(program, 'iTime');
  const u_iTimeDelta = gl.getUniformLocation(program, 'iTimeDelta');
  const u_iFrameRate = gl.getUniformLocation(program, 'iFrameRate');
  const u_iFrame = gl.getUniformLocation(program, 'iFrame');
  const u_iMouse = gl.getUniformLocation(program, 'iMouse');
  const u_iDate = gl.getUniformLocation(program, 'iDate');
  const u_iChannel0 = gl.getUniformLocation(program, 'iChannel0');

  // create a tiny 1x1 texture for iChannel0 (so sampler is valid)
  const tex0 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1,1,0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // resize logic
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // keep CSS to make canvas full-screen if it's supposed to:
  // If canvas style uses width:100% height:100% it'll match page styling.
  // Ensure canvas sizing initially
  const style = getComputedStyle(canvas);
  if (style.width === '0px' || style.height === '0px') {
    // if not sized in CSS, set to window size
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  resize();
  window.addEventListener('resize', resize);

  // animation loop
  let start = performance.now();
  let last = start;
  let frame = 0;

  function render(now) {
    now = now || performance.now();
    const t = (now - start) / 1000;
    const dt = (now - last) / 1000;
    last = now;

    resize();

    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    // bind channel0 to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    gl.uniform1i(u_iChannel0, 0);

    // set uniforms
    gl.uniform3f(u_iResolution, canvas.width, canvas.height, 1.0);
    if (u_iTime) gl.uniform1f(u_iTime, t);
    if (u_iTimeDelta) gl.uniform1f(u_iTimeDelta, dt);
    if (u_iFrameRate) gl.uniform1f(u_iFrameRate, 60.0);
    if (u_iFrame) gl.uniform1i(u_iFrame, frame);
    if (u_iMouse) gl.uniform4f(u_iMouse, 0.0, 0.0, 0.0, 0.0);
    if (u_iDate) {
      const d = new Date();
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const seconds = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
      gl.uniform4f(u_iDate, year, month, day, seconds);
    }

    // draw fullscreen triangle (3 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
    gl.useProgram(null);

    frame++;
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

})();
