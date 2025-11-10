// js/shader5.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('shader-canvas5');
  if (!canvas) {
    console.error('shader5: canvas #shader-canvas5 not found');
    return;
  }

  const gl = canvas.getContext('webgl2', {
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    alpha: true,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    failIfMajorPerformanceCaveat: true
  });
  
  if (!gl) {
    console.error('shader5: WebGL2 not supported in this browser');
    return;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Vertex shader
  const vertexSrc = `#version 300 es
  precision mediump float;
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;
  
   // Fragment shader
  const fragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec3 iResolution;
uniform float iTime;

const int MAX_DIST = 300;
const float EPSI = 0.009;

// -------------------- ПЕРЕНОС ШУМОВ И FBM ИЗ TXT (для точного бензинового паттерна) --------------------
// Helper functions (mod289 / permute / taylorInvSqrt) и snoise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
{ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i); 
    vec4 p = 
        permute
        (
            permute
            ( 
                permute
                ( i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 )
        );

    vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));  // mod(p,7*7)

    vec4 x_ = floor(j * (1.0 / 7.0));
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,7)

    vec4 x = (x_ * (1.0 / 7.0)) - 0.5;
    vec4 y = (y_ * (1.0 / 7.0)) - 0.5;

    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww ;

    vec3 p0 = vec3(a0.x, a0.y, h.x);
    vec3 p1 = vec3(a0.z, a0.w, h.y);
    vec3 p2 = vec3(a1.x, a1.y, h.z);
    vec3 p3 = vec3(a1.z, a1.w, h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

// fbm4 (4 octaves) and fbm8 (8 octaves) — из оригинального файла
float fbm4(vec3 p, float theta, float f, float lac, float r)
{
    mat3 mtx = mat3(
        cos(theta), -sin(theta), 0.0,
        sin(theta), cos(theta), 0.0,
        0.0, 0.0, 1.0);

    float frequency = f;
    float lacunarity = lac;
    float roughness = r;
    float amp = 1.0;
    float total_amp = 0.0;

    float accum = 0.0;
    vec3 X = p * frequency;
    for(int i = 0; i < 4; i++)
    {
        accum += amp * snoise(X);
        X *= (lacunarity + (snoise(X) + 0.1) * 0.006);
        X = mtx * X;

        total_amp += amp;
        amp *= roughness;
    }

    return accum / total_amp;
}

float fbm8(vec3 p, float theta, float f, float lac, float r)
{
    mat3 mtx = mat3(
        cos(theta), -sin(theta), 0.0,
        sin(theta), cos(theta), 0.0,
        0.0, 0.0, 1.0);

    float frequency = f;
    float lacunarity = lac;
    float roughness = r;
    float amp = 1.0;
    float total_amp = 0.0;

    float accum = 0.0;
    vec3 X = p * frequency;
    for(int i = 0; i < 8; i++)
    {
        accum += amp * snoise(X);
        X *= (lacunarity + (snoise(X) + 0.1) * 0.006);
        X = mtx * X;

        total_amp += amp;
        amp *= roughness;
    }

    return accum / total_amp;
}

float turbulence(float val)
{
    float n = 1.0 - abs(val);
    return n * n;
}

// -------------------- pattern из TXT (точно как в примере) --------------------
float pattern(in vec3 p, inout vec3 q, inout vec3 r)
{
    q.x = fbm4( p + 0.0, 0.0, 1.0, 2.0, 0.33 );
    q.y = fbm4( p + 6.0, 0.0, 1.0, 2.0, 0.33 );

    r.x = fbm8( p + q - 2.4, 0.0, 1.0, 3.0, 0.5 );
    r.y = fbm8( p + q + 8.2, 0.0, 1.0, 3.0, 0.5 );

    q.x = turbulence( q.x );
    q.y = turbulence( q.y );

    float f = fbm4( p + (1.0 * r), 0.0, 1.0, 2.0, 0.5);

    return f;
}

// -------------------- scene mapping (твоя текущая логика волн/сферы) --------------------
vec3 spherePos = vec3(8.0, 6.0, 25.0);

float mapSphere(vec3 p) {
    return length(p - spherePos) - 1.0;
}

float mapWater(vec3 p) {
    // та же структура, просто волны выше (как в примере)
    float wave = octaves2D((p.xz / 30.0) + (iTime / 19.0) + sin(length(p.xz * 2.0)) * 0.04);
    return p.y + 8.0 + wave * 5.0;
}

// -------------------- шум octaves (твоя существующая функция) --------------------
float random(vec2 p) {
    return fract(sin(p.x * 431.0 + p.y * 707.0) * 7443.0);
}

float noise(vec2 uv) {
    vec2 id = floor(uv * 10.0);
    vec2 lc = smoothstep(0.0, 1.0, fract(uv * 10.0));
    float a = random(id);
    float b = random(id + vec2(1.0, 0.0));
    float c = random(id + vec2(0.0, 1.0));
    float d = random(id + vec2(1.0, 1.0));
    return mix(mix(a, b, lc.x), mix(c, d, lc.x), lc.y);
}

float octaves2D(vec2 uv) {
    float amp = 0.5;
    float f = 0.0;
    for (int i = 0; i < 4; i++) {
        f += noise(uv) * amp;
        uv *= 2.0;
        amp *= 0.5;
    }
    return f;
}

// -------------------- normals (для простого освещения) --------------------
vec3 getNormalWater(vec3 p) {
    float h = 0.02;
    float cx = mapWater(vec3(p.x + h, p.y, p.z)) - mapWater(vec3(p.x - h, p.y, p.z));
    float cz = mapWater(vec3(p.x, p.y, p.z + h)) - mapWater(vec3(p.x, p.y, p.z - h));
    vec3 n = normalize(vec3(cx, 2.0 * h, cz));
    return n;
}

// -------------------- ТЕПЕРЬ: бензиновый shade — именно 1:1 поведение из TXT --------------------
vec3 benzineShade(vec3 p, float t) {
    // Маппинг координат: берём p.xz как uv (аналогично uv в оригинальном примере),
    // применяем те же трансформации из .txt чтобы получить 1:1 визуальную динамику.
    vec2 uv = p.xz;
    // В оригинале uv = fragCoord/iResolution; uv -= 0.5; uv *= 3.5;
    // Чтобы воспроизвести тот же масштаб/шаблон на поверхности, применяем эквивалент:
    uv *= 0.035;      // масштаб — подобран чтобы соответствовать размеру паттерна с исходным uv*3.5
    uv -= 0.5 * 0.035; // центрирование (подгонка)
    uv *= 3.5;

    float tt = t * 0.1; // та же временная шкала, как в оригинале (iTime * 0.1)

    vec3 pp = vec3(uv.x, uv.y, tt);
    vec3 q = vec3(0.0);
    vec3 r = vec3(0.0);
    float f = pattern(pp, q, r);

    // та же палитра, что в txt
    vec3 spectrum[4];
    spectrum[0] = vec3(0.94, 0.02, 0.03);
    spectrum[1] = vec3(0.04, 0.04, 0.22);
    spectrum[2] = vec3(1.00, 0.80, 1.00);
    spectrum[3] = vec3(0.20, 0.40, 0.50);

    vec3 color = vec3(0.0);
    color = mix(spectrum[1], spectrum[3], pow(length(q), 4.0));
    color = mix(color, spectrum[0], pow(length(r), 1.4));
    color = mix(color, spectrum[2], f);

    color = pow(color, vec3(2.0));

    // Немного тонкой интеграции со светом/нормалью чтобы не ломать визуальную глубину
    // (но это не влияет на сам паттерн)
    return color;
}

// -------------------- простая шейдинг-сфера --------------------
vec3 shadeSphere(vec3 p) {
    vec3 lightDir = normalize(vec3(-0.5, 0.6, -0.7));
    vec3 n = normalize(p - spherePos);
    float diff = max(dot(n, lightDir), 0.0);

    vec3 base = vec3(0.9, 0.75, 0.6);
    vec3 rim = vec3(0.2, 0.25, 0.35) * pow(1.0 - diff, 3.0);
    vec3 color = base * (0.2 + 0.8 * diff) + rim;

    color *= 0.9;
    return color;
}

// -------------------- raymarch --------------------
vec4 rayMarch(vec3 ro, vec3 rd) {
    float total = 0.0;

    for (int i = 0; i < MAX_DIST; i++) {
        vec3 p = ro + rd * total;
        float dSphere = mapSphere(p);
        float dWater = mapWater(p);
        float d = min(dSphere, dWater);

        total += d;
        if (d < EPSI) {
            if (dSphere < dWater) {
                vec3 col = shadeSphere(p);
                return vec4(col, 1.0);
            } else {
                // вода -> применяем точный бензиновый паттерн (1:1)
                vec3 base = benzineShade(p, iTime);

                // тонкое освещение по нормали для глубины/блеска (не ломает паттерн)
                vec3 n = getNormalWater(p);
                vec3 light = normalize(vec3(-0.5, 0.8, -0.6));
                float diffuse = max(dot(n, light), 0.0);
                float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0) * 0.12;

                vec3 finalCol = base * (0.7 + 0.3 * diffuse) + rim;
                return vec4(finalCol, 1.0);
            }
        }

        if (total > float(MAX_DIST)) break;
    }

    return vec4(0.0, 0.0, 0.0, 0.0);
}

// -------------------- main --------------------
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    vec4 col = rayMarch(ro, rd);

    fragColor = col;
}`;


  // Shader compilation
  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  
  if (!vs || !fs) return;
  
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  
  gl.useProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Fullscreen quad setup (CORRECTED)
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer); // FIXED: use ARRAY_BUFFER not ATTRIB_BUFFER
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
  const iTimeLoc = gl.getUniformLocation(program, 'iTime');

  // Resize handling
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  
  window.addEventListener('resize', resize);
  resize();

  // Visibility handling
  let isPaused = false;
  let lastRenderTime = 0;
  const FPS = 50;
  const FRAME_INTERVAL = 1000 / FPS;
  const startTime = performance.now();

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
  });

  const observer = new IntersectionObserver((entries) => {
    isPaused = !entries[0].isIntersecting;
  }, { threshold: 0.05 });
  
  observer.observe(canvas);

  // Render loop
  function render(now) {
    if (isPaused) {
      requestAnimationFrame(render);
      return;
    }
    
    if (now - lastRenderTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }
    
    lastRenderTime = now;
    resize();
    
    const t = ((now - startTime) * 0.001) % 300;
    
    gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
    gl.uniform1f(iTimeLoc, t);
    
    // Очистка с прозрачным фоном
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  
  requestAnimationFrame(render);
});










