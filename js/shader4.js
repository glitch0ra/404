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
#define TAU (2.0 * PI)

// hsv -> rgb
vec3 hsv2rgb(vec3 c) {
  vec3 K = vec3(1.0, 2.0/3.0, 1.0/3.0);
  vec3 p = abs(fract(c.xxx + K) * 6.0 - vec3(3.0));
  return c.z * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), c.y);
}

// ray-sphere intersection (returns t0,t1 or -1.0 if miss)
vec2 raySphere(vec3 ro, vec3 rd, vec4 sph) {
  vec3 oc = ro - sph.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - sph.w * sph.w;
  float h = b*b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

// ==== Moon / Jupiter implementation ====
vec4 moon(vec3 ro, vec3 rd) {
  // Параметры сферы (в оригинале использовались большие значения)
  vec4 sph = vec4(1.0e5 * vec3(0.0, 0.4, 1.0), 20000.0);
  vec2 hit = raySphere(ro, rd, sph);
  if (hit.x < 0.0) return vec4(0.0);

  vec3 pos = ro + rd * hit.x;
  vec3 nrm = normalize(pos - sph.xyz);

  // Сферические координаты -> UV
  float lon = atan(nrm.z, nrm.x);
  float lat = asin(nrm.y);
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, lat / PI + 0.5);
  uv = vec2(uv.y, 1.0 - uv.x); // ориентация как в оригинале

  // Процедурный узор "Юпитера" (упрощённая, но сохраняющая характер)
  float time = iTime;
  float timeScale = 0.5;
  vec2 zoom = vec2(20.0, 5.5);
  vec2 offset = vec2(2.0, 1.0);
  vec2 point = uv * zoom + offset;

  float a_x = 0.2;
  float a_y = 0.3;
  for (int i = 1; i < 10; i++) {
    float fi = float(i);
    point.x += a_x * sin(fi * point.y + time * timeScale);
    point.y += a_y * cos(fi * point.x + time * 0.2);
  }
  float r = cos(point.x + point.y + 2.0) * 0.5 + 0.5;
  float g = sin(point.x + point.y + 2.2) * 0.5 + 0.5;
  float b = (sin(point.x + point.y + 1.0) + cos(point.x + point.y + 1.5)) * 0.5 + 0.5;
  vec3 jupColor = vec3(r, g, b) + 0.5;

  // Освещение / атмосфера (приближённо как в исходнике)
  float lightBase = clamp(nrm.x * 0.6 + 0.4, 0.0, 1.0);
  float light = pow(lightBase, 1.7) * 0.5 + 0.1;
  float lightAtmos = pow(clamp(nrm.x, 0.0, 1.0), 2.0);
  vec3 surfaceColor = jupColor * light;
  vec3 atmosphereColor = vec3(0.7, 0.6, 0.5);
  float fresnel = pow(1.0 - clamp(dot(nrm, -rd), 0.0, 1.0), 3.0);
  vec3 fresnelMix = mix(surfaceColor, atmosphereColor, fresnel * lightAtmos * 0.8);

  vec3 col = fresnelMix * 1.5; // усиление яркости как в оригинале
  float alpha = smoothstep(0.0, 10000.0, hit.y - hit.x);

  return vec4(col, alpha);
}

// effect: только камера и сфера (без слоёв)
vec3 effect(vec2 p, out float outA) {
  float tm = TIME * 0.25;
  vec3 ro = vec3(0.0, 0.0, tm);
  vec3 dro = normalize(vec3(0.0, 0.09, 1.0));
  vec3 ww = normalize(dro);
  vec3 uu = normalize(cross(normalize(vec3(0.0,1.0,0.0)), ww));
  vec3 vv = normalize(cross(ww, uu));

  vec3 rd = normalize(p.x * uu + p.y * vv + 2.0 * ww);
  vec4 m = moon(ro, rd);

  outA = m.w;
  return m.xyz;
}

void main() {
  vec2 q = gl_FragCoord.xy / RESOLUTION.xy;
  vec2 p = -1.0 + 2.0 * q;
  p.x *= RESOLUTION.x / RESOLUTION.y;
  float alpha;
  vec3 col = effect(p, alpha);

  // Прозрачность вне сферы — 0, внутри — alpha из moon()
  fragColor = vec4(col, alpha);
}`;

  // ---------- VERTEX SHADER ----------
  const vertSource = `#version 300 es
in vec4 aPosition;
void main() {
  gl_Position = aPosition;
}`;

  // ---------- compile helpers ----------
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

  // ---------- setup a fullscreen triangle/quad ----------
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(prog, "aPosition");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const iResolutionLoc = gl.getUniformLocation(prog, "iResolution");
  const iTimeLoc = gl.getUniformLocation(prog, "iTime");

  // ---------- resize (DPI aware) ----------
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

  // ---------- render loop ----------
  const startTime = performance.now();
  function render() {
    resize();
    const now = performance.now();
    const t = (now - startTime) * 0.001;

    // clear with alpha = 0 so underlying DOM shows through
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
