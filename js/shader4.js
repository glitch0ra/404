// assets/js/shader4.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("❌ Canvas #shader-canvas4 не найден!");

  const gl4 = canvas4.getContext("webgl2", {
    powerPreference: "high-performance",
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl4) return alert("Ваш браузер не поддерживает WebGL2");

  // resize
  function resize() {
    canvas4.width = window.innerWidth;
    canvas4.height = window.innerHeight;
    gl4.viewport(0, 0, gl4.drawingBufferWidth, gl4.drawingBufferHeight);
  }
  window.addEventListener("resize", resize);
  resize();

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
  #define TAU (2.0*PI)

  const vec4 hsv2rgb_K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
  }
  #define HSV2RGB(c) (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

  float tanh_approx(float x) {
    float x2 = x*x;
    return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
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

  float hifbm(vec2 p){
    float sum=0.,a=1.;
    for(int i=0;i<5;i++){sum+=a*vnoise(p);a*=.5;p*=2.;}
    return sum;
  }
  float lofbm(vec2 p){
    float sum=0.,a=1.;
    for(int i=0;i<2;i++){sum+=a*vnoise(p);a*=.5;p*=2.;}
    return sum;
  }
  float hiheight(vec2 p){return hifbm(p)-1.8;}
  float loheight(vec2 p){return lofbm(p)-2.15;}

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

  // simplified stars (less weight to avoid green bias)
  vec3 stars(vec2 sp) {
    const vec3 scol0 = HSV2RGB(vec3(0.85, 0.8, 1.0));
    const vec3 scol1 = HSV2RGB(vec3(0.65, 0.5, 1.0));
    vec3 col = vec3(0.0);
    for(float i=0.; i<6.; i++){
      vec2 pp=sp+0.5*i;
      float s=i/5.;
      vec2 dim=vec2(mix(0.05,0.003,s)*PI);
      vec2 np = mod(pp,dim)-0.5*dim;
      vec2 h = vec2(hash(np+127.0+i), hash(np+37.0+i));
      vec2 o = -1.0+2.0*h;
      pp += o*dim*0.5;
      float l = length(pp);
      float w = exp(-mix(2000.0,6000.0,s)*max(l-0.001,0.0));
      vec3 scol = mix(scol0, scol1, h.x*h.x) * (0.6 + 0.4*s) * (0.6 + 0.4*h.y);
      col += w * scol;
    }
    return col;
  }

  vec3 skyColor(vec3 ro, vec3 rd) {
    const vec3 acol = HSV2RGB(vec3(0.6, 0.9, 0.075));
    const vec3 lcol = HSV2RGB(vec3(0.75, 0.8, 1.0));
    vec2 sp = vec2(atan(rd.y, rd.x), acos(rd.z));
    float lf = pow(max(dot(normalize(vec3(0., -0.15, 1.0)), rd), 0.0), 80.0);
    float li = 0.02*mix(1.0,10.0,lf)/(abs((rd.y+0.055))+0.025);
    vec3 col = stars(sp)*smoothstep(0.5,0.0,li)*0.9; // slightly reduced weight (fix tint)
    col += smoothstep(-0.4, 0.0, (sp.x - PI*0.5))*acol*0.9;
    col += tanh(lcol*li)*0.6;
    return col;
  }

  vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p){
    float lp = length(p);
    vec3 rd = normalize(p.x*uu + p.y*vv + 2.0*ww);
    const float planeDist=1.0;
    const int furthest=12;
    const int fadeFrom=max(furthest-2,0);
    const float fadeDist=planeDist*float(fadeFrom);
    const float maxDist=planeDist*float(furthest);
    float nz=floor(ro.z/planeDist);
    vec3 skyCol=skyColor(ro,rd);
    vec4 acol=vec4(0.0);
    for(int i=1;i<=furthest;i++){
      float pz=planeDist*nz+planeDist*float(i);
      float pd=(pz-ro.z)/rd.z;
      vec3 pp=ro+rd*pd;
      if(pp.y<0.&&pd>0.0&&acol.w<0.95){
        vec3 npp=ro+rd*pd;
        vec4 pcol=plane(ro,rd,pp,npp,vec3(0.0),nz+float(i));
        float fadeIn=smoothstep(maxDist,fadeDist,pd);
        pcol.xyz = mix(skyCol, pcol.xyz, fadeIn);
        acol = mix(acol, vec4(pcol.xyz,1.0), pcol.w);
      }
    }
    return mix(skyCol, acol.rgb, acol.w);
  }

  // volumetric sphere (simple, screen-space) and sun glow
  vec3 renderSun(vec2 q, out float sunMask) {
    // horizon center (small bright point)
    vec2 centerH = vec2(0.5, 0.5); // horizon center in uv
    float d = distance(q, centerH);
    float sun = exp(-d * 80.0) * 1.6; // tight bright spot
    float halo = exp(-d * 18.0) * 0.45; // softer halo
    sunMask = clamp(sun + halo, 0.0, 1.0);
    // color warm neon-ish
    vec3 sunCol = hsv2rgb(vec3(0.05, 0.9, 1.0)) * (1.0 + 0.6 * halo);
    return sunCol * sunMask;
  }

  vec3 renderSphere(vec2 q, out float sphereMask) {
    // sphere positioned above horizon, centered slightly up
    vec2 sphCenter = vec2(0.5, 0.28); // tweak vertical position here
    float radius = 0.12; // visual radius
    float r = distance(q, sphCenter);
    if (r > radius) { sphereMask = 0.0; return vec3(0.0); }
    float nr = r / radius;
    // normal of sphere in screen-space
    float z = sqrt(max(0.0, 1.0 - nr*nr));
    vec3 n = normalize(vec3((q - sphCenter)/radius, z));
    vec3 lightDir = normalize(vec3(0.0, -0.15, 1.0));
    float lam = clamp(dot(n, lightDir), 0.0, 1.0);
    // subtle specular
    vec3 view = vec3(0.0, 0.0, 1.0);
    vec3 halfv = normalize(lightDir + view);
    float spec = pow(max(dot(n, halfv), 0.0), 60.0) * 0.9;
    // base color (use neon palette via hsv2rgb)
    vec3 base = hsv2rgb(vec3(0.72 + 0.02*sin(TIME*0.6), 0.8, 1.0)); // bluish-pinkish shift
    vec3 col = base * (0.4 + 1.2 * lam) + vec3(1.0) * spec * 0.7;
    // soft rim
    float rim = pow(1.0 - max(0.0, dot(n, view)), 2.0);
    col += hsv2rgb(vec3(0.95, 0.9, 1.0)) * rim * 0.25;
    // mask with smooth edge
    sphereMask = smoothstep(radius, radius * 0.88, r) * 1.0;
    return col * sphereMask;
  }

  vec3 aces_approx(vec3 v){
    v = max(v,0.0);
    v *= 0.6;
    return clamp((v*(2.51*v+0.03))/(v*(2.43*v+0.59)+0.14), 0.0, 1.0);
  }
  float sRGB(float t){return mix(1.055*pow(t,1./2.4)-0.055,12.92*t,step(t,0.0031308));}
  vec3 sRGB(vec3 c){return vec3(sRGB(c.x),sRGB(c.y),sRGB(c.z));}

  void main() {
    vec2 q = gl_FragCoord.xy / RESOLUTION.xy;       // 0..1 uv
    vec2 p = -1.0 + 2.0 * q;
    p.x *= RESOLUTION.x / RESOLUTION.y;

    // main scene (static camera effect)
    vec3 col = effect(p, q);

    // add sun (horizon bright spot)
    float sunMask = 0.0;
    vec3 sunCol = renderSun(q, sunMask);
    col += sunCol;

    // add volumetric sphere in sky
    float sphereMask = 0.0;
    vec3 sphereCol = renderSphere(q, sphereMask);
    col += sphereCol;

    // tone mapping
    col = aces_approx(col);
    col = sRGB(col);

    // alpha logic:
    // bgAlpha = transparency of sky above horizon (we want top transparent).
    // keep sun/sphere opaque by lifting alpha where they exist.
    float bgAlpha = smoothstep(0.60, 0.42, q.y); // tweak falloff here
    float objAlpha = max(sunMask, sphereMask);
    float alpha = max(bgAlpha, objAlpha);

    // final
    fragColor = vec4(col, alpha);
  }`;

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
  const program = gl4.createProgram();
  gl4.attachShader(program, vs);
  gl4.attachShader(program, fs);
  gl4.linkProgram(program);
  if (!gl4.getProgramParameter(program, gl4.LINK_STATUS)) {
    console.error(gl4.getProgramInfoLog(program));
    return;
  }
  gl4.useProgram(program);

  const quad = gl4.createBuffer();
  gl4.bindBuffer(gl4.ARRAY_BUFFER, quad);
  gl4.bufferData(gl4.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl4.STATIC_DRAW);
  gl4.enableVertexAttribArray(0);
  gl4.vertexAttribPointer(0, 2, gl4.FLOAT, false, 0, 0);

  const iResolutionLoc = gl4.getUniformLocation(program, "iResolution");
  const iTimeLoc = gl4.getUniformLocation(program, "iTime");

  let start = performance.now();
  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl4.uniform3f(iResolutionLoc, canvas4.width, canvas4.height, 1.0);
    gl4.uniform1f(iTimeLoc, t);
    // clear to transparent
    gl4.clearColor(0, 0, 0, 0);
    gl4.clear(gl4.COLOR_BUFFER_BIT);
    gl4.drawArrays(gl4.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
