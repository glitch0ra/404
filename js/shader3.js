// assets/js/shader3.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas3 = document.getElementById("shader-canvas3");
  if (!canvas3) return console.error("Canvas #shader-canvas3 не найден!");

  const gl = canvas3.getContext("webgl2", {
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
  });
  if (!gl) return console.error("WebGL2 не поддерживается.");

  // Размер под окно
  const resize = () => {
    const w = canvas3.clientWidth;
    const h = canvas3.clientHeight;
    if (canvas3.width !== w || canvas3.height !== h) {
      canvas3.width = w;
      canvas3.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  window.addEventListener("resize", resize);
  resize();

  // === GLSL ===
  const vertexSrc = `#version 300 es
  precision highp float;
  in vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }`;

  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;
  uniform sampler2D iChannel0;
  #define GRID 150.0

  void mainImage(out vec4 fragColor, in vec2 fragCoord)
  {
      vec2 grid = floor(fragCoord / iResolution.x * GRID) / (GRID - 1.0);
      float t = grid.y;
      grid += vec2(1.0);
      
      float speed = sin(grid.x*532.116 + cos(grid.x*sin(grid.x*221.215)*731.55)*114.124)*0.4 + 0.6;
      speed *= 0.5;
      
      t += sin((grid.x + cos(grid.x*15.0))*22.121)*123.324;
      t += speed * iTime / (GRID - 1.0);
      t *= 0.02 * GRID;
      float q = sin(grid.x*252.249 + cos(grid.x*sin(grid.x*112.139)*13.11)*55.1) * 1.0 + 2.0;
      float count = floor(t / q);
      t = mod(t, q);
      if (t > 1.0 || t < 0.0) t = 1.0;
      
      vec3 col = mix(vec3(0.235,0.784,0.235), vec3(1.0), pow(1.0 - t, 25.0)) * pow(1.0 - t, 3.0);
      
      vec2 uv = mod(fragCoord / iResolution.x * GRID, vec2(1.0));
      float seed = sin(grid.x * cos(grid.y*21952.1112 + count*11.195 + grid.x*592.111)*92.221 +
                       sin(grid.x*592.5429*cos(grid.y*259.6 + count*23.223))) * 0.5 + 0.5;
      float random_letter = min(floor(seed * 256.0), 255.0);
      vec2 random_letter_uv = vec2(uv.x + floor(random_letter / 16.0),
                                   uv.y + mod(random_letter, 16.0)) * 64.0;
      
      vec4 letter_mask = texelFetch(iChannel0, ivec2(random_letter_uv), 0);
      float mask = 1.0 - step(0.5, letter_mask.a);
      float f = max(1.0 - 500.0 * t, 0.0) * 0.35;
      if (mask == 0.0 && f != 0.0) mask += smoothstep(0.5 + f, 0.5, pow(letter_mask.a, 0.5)) * 2.0;
      col *= mask;
      
      fragColor = vec4(col, 1.0);
  }

  void main() {
    mainImage(fragColor, gl_FragCoord.xy);
  }`;

  // === Компиляция ===
  const compile = (src, type) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };

  const vs = compile(vertexSrc, gl.VERTEX_SHADER);
  const fs = compile(fragmentSrc, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // === Буфер квадрата ===
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
  ]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, "aPosition");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // === Текстура ===
  const tex = gl.createTexture();
  const img = new Image();
  img.src = "/assets/texture01.png"; // путь тот же
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(prog, "iChannel0"), 0);
    render();
  };

  // === Отрисовка ===
  function render() {
    resize();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.uniform3f(gl.getUniformLocation(prog, "iResolution"), canvas3.width, canvas3.height, 1.0);
    gl.uniform1f(gl.getUniformLocation(prog, "iTime"), performance.now() * 0.001);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
});
