// s/shader4.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("Canvas #shader-canvas4 не найден!");

  const gl = canvas4.getContext("webgl2", {
    powerPreference: "high-performance",
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) return console.error("WebGL2 не поддерживается");

  // ====================== ШЕЙДЕР ======================
  const fragShaderSource = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;

out vec4 fragColor;

// === Константы ===
#define PI 3.141592654
#define TAU (2.0 * PI)

// === Утилиты ===
float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash(i + vec2(0.0,0.0));
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  float m0 = mix(a, b, u.x);
  float m1 = mix(c, d, u.x);
  return mix(m0, m1, u.y);
}

// === Цвет ===
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.,2./3.,1./3.)) * 6.0 - vec3(3.));
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

// === Пересечение луча со сферой (луна) ===
vec2 raySphere(vec3 ro, vec3 rd, vec4 sph) {
  vec3 oc = ro - sph.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - sph.w*sph.w;
  float h = b*b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

// === Слои, приближающиеся к камере ===
float planePattern(vec3 p) {
  return vnoise(p.xz * 0.3 + iTime * 0.05);
}

vec4 plane(vec3 ro, vec3 rd, vec3 pos) {
  float n = planePattern(pos);
  float fade = exp(-0.15 * (pos.z - ro.z));
  vec3 col = hsv2rgb(vec3(0.6 + 0.2*sin(iTime*0.1), 0.7, 1.0)) * fade * (0.3 + n);
  return vec4(col, smoothstep(0.0, 1.0, fade) * 0.8);
}

// === Луна ===
vec4 moon(vec3 ro, vec3 rd) {
  const vec4 sphere = vec4(0.0, 0.4, 2.5, 0.35);
  const vec3 lightDir = normalize(vec3(0.0, -0.1, 1.0));
  vec2 t = raySphere(ro, rd, sphere);
  if (t.x < 0.0) return vec4(0.0);
  vec3 pos = ro + rd * t.x;
  vec3 nor = normalize(pos - sphere.xyz);
  float diff = max(dot(nor, lightDir), 0.0);
  vec3 baseCol = hsv2rgb(vec3(0.66, 0.4, 1.0));
  vec3 col = baseCol * (0.5 + diff);
  return vec4(col, 1.0);
}

// === Главный цвет ===
vec3 render(vec2 uv) {
  vec2 p = uv;
  p.x *= iResolution.x / iResolution.y;

  vec3 ro = vec3(0.0, 0.0, -1.0);
  vec3 rd = normalize(vec3(p, 1.5));

  vec3 col = vec3(0.0);
  
  // Прозрачное небо
  vec4 sky = vec4(0.0, 0.0, 0.0, 0.0);

  // Луна
  vec4 moonCol = moon(ro, rd);
  col += moonCol.rgb * moonCol.a;

  // Несколько слоёв
  for (int i = 1; i <= 8; ++i) {
    float depth = float(i) * 0.6;
    vec3 pos = ro + rd * depth;
    vec4 pcol = plane(ro, rd, pos);
    col += pcol.rgb * pcol.a * (1.0 - moonCol.a * 0.4);
  }

  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
  vec3 col = render(uv);
  fragColor = vec4(col, 1.0);
}
`;

  // ====================== КОМПИЛЯЦИЯ ======================
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vsSource = `#version 300 es
  in vec4 aPosition;
  void main() {
    gl_Position = aPosition;
  }`;

  const vertShader = compileShader(gl.VERTEX_SHADER, vsSource);
  const fragShader = compileShader(gl.FRAGMENT_SHADER, fragShaderSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(program));

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(program);
  const iResolutionLoc = gl.getUniformLocation(program, "iResolution");
  const iTimeLoc = gl.getUniformLocation(program, "iTime");

  // ====================== РЕНДЕР ======================
  function resize() {
    const w = canvas4.clientWidth;
    const h = canvas4.clientHeight;
    if (canvas4.width !== w || canvas4.height !== h) {
      canvas4.width = w;
      canvas4.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  let startTime = performance.now();

  function renderFrame() {
    resize();
    const now = performance.now();
    const time = (now - startTime) * 0.001;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform3f(iResolutionLoc, canvas4.width, canvas4.height, 1.0);
    gl.uniform1f(iTimeLoc, time);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(renderFrame);
  }

  renderFrame();
});
