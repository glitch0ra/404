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

#define PI 3.14159265
#define TAU (2.0*PI)

// ────────────── HSV → RGB ──────────────
vec3 hsv2rgb(vec3 c) {
  vec3 K = vec3(1.0, 2.0/3.0, 1.0/3.0);
  vec3 p = abs(fract(c.xxx + K) * 6.0 - vec3(3.0));
  return c.z * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), c.y);
}

// ────────────── Смешивание слоёв ──────────────
vec4 alphaBlendVec4(vec4 back, vec4 front) {
  float outA = front.w + back.w * (1.0 - front.w);
  if (outA <= 0.0) return vec4(0.0);
  vec3 outRGB = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / outA;
  return vec4(outRGB, outA);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

// ────────────── Перелив (бензин) ──────────────
vec3 oilMix(vec3 p, float t) {
  vec3 c1 = vec3(1.0, 0.2, 0.9);
  vec3 c2 = vec3(0.0, 1.0, 0.7);
  vec3 c3 = vec3(0.3, 0.7, 1.0);
  vec3 c4 = vec3(1.0, 0.8, 0.2);
  float n1 = sin(p.x * 0.45 + p.y * 0.35 + t * 2.8);
  float n2 = cos(p.y * 0.4 - p.z * 0.3 + t * 3.2);
  float n3 = sin(p.z * 0.55 + p.x * 0.25 - t * 2.6);
  float n4 = cos(p.x * 0.25 + p.y * 0.6 + t * 2.2);
  vec3 mixcol = c1 * (0.5 + 0.5*n1) + c2 * (0.5 + 0.5*n2) + c3 * (0.5 + 0.5*n3) + c4 * (0.5 + 0.5*n4);
  return normalize(mixcol);
}

// ────────────── Нойз ──────────────
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

float fbm(vec2 p) {
  float s = 0.0;
  float a = 1.0;
  for (int i=0;i<4;i++) {
    s += a * vnoise(p);
    a *= 0.5;
    p *= 2.0;
  }
  return s;
}

// ────────────── Плоскость ──────────────
vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, float layerIndex, float maxLayer) {
  vec2 p = pp.xy;
  float height = fbm(p * 0.5 + layerIndex*0.3);
  float d = p.y - height;
  float aa = distance(pp, npp)*0.6;
  float t = smoothstep(aa, -aa, d);

  // бензиновая текстура
  vec3 oil = oilMix(vec3(p*0.6, layerIndex*0.2), iTime*0.5);

  // свет и тени в зависимости от расстояния
  float depthFactor = layerIndex / maxLayer;
  float shadow = smoothstep(0.0, 1.0, fbm(p*0.8 + iTime*0.1));
  float darkness = mix(0.4, 1.2, 1.0 - depthFactor); // ближе — темнее
  float bottomLight = pow(max(0.0, -pp.y * 0.4), 2.0) * (1.0 - depthFactor); // подсветка снизу

  vec3 col = oil * darkness + bottomLight * vec3(0.9, 0.7, 1.0) * 0.7;
  col *= mix(0.7, 1.1, shadow);
  return vec4(col, t);
}

// ────────────── Основной цвет ──────────────
vec3 color(vec3 ro, vec3 rd, out float outA) {
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
      vec3 npp = ro + rd * (pd + 0.01);
      vec4 pcol = plane(ro, rd, pp, npp, float(i), float(furthest));
      float fadeAlpha = smoothstep(maxDist*1.1, fadeDist*1.1, pd);
      pcol.w *= fadeAlpha;
      accum = alphaBlendVec4(accum, pcol);
    } else break;
  }

  outA = accum.w;
  return accum.xyz;
}

// ────────────── Камера ──────────────
void main() {
  vec2 q = gl_FragCoord.xy / iResolution.xy;
  vec2 p = -1.0 + 2.0 * q;
  p.x *= iResolution.x / iResolution.y;

  vec3 ro = vec3(0.0, 0.0, iTime*0.25);
  vec3 ww = normalize(vec3(0.0, 0.1, 1.0));
  vec3 uu = normalize(cross(vec3(0.0,1.0,0.0), ww));
  vec3 vv = cross(ww, uu);

  vec3 rd = normalize(p.x*uu + p.y*vv + 2.0*ww);

  float alpha;
  vec3 col = color(ro, rd, alpha);
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

