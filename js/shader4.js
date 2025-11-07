// s/shader4.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("Canvas #shader-canvas4 не найден!");

  const gl = canvas4.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!gl) return console.error("WebGL2 не поддерживается");

  // ---------- FRAGMENT SHADER ----------
  const fragSource = `#version 300 es
  precision highp float;

  uniform vec3 iResolution;
  uniform float iTime;
  out vec4 fragColor;

  #define RESOLUTION iResolution
  #define TIME iTime
  #define PI 3.141592654
  #define TAU (2.0*PI)

  // hsv -> rgb
  vec3 hsv2rgb(vec3 c) {
    vec3 K = vec3(1.0, 2.0/3.0, 1.0/3.0);
    vec3 p = abs(fract(c.xxx + K) * 6.0 - vec3(3.0));
    return c.z * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), c.y);
  }

  vec4 alphaBlendVec4(vec4 back, vec4 front) {
    float outA = front.w + back.w * (1.0 - front.w);
    if (outA <= 0.0) return vec4(0.0);
    vec3 outRGB = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / outA;
    return vec4(outRGB, outA);
  }

  float hash(float n) { return fract(sin(n*12.9898)*43758.5453); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

  // бензиновая смесь цвета
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

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0 - 2.0*f);
    float a = hash(i + vec2(0.0,0.0));
    float b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0));
    float d = hash(i + vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  float hifbm(vec2 p) {
    float sum = 0.0;
    float amp = 1.0;
    float lacunarity = 2.0;
    for (int i=0;i<5;i++){
      sum += amp * vnoise(p);
      amp *= 0.5;
      p *= lacunarity;
    }
    return sum;
  }
  float hiheight(vec2 p){ return hifbm(p) - 1.8; }

  vec2 raySphere(vec3 ro, vec3 rd, vec4 sph) {
    vec3 oc = ro - sph.xyz;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - sph.w * sph.w;
    float h = b*b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }

  // слой
  vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n) {
    float zStable = floor(n * 37.0);
    vec2 p = (pp - off*2.0*vec3(1.0,1.0,0.0)).xy;
    const vec2 stp = vec2(0.5, 0.33);
    float he = hiheight(vec2(p.x, zStable) * stp);
    float d = p.y - he;
    float aa = distance(pp, npp)*sqrt(1.0/3.0);
    float t = smoothstep(aa, -aa, d);

    // бензиновый цвет
    vec3 col = oilMix(vec3(p*0.6, n*0.2), TIME*0.5);
    return vec4(col, clamp(t, 0.0, 1.0));
  }

  vec4 moon(vec3 ro, vec3 rd) {
    vec4 mdim = vec4(1.0e5 * vec3(0.0, 0.4, 1.0), 20000.0);
    vec3 mcol0 = hsv2rgb(vec3(0.75, 0.7, 1.0));
    vec2 md = raySphere(ro, rd, mdim);
    if (md.x < 0.0) return vec4(0.0);
    vec3 mpos = ro + rd * md.x;
    vec3 mnor = normalize(mpos - mdim.xyz);
    vec3 lpos = 1e6 * vec3(0.0, -0.15, 1.0);
    vec3 ldir = normalize(lpos);
    float mdif = max(dot(ldir, mnor), 0.0);
    float mf = smoothstep(0.0, 10000.0, md.y - md.x);
    vec3 col = mdif * mcol0 * 3.5;
    return vec4(col, clamp(mf, 0.0, 1.0));
  }

  vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p, out float outA) {
    vec2 np = p + 2.0 / RESOLUTION.y;
    vec3 rd  = normalize(p.x*uu + p.y*vv + 2.0*ww);
    vec3 nrd = normalize(np.x*uu + np.y*vv + 2.0*ww);
    const float planeDist = 1.0;
    const int furthest = 16;
    const int fadeFrom = 10;
    const float fadeDist = planeDist * float(fadeFrom);
    const float maxDist = planeDist * float(furthest);
    float nz = floor(ro.z / planeDist);
    vec4 accum = vec4(0.0);

    for (int i = 1; i <= furthest; ++i) {
      float pz = planeDist * nz + planeDist * float(i);
      float pd = (pz - ro.z) / rd.z;
      vec3 pp = ro + rd * pd;
      if (pp.y < 0.0 && pd > 0.0 && accum.w < 0.95) {
        vec3 npp = ro + nrd * pd;
        vec4 pcol = plane(ro, rd, pp, npp, vec3(0.0), nz + float(i));
        float fadeAlpha = smoothstep(maxDist*1.1, fadeDist*1.1, pd);
        pcol.w *= fadeAlpha;
        pcol = clamp(pcol, 0.0, 1.0);
        accum = alphaBlendVec4(accum, pcol);
      } else break;
    }

    vec4 m = moon(ro, rd);
    vec3 base = accum.xyz;
    float baseA = accum.w;
    vec3 finalRGB = mix(base, m.xyz, m.w);
    float finalA = max(baseA, m.w);
    outA = finalA;
    return finalRGB;
  }

  vec3 effect(vec2 p, out float outA) {
    float tm = TIME * 0.25;
    vec3 ro = vec3(0.0, 0.0, tm);
    vec3 dro = normalize(vec3(0.0, 0.09, 1.0));
    vec3 ww = normalize(dro);
    vec3 uu = normalize(cross(normalize(vec3(0.0,1.0,0.0)), ww));
    vec3 vv = normalize(cross(ww, uu));
    return color(ww, uu, vv, ro, p, outA);
  }

  void main() {
    vec2 q = gl_FragCoord.xy / RESOLUTION.xy;
    vec2 p = -1.0 + 2.0 * q;
    p.x *= RESOLUTION.x / RESOLUTION.y;
    float alpha;
    vec3 col = effect(p, alpha);
    fragColor = vec4(col, alpha);
  }`;

  const vertSource = `#version 300 es
  in vec4 aPosition;
  void main() { gl_Position = aPosition; }`;

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vertSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    return;
  }

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPosition");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl.getUniformLocation(prog, "iTime");

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (canvas4.width !== w || canvas4.height !== h) {
      canvas4.width = w;
      canvas4.height = h;
      canvas4.style.width = window.innerWidth + "px";
      canvas4.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  const startTime = performance.now();
  function render() {
    resize();
    const now = performance.now();
    const t = (now - startTime) * 0.001;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform3f(iResolutionLoc, canvas4.width, canvas4.height, 1.0);
    gl.uniform1f(iTimeLoc, t);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
