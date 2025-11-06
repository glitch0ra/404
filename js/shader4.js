// assets/js/shader4.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas4 = document.getElementById('shader-canvas4');
  if (!canvas4) return console.error('❌ Canvas #shader-canvas4 не найден!');
  const gl4 = canvas4.getContext('webgl2', { alpha: true });
  if (!gl4) return console.error('❌ WebGL2 не поддерживается.');

  /*───────────────────────
    Размеры и viewport
  ───────────────────────*/
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas4.width = window.innerWidth * dpr;
    canvas4.height = window.innerHeight * dpr;
    gl4.viewport(0, 0, gl4.drawingBufferWidth, gl4.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  gl4.enable(gl4.BLEND);
  gl4.blendFunc(gl4.SRC_ALPHA, gl4.ONE_MINUS_SRC_ALPHA);

  /*───────────────────────
    GLSL: Neonwave Sunrise
  ───────────────────────*/
  const vertexSrc = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  #define RESOLUTION iResolution
  #define TIME iTime
  #define PI 3.141592654
  #define TAU (2.0 * PI)

  // HSV → RGB
  const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
  }
  #define HSV2RGB(c) (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

  float tanh_approx(float x) {
    float x2 = x * x;
    return clamp(x * (27.0 + x2) / (27.0 + 9.0 * x2), -1.0, 1.0);
  }
  float hash(float co) { return fract(sin(co * 12.9898) * 13758.5453); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  // Value noise
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float hifbm(vec2 p) {
    float sum = 0.0, amp = 1.0;
    for (int i = 0; i < 5; ++i) {
      sum += amp * vnoise(p);
      amp *= 0.5;
      p *= 2.0;
    }
    return sum;
  }

  float lofbm(vec2 p) {
    float sum = 0.0, amp = 1.0;
    for (int i = 0; i < 2; ++i) {
      sum += amp * vnoise(p);
      amp *= 0.5;
      p *= 2.0;
    }
    return sum;
  }

  float hiheight(vec2 p) { return hifbm(p) - 1.8; }
  float loheight(vec2 p) { return lofbm(p) - 2.15; }

  vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n) {
    float h = hash(n);
    vec2 p = (pp - off * 2.0 * vec3(1.0, 1.0, 0.0)).xy;
    const vec2 stp = vec2(0.5, 0.33);
    float he = hiheight(vec2(p.x, pp.z) * stp);
    float lohe = loheight(vec2(p.x, pp.z) * stp);
    float d = p.y - he;
    float lod = p.y - lohe;
    float aa = distance(pp, npp) * sqrt(1.0 / 3.0);
    float t = smoothstep(aa, -aa, d);
    float df = exp(-0.1 * (distance(ro, pp) - 2.));
    vec3 acol = hsv2rgb(vec3(mix(0.9, 0.6, df), 0.9, mix(1.0, 0.0, df)));
    vec3 gcol = hsv2rgb(vec3(0.6, 0.5, tanh_approx(exp(-mix(2.0, 8.0, df) * lod))));
    vec3 col = acol + 0.5 * gcol;
    return vec4(col, t);
  }

  vec3 toSpherical(vec3 p) {
    float r = length(p);
    float t = acos(p.z / r);
    float ph = atan(p.y, p.x);
    return vec3(r, t, ph);
  }

  const vec3 ldir = normalize(vec3(0., -0.15, 1.0));

  vec4 moon(vec3 ro, vec3 rd) {
    const vec4 mdim = vec4(1E5 * vec3(0., 0.4, 1.0), 20000.0);
    const vec3 mcol0 = HSV2RGB(vec3(0.75, 0.7, 1.0));
    vec2 md = vec2(-1.0);
    vec3 oc = ro - mdim.xyz;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - mdim.w * mdim.w;
    float h = b*b - c;
    if (h < 0.0) return vec4(0.0);
    h = sqrt(h);
    float t = -b - h;
    vec3 mpos = ro + rd * t;
    vec3 mnor = normalize(mpos - mdim.xyz);
    float mdif = max(dot(ldir, mnor), 0.0);
    float mf = smoothstep(0.0, 10000.0, 2.0 * h);
    vec3 col = mdif * mcol0 * 4.0;
    return vec4(col, mf);
  }

  vec3 skyColor(vec3 ro, vec3 rd) {
    const vec3 acol = HSV2RGB(vec3(0.6, 0.9, 0.075));
    const vec3 lcol = HSV2RGB(vec3(0.75, 0.8, 1.0));
    vec2 sp = toSpherical(rd.xzy).yz;
    float lf = pow(max(dot(ldir, rd), 0.0), 80.0);
    float li = 0.02 * mix(1.0, 10.0, lf) / (abs((rd.y + 0.055)) + 0.025);
    float lz = step(-0.055, rd.y);
    vec4 mcol = moon(ro, rd);
    vec3 col = vec3(0.0);
    col = mix(col, mcol.xyz, mcol.w);
    col += smoothstep(-0.4, 0.0, (sp.x - PI * 0.5)) * acol;
    col += tanh(lcol * li);
    return col;
  }

  vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
    vec3 rd = normalize(p.x * uu + p.y * vv + 2.0 * ww);
    const float planeDist = 1.0;
    const int furthest = 12;
    const int fadeFrom = furthest - 2;
    const float fadeDist = planeDist * float(fadeFrom);
    const float maxDist = planeDist * float(furthest);
    float nz = floor(ro.z / planeDist);
    vec3 skyCol = skyColor(ro, rd);
    vec4 acol = vec4(0.0);
    for (int i = 1; i <= furthest; ++i) {
      float pz = planeDist * nz + planeDist * float(i);
      float pd = (pz - ro.z) / rd.z;
      vec3 pp = ro + rd * pd;
      if (pp.y < 0. && pd > 0.0 && acol.w < 0.95) {
        vec3 npp = ro + rd * (pd + 0.01);
        vec4 pcol = plane(ro, rd, pp, npp, vec3(0.0), nz + float(i));
        float fadeIn = smoothstep(maxDist, fadeDist, pd);
        pcol.xyz = mix(skyCol, pcol.xyz, fadeIn);
        acol = mix(acol, pcol, pcol.w);
      }
    }
    return mix(skyCol, acol.xyz, acol.w);
  }

  vec3 effect(vec2 p, vec2 q) {
    float tm = TIME * 0.25;
    vec3 ro = vec3(0.0, 0.0, tm);
    vec3 dro = normalize(vec3(0.0, 0.09, 1.0));
    vec3 ww = normalize(dro);
    vec3 uu = normalize(cross(normalize(vec3(0.0, 1.0, 0.0)), ww));
    vec3 vv = normalize(cross(ww, uu));
    return color(ww, uu, vv, ro, p);
  }

  vec3 aces_approx(vec3 v) {
    v = max(v, 0.0);
    v *= 0.6;
    float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((v * (a*v + b)) / (v * (c*v + d) + e), 0.0, 1.0);
  }
  float sRGB(float t) { return mix(1.055 * pow(t, 1.0 / 2.4) - 0.055, 12.92 * t, step(t, 0.0031308)); }
  vec3 sRGB(vec3 c) { return vec3(sRGB(c.x), sRGB(c.y), sRGB(c.z)); }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 q = fragCoord / RESOLUTION.xy;
    vec2 p = -1.0 + 2.0 * q;
    p.x *= RESOLUTION.x / RESOLUTION.y;
    vec3 col = effect(p, q);
    col *= smoothstep(0.0, 8.0, TIME - abs(q.y));
    col = aces_approx(col);
    col = sRGB(col);
    fragColor = vec4(col, length(col) > 0.001 ? 1.0 : 0.0); // ✅ прозрачный фон
  }

  void main() {
    vec4 c;
    mainImage(c, gl_FragCoord.xy);
    fragColor = c;
  }`;

  /*───────────────────────
    Компиляция и рендер
  ───────────────────────*/
  function compileShader(type, src) {
    const shader = gl4.createShader(type);
    gl4.shaderSource(shader, src);
    gl4.compileShader(shader);
    if (!gl4.getShaderParameter(shader, gl4.COMPILE_STATUS)) {
      console.error(gl4.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl4.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl4.FRAGMENT_SHADER, fragmentSrc);
  const prog = gl4.createProgram();
  gl4.attachShader(prog, vs);
  gl4.attachShader(prog, fs);
  gl4.linkProgram(prog);
  if (!gl4.getProgramParameter(prog, gl4.LINK_STATUS))
    return console.error(gl4.getProgramInfoLog(prog));
  gl4.useProgram(prog);

  const quad = gl4.createBuffer();
  gl4.bindBuffer(gl4.ARRAY_BUFFER, quad);
  gl4.bufferData(gl4.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1,  1, 1, -1, 1,  1
  ]), gl4.STATIC_DRAW);
  gl4.enableVertexAttribArray(0);
  gl4.vertexAttribPointer(0, 2, gl4.FLOAT, false, 0, 0);

  const iResolutionLoc = gl4.getUniformLocation(prog, 'iResolution');
  const iTimeLoc = gl4.getUniformLocation(prog, 'iTime');

  let start = performance.now();
  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl4.clearColor(0, 0, 0, 0);
    gl4.clear(gl4.COLOR_BUFFER_BIT);
    gl4.uniform3f(iResolutionLoc, canvas4.width, canvas4.height, 1.0);
    gl4.uniform1f(iTimeLoc, t);
    gl4.drawArrays(gl4.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
