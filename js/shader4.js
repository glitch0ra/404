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
#define RESOLUTION iResolution
#define TIME iTime
#define PI 3.141592654
#define TAU (2.0*PI)

const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash(i + vec2(0.0,0.0));
    float b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0));
    float d = hash(i + vec2(1.0,1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec4 alphaBlend(vec4 back, vec4 front) {
    float w = front.w + back.w*(1.0-front.w);
    vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.0-front.w))/max(w, 1e-6);
    return vec4(xyz, w);
}
vec3 alphaBlend(vec3 back, vec4 front) {
    return mix(back, front.xyz, front.w);
}

float tanh_approx(float x){
    float x2=x*x;
    return clamp(x*(27.0+x2)/(27.0+9.0*x2),-1.0,1.0);
}

float hiheight(vec2 p){return vnoise(p*0.5)-1.8;}
float loheight(vec2 p){return vnoise(p*0.33)-2.15;}

vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n){
    float h = hash(vec2(n, n*13.37));
    float df = exp(-0.1*(distance(ro, pp)-2.));
    vec3 acol = hsv2rgb(vec3(mix(0.9, 0.6, df), 0.9, mix(1.0, 0.0, df)));
    vec3 gcol = hsv2rgb(vec3(0.6, 0.5, tanh_approx(exp(-mix(2.0, 8.0, df)*pp.y))));
    vec3 col = acol + 0.5*gcol;
    float alpha = smoothstep(0.0, 0.1, -pp.y);
    return vec4(col, alpha);
}

vec3 skyColor(vec3 ro, vec3 rd){
    vec3 acol = hsv2rgb(vec3(0.6, 0.9, 0.075));
    return mix(vec3(0.0), acol, smoothstep(-0.4, 0.0, rd.y));
}

// === новый depth blur ===
vec3 applyDepthBlur(vec3 color, vec2 uv, float depth) {
    float blur = smoothstep(0.7, 1.0, depth); // чем дальше, тем сильнее
    float s = blur * 0.003; // сила размытия
    vec3 c = color;
    for (int j = 0; j < 4; ++j) {
        vec2 dir = vec2(cos(PI*0.5*j), sin(PI*0.5*j));
        float n = vnoise(uv*50.0 + float(j)*13.37);
        c += color * (0.25 + n*0.25) * exp(-depth*2.0);
    }
    return mix(color, c * 0.25, blur);
}
// === конец depth blur ===

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p){
    vec3 rd = normalize(p.x*uu + p.y*vv + 2.0*ww);
    const float planeDist = 1.0;
    const int furthest = 12;
    float nz = floor(ro.z / planeDist);
    vec3 skyCol = skyColor(ro, rd);
    vec4 acol = vec4(0.0);
    const float cutOff = 0.95;

    for (int i = 1; i <= furthest; ++i){
        float pz = planeDist*nz + planeDist*float(i);
        float pd = (pz - ro.z)/rd.z;
        vec3 pp = ro + rd*pd;
        if (pp.y < 0. && pd > 0.0 && acol.w < cutOff){
            vec3 npp = ro + rd*pd;
            vec4 pcol = plane(ro, rd, pp, npp, vec3(0.0), nz+float(i));

            // — размытие дальних слоёв 9–12 —
            if (i >= 9) {
                float depthNorm = float(i) / float(furthest);
                pcol.rgb = applyDepthBlur(pcol.rgb, pp.xz, depthNorm);
            }

            float fadeIn = smoothstep(float(furthest)*planeDist, planeDist*float(furthest-3), pd);
            pcol.rgb = mix(skyCol, pcol.rgb, fadeIn);
            acol = alphaBlend(pcol, acol);
        }
    }

    vec3 col = alphaBlend(skyCol, acol);
    return col;
}

vec3 effect(vec2 p){
    float tm = TIME*0.25;
    vec3 ro = vec3(0.0, 0.0, tm);
    vec3 dro = normalize(vec3(0.0, 0.09, 1.0));
    vec3 ww = normalize(dro);
    vec3 uu = normalize(cross(vec3(0.0,1.0,0.0), ww));
    vec3 vv = normalize(cross(ww, uu));
    return color(ww, uu, vv, ro, p);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 q = fragCoord / RESOLUTION.xy;
    vec2 p = -1.0 + 2.0*q;
    p.x *= RESOLUTION.x / RESOLUTION.y;
    vec3 col = effect(p);
    fragColor = vec4(col, 1.0);
}`;

  // ---------- VERTEX SHADER ----------
  const vertSource = `#version 300 es
  in vec4 aPosition;
  void main() {
    gl_Position = aPosition;
  }`;

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vertSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
  if (!vs || !fs) return;

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
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPosition");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl.getUniformLocation(prog, "iTime");

  const resolutionScale = 1.0;
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1) * resolutionScale;
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

