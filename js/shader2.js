document.addEventListener('DOMContentLoaded', () => {

  const canvas2 = document.getElementById('shader-canvas2');
  if (!canvas2) {
    console.error('Canvas #shader-canvas2 не найден!');
    return;
  }

  const gl2 = canvas2.getContext('webgl2');
  if (!gl2) {
    console.error('WebGL2 не поддерживается для второго шейдера.');
    return;
  }

  function resize() {
    canvas2.width = window.innerWidth;
    canvas2.height = window.innerHeight;
    gl2.viewport(0, 0, gl2.drawingBufferWidth, gl2.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- ВЕРШИННЫЙ ШЕЙДЕР ----------
  const vertexSrc2 = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  // ---------- ФРАГМЕНТНЫЙ ШЕЙДЕР ----------
  const fragmentSrc2 = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec3 iResolution;
  uniform float iTime;

  // === ГЕНЕРАТОР СЛУЧАЙНОСТИ ===
  float rand(vec2 p) {
      float t = floor(iTime * 20.0) / 10.0;
      return fract(sin(dot(p, vec2(t * 12.9898, t * 78.233))) * 43758.5453);
  }

  float noise(vec2 uv, float blockiness) {   
      vec2 lv = fract(uv);
      vec2 id = floor(uv);
      
      float n1 = rand(id);
      float n2 = rand(id + vec2(1,0));
      float n3 = rand(id + vec2(0,1));
      float n4 = rand(id + vec2(1,1));
      
      vec2 u = smoothstep(0.0, 1.0 + blockiness, lv);
      return mix(mix(n1, n2, u.x), mix(n3, n4, u.x), u.y);
  }

  float fbm(vec2 uv, int count, float blockiness, float complexity) {
      float val = 0.0;
      float amp = 0.5;
      while(count != 0) {
          val += amp * noise(uv + (rand(ceil(uv * 3.0) / 3.0) * 2.0 + 
               (float(floor(iTime * 20.0) / 10.0) / float(count)) - 1.0), blockiness);
          amp *= 0.5;
          uv *= complexity;    
          count--;
      }
      return val;
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      vec2 uv2 = uv;
      
      uv *= 5.0;
      uv.x *= fbm(uv, 2, 3.0, 1.0);
      
      float noiseVal = smoothstep(0.5, 1.0, fbm(uv, 2, 3.0, 1.5));
      
      // 💜💚💙💗 неоновые глитчи
      vec3 glitchColor = mix(
          vec3(1.0, 0.0, 1.0),   // пурпурный
          vec3(0.0, 1.0, 0.58),  // зелёный
          rand(uv * 10.0)
      );
      glitchColor = mix(glitchColor, vec3(0.0, 1.0, 1.0), rand(uv * 20.0));
      glitchColor = mix(glitchColor, vec3(1.0, 0.4, 0.8), rand(uv * 30.0));

      float alpha = smoothstep(0.25, 0.35, noiseVal); // прозрачность глитча
      fragColor = vec4(glitchColor, alpha * 0.4); // лёгкие, прозрачные вспышки
  }

  void main() {
      vec4 col;
      mainImage(col, gl_FragCoord.xy);
      fragColor = col;
  }`;

  // ---------- КОМПИЛЯЦИЯ ----------
  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs2 = compileShader(gl2, gl2.VERTEX_SHADER, vertexSrc2);
  const fs2 = compileShader(gl2, gl2.FRAGMENT_SHADER, fragmentSrc2);
  const program2 = gl2.createProgram();
  gl2.attachShader(program2, vs2);
  gl2.attachShader(program2, fs2);
  gl2.linkProgram(program2);
  if (!gl2.getProgramParameter(program2, gl2.LINK_STATUS)) {
    console.error(gl2.getProgramInfoLog(program2));
    return;
  }
  gl2.useProgram(program2);

  // ---------- ПОЛИГОН ----------
  const quad2 = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, quad2);
  gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(0);
  gl2.vertexAttribPointer(0, 2, gl2.FLOAT, false, 0, 0);

  // ---------- UNIFORMS ----------
  const iResolutionLoc2 = gl2.getUniformLocation(program2, 'iResolution');
  const iTimeLoc2 = gl2.getUniformLocation(program2, 'iTime');

  let start = performance.now();

  function render() {
    resize();
    const t = (performance.now() - start) * 0.001;
    gl2.uniform3f(iResolutionLoc2, canvas2.width, canvas2.height, 1.0);
    gl2.uniform1f(iTimeLoc2, t);
    gl2.clear(gl2.COLOR_BUFFER_BIT);
    gl2.drawArrays(gl2.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
