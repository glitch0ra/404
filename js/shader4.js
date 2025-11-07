// s/shader4.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("Canvas #shader-canvas4 не найден!");

  const gl4 = canvas4.getContext("webgl2", {
    powerPreference: "high-performance",
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl4) return console.error("WebGL2 не поддерживается");

  /*──────────────────── Шейдер ────────────────────*/
  const fragSrc = `#version 300 es
  precision highp float;

  uniform vec3 iResolution;
  uniform float iTime;
  out vec4 fragColor;

  #define RESOLUTION iResolution
  #define TIME iTime
  #define PI 3.141592654
  #define TAU (2.0*PI)

  const vec4 hsv2rgb_K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
  }

  vec4 alphaBlend(vec4 back, vec4 front) {
    float w = front.w + back.w*(1.0-front.w);
    vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.0-front.w))/w;
    return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
  }

  float tanh_approx(float x) {
    float x2 = x*x;
    return clamp(x*(27.0 + x2)/(27.0 + 9.0*x2), -1.0, 1.0);
  }

  float hash(float co) { return fract(sin(co*12.9898) * 13758.5453); }
  float hash(vec2 p) { float a = dot(p, vec2(127.1, 311.7)); return fract(sin(a)*43758.5453123); }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash(i + vec2(0.0,0.0));
    float b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0));
    float d = hash(i + vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  float hifbm(vec2 p) {
    const float aa = 0.5;
    const float pp = 2.0;
    float sum = 0.0;
    float a = 1.0;
    for (int i=0;i<5;++i){ sum+=a*vnoise(p); a*=aa; p*=pp; }
    return sum;
  }
  float lofbm(vec2 p) {
    const float aa = 0.5;
    const float pp = 2.0;
    float sum = 0.0;
    float a = 1.0;
    for (int i=0;i<2;++i){ sum+=a*vnoise(p); a*=aa; p*=pp; }
    return sum;
  }
  float hiheight(vec2 p){ return hifbm(p)-1.8; }
  float loheight(vec2 p){ return lofbm(p)-2.15; }

  vec2 raySphere(vec3 ro, vec3 rd, vec4 sph) {
    vec3 oc = ro - sph.xyz;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - sph.w*sph.w;
    float h = b*b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }

  // ==== ПЛОСКОСТИ ====
  vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n) {
    float h = hash(n);
    vec2 p = (pp - off*2.0*vec3(1.0,1.0,0.0)).xy;
    const vec2 stp = vec2(0.5, 0.33);
    float he = hiheight(vec2(p.x, pp.z)*stp);
    float lohe = loheight(vec2(p.x, pp.z)*stp);
    float d = p.y - he;
    float lod = p.y - lohe;
    float aa = distance(pp, npp)*sqrt(1.0/3.0);
    float t = smoothstep(aa, -aa, d);
    float df = exp(-0.1*(distance(ro, pp)-2.));
    vec3 acol = hsv2rgb(vec3(mix(0.9, 0.6, df), 0.9, mix(1.0, 0.0, df)));
    vec3 gcol = hsv2rgb(vec3(0.6, 0.5, tanh_approx(exp(-mix(2.0, 8.0, df)*lod))));
    vec3 col = acol + 0.5*gcol;
    return vec4(col, t);
  }

  // ==== ЛУНА ====
  const vec3 lpos = 1E6*vec3(0., -0.15, 1.0);
  const vec3 ldir = normalize(lpos);

  vec4 moon(vec3 ro, vec3 rd) {
    const vec4 mdim = vec4(1E5*vec3(0., 0.4, 1.0), 20000.0);
    const vec3 mcol0 = hsv2rgb(vec3(0.75, 0.7, 1.0));
    vec2 md = raySphere(ro, rd, mdim);
    if (md.x < 0.0) return vec4(0.0);
    vec3 mpos = ro + rd*md.x;
    vec3 mnor = normalize(mpos-mdim.xyz);
    float mdif = max(dot(ldir, mnor), 0.0);
    float mf = smoothstep(0.0, 10000.0, md.y - md.x);
    vec3 col = mdif*mcol0*3.5;
    return vec4(col, mf);
  }

  // ==== ОСНОВНОЙ РЕНДЕР ====
  vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
    vec2 np = p + 2.0/RESOLUTION.y;
    vec3 rd = normalize(p.x*uu + p.y*vv + 2.0*ww);
    vec3 nrd = normalize(np.x*uu + np.y*vv + 2.0*ww);

    const float planeDist = 1.0;
    const int furthest = 12;
    const int fadeFrom = max(furthest-2, 0);
    const float fadeDist = planeDist*float(fadeFrom);
    const float maxDist = planeDist*float(furthest);
    float nz = floor(ro.z / planeDist);

    vec4 acol = vec4(0.0);
    const float cutOff = 0.95;

    for (int i = 1; i <= furthest; ++i) {
      float pz = planeDist*nz + planeDist*float(i);
      float pd = (pz - ro.z)/rd.z;
      vec3 pp = ro + rd*pd;
      if (pp.y < 0. && pd > 0.0 && acol.w < cutOff) {
        vec3 npp = ro + nrd*pd;
        vec3 off = vec3(0.0);
        vec4 pcol = plane(ro, rd, pp, npp, off, nz+float(i));
        float fadeIn = smoothstep(maxDist, fadeDist, pd);
        pcol.xyz = mix(vec3(0.0), pcol.xyz, fadeIn);
        pcol = clamp(pcol, 0.0, 1.0);
        acol = alphaBlend(pcol, acol);
      } else break;
    }

    vec4 mcol = moon(ro, rd);
    vec3 col = alphaBlend(acol.xyz, vec4(mcol.xyz, mcol.w));
    return col;
  }

  vec3 effect(vec2 p) {
    float tm = TIME*0.25;
    vec3 ro = vec3(0.0, 0.0, tm);
    vec3 dro= normalize(vec3(0.0, 0.09, 1.0));
    vec3 ww = normalize(dro);
    vec3 uu = normalize(cross(normalize(vec3(0.0,1.0,0.0)), ww));
    vec3 vv = normalize(cross(ww, uu));
    return color(ww, uu, vv, ro, p);
  }

  void main() {
    vec2 q = gl_FragCoord.xy / RESOLUTION.xy;
    vec2 p = -1. + 2. * q;
    p.x *= RESOLUTION.x/RESOLUTION.y;
    vec3 col = effect(p);
    fragColor = vec4(col, 1.0);
  }`;

  /*──────────────────── Компиляция ────────────────────*/
  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(shader));
    return shader;
  }

  const vs = compileShader(gl4, gl4.VERTEX_SHADER, `#version 300 es
    in vec4 aPosition;
    void main(){ gl_Position = aPosition; }
  `);
  const fs = compileShader(gl4, gl4.FRAGMENT_SHADER, fragSrc);
  const prog = gl4.createProgram();
  gl4.attachShader(prog, vs);
  gl4.attachShader(prog, fs);
  gl4.linkProgram(prog);
  if (!gl4.getProgramParameter(prog, gl4.LINK_STATUS))
    console.error(gl4.getProgramInfoLog(prog));

  const buf = gl4.createBuffer();
  gl4.bindBuffer(gl4.ARRAY_BUFFER, buf);
  gl4.bufferData(gl4.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1,1, 1,-1, 1,1
  ]), gl4.STATIC_DRAW);

  const posLoc = gl4.getAttribLocation(prog, "aPosition");
  gl4.enableVertexAttribArray(posLoc);
  gl4.vertexAttribPointer(posLoc, 2, gl4.FLOAT, false, 0, 0);

  const resLoc = gl4.getUniformLocation(prog, "iResolution");
  const timeLoc = gl4.getUniformLocation(prog, "iTime");

  /*──────────────────── Рендер ────────────────────*/
  let startTime = performance.now();
  const resolutionScale = 1.0;

  function resize() {
    const dpr = window.devicePixelRatio * resolutionScale;
    canvas4.width = window.innerWidth * dpr;
    canvas4.height = window.innerHeight * dpr;
    gl4.viewport(0, 0, canvas4.width, canvas4.height);
  }

  window.addEventListener("resize", resize);
  resize();

  function render() {
    const time = (performance.now() - startTime) * 0.001;
    gl4.clearColor(0, 0, 0, 0);
    gl4.clear(gl4.COLOR_BUFFER_BIT);
    gl4.useProgram(prog);
    gl4.uniform3f(resLoc, canvas4.width, canvas4.height, 1.0);
    gl4.uniform1f(timeLoc, time);
    gl4.drawArrays(gl4.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  render();
});
