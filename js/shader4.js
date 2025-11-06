// s/shader4.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("Canvas #shader-canvas4 не найден!");

  const gl = canvas4.getContext("webgl2", {
    powerPreference: "high-performance",
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false
  });
  if (!gl) return console.error("WebGL2 не поддерживается.");

  // Адаптивное масштабирование
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas4.width = w * dpr;
    canvas4.height = h * dpr;
    canvas4.style.width = w + "px";
    canvas4.style.height = h + "px";
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener("resize", resize);
  resize();

  // Вершинный шейдер
  const vertexShaderSource = `#version 300 es
  precision highp float;
  in vec2 aPosition;
  out vec2 vUV;
  void main() {
    vUV = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }`;

  // Фрагментный шейдер (без iChannel0/audio)
  const fragmentShaderSource = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;

  #define RESOLUTION    iResolution
  #define TIME          iTime
  #define PI            3.141592654
  #define TAU           (2.0*PI)

  const vec4 hsv2rgb_K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 hsv2rgb(vec3 c){
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
  }

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash(i+vec2(0.0,0.0));
    float b = hash(i+vec2(1.0,0.0));
    float c = hash(i+vec2(0.0,1.0));
    float d = hash(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  vec3 stars(vec2 sp){
    vec3 col = vec3(0.0);
    for(float i=0.0;i<6.0;i++){
      vec2 h = vec2(hash(sp+127.0+i), hash(sp+311.0+i));
      float s = i/5.0;
      vec2 dim = vec2(mix(0.05,0.003,s)*PI);
      vec2 pp = mod(sp+0.5*i, dim);
      float l = length(pp);
      col += exp(-4000.0*l)*mix(vec3(0.7,0.8,1.0), vec3(1.0,0.7,0.9), h.x);
    }
    return col;
  }

  vec3 skyColor(vec3 ro, vec3 rd){
    vec3 ldir = normalize(vec3(0.0,-0.2,1.0));
    vec3 base = hsv2rgb(vec3(0.6,0.9,0.15));
    float li = pow(max(dot(ldir,rd),0.0),50.0);
    vec3 col = stars(rd.xy*TAU)*0.5;
    col += base * (0.3 + li);
    return col;
  }

  vec3 effect(vec2 p){
    vec3 ro = vec3(0.0, 0.0, TIME*0.25);
    vec3 rd = normalize(vec3(p, 1.5));
    vec3 col = skyColor(ro, rd);
    return col;
  }

  void main(){
    vec2 q = gl_FragCoord.xy / RESOLUTION.xy;
    vec2 p = -1.0 + 2.0*q;
    p.x *= RESOLUTION.x/RESOLUTION.y;
    vec3 col = effect(p);
    fragColor = vec4(pow(col, vec3(0.4545)), 1.0);
  }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(shader));
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertexShaderSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(program));

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1, 1,   1, -1,   1, 1
  ]);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const iResolution = gl.getUniformLocation(program, "iResolution");
  const iTime = gl.getUniformLocation(program, "iTime");

  function render(t) {
    gl.uniform3f(iResolution, gl.drawingBufferWidth, gl.drawingBufferHeight, 1.0);
    gl.uniform1f(iTime, t * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
