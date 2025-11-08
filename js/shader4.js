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

// hsv -> rgb (safe, no const-assignment issues)
vec3 hsv2rgb(vec3 c) {
    vec3 K = vec3(1.0, 2.0/3.0, 1.0/3.0);
    vec3 p = abs(fract(c.xxx + K) * 6.0 - vec3(3.0));
    return c.z * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), c.y);
}

// alpha blend: back(vec4), front(vec4)
vec4 alphaBlendVec4(vec4 back, vec4 front) {
    float outA = front.w + back.w * (1.0 - front.w);
    if (outA <= 0.0) return vec4(0.0);
    vec3 outRGB = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / outA;
    return vec4(outRGB, outA);
}

// alpha blend: back(vec3), front(vec4) -> returns vec4
vec4 alphaBlendVec3Vec4(vec3 back, vec4 front) {
    vec3 outRGB = mix(back, front.xyz, front.w);
    float outA = front.w + 0.0 * (1.0 - front.w);
    return vec4(outRGB, outA);
}

float tanh_approx(float x) {
    float x2 = x*x;
    return clamp(x*(27.0 + x2)/(27.0 + 9.0*x2), -1.0, 1.0);
}

// hashes / noise
float hash(float n) { return fract(sin(n*12.9898)*43758.5453); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

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
    float sum = 0.0; float amp = 1.0; float lacunarity = 2.0;
    for (int i=0;i<5;i++){
        sum += amp * vnoise(p);
        amp *= 0.5; p *= lacunarity;
    }
    return sum;
}

float lofbm(vec2 p) {
    float sum = 0.0; float amp = 1.0; float lacunarity = 2.0;
    for (int i=0;i<2;i++){
        sum += amp * vnoise(p);
        amp *= 0.5; p *= lacunarity;
    }
    return sum;
}

float hiheight(vec2 p){ return hifbm(p) - 1.8; }
float loheight(vec2 p){ return lofbm(p) - 2.15; }

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

// Jupiter shader implementation from the provided file
float rand(vec2 co, float seed){
    return fract(sin(dot(co.xy + seed ,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 makeJupiter(vec2 uv, float time)
{
    float timeScale = .5;
    vec2 zoom = vec2(20.,5.5);
    vec2 offset = vec2(2.,1.);
    vec2 point = uv * zoom + offset;
    float p_x = float(point.x); 
    float p_y = float(point.y);
    float a_x = .2;
    float a_y = .3;
    for(int i=1; i<int(10); i++){
        float float_i = float(i); 
        point.x+=a_x*sin(float_i*point.y+time*timeScale);
        point.y+=a_y*cos(float_i*point.x+time*.2);
    }
    float r = cos(point.x+point.y+2.)*.5+.5;
    float g = sin(point.x+point.y+2.2)*.5+.5;
    float b = (sin(point.x+point.y+1.)+cos(point.x+point.y+1.5))*.5+.5;
    vec3 col = vec3(r,g,b);
    col += vec3(.5);
    return col;
}

// Original moon function replaced with Jupiter
vec4 moon(vec3 ro, vec3 rd) {
    // Sphere parameters
    vec4 mdim = vec4(1.0e5 * vec3(0.0, 0.4, 1.0), 20000.0);
    
    // Check for ray-sphere intersection
    vec2 md = raySphere(ro, rd, mdim);
    if (md.x < 0.0) return vec4(0.0);
    
    // Calculate position on the sphere
    vec3 mpos = ro + rd * md.x;
    
    // Calculate UV coordinates for texturing the sphere
    vec3 mnor = normalize(mpos - mdim.xyz);
    
    // Convert to spherical coordinates for texturing
    vec2 uv;
    uv.x = atan(mnor.z, mnor.x) / (2.0 * PI) + 0.5; // Longitude [0..1]
    uv.y = asin(mnor.y) / PI + 0.5;                // Latitude [0..1]
    
    // Apply Jupiter texture
    vec3 jupiterColor = makeJupiter(uv, TIME);
    
    // Simple lighting
    vec3 lpos = 1e6 * vec3(0.0, -0.15, 1.0); // Light position
    vec3 ldir = normalize(lpos - mpos);
    float mdif = max(0.0, dot(ldir, mnor));
    
    // Apply lighting to Jupiter color
    vec3 col = jupiterColor * (mdif * 1.2 + 0.3); // Add ambient light
    
    // Calculate alpha based on sphere intersection
    float mf = smoothstep(0.0, 10000.0, md.y - md.x);
    
    return vec4(col, clamp(mf, 0.0, 1.0));
}

// plane/layer function from original: returns color + alpha
vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n) {
    float h = hash(n);
    vec2 p = (pp - off*2.0*vec3(1.0,1.0,0.0)).xy;
    const vec2 stp = vec2(0.5, 0.33);
    float he = hiheight(vec2(p.x, pp.z) * stp);
    float lohe = loheight(vec2(p.x, pp.z) * stp);
    float d = p.y - he;
    float lod = p.y - lohe;
    float aa = distance(pp, npp)*sqrt(1.0/3.0);
    float t = smoothstep(aa, -aa, d);
    float df = exp(-0.1 * (distance(ro, pp) - 2.0));
    vec3 acol = hsv2rgb(vec3(mix(0.9, 0.6, df), 0.9, mix(1.0, 0.0, df)));
    vec3 gcol = hsv2rgb(vec3(0.6, 0.5, tanh_approx(exp(-mix(2.0, 8.0, df) * lod))));
    vec3 col = acol + 0.5 * gcol;
    return vec4(col, clamp(t, 0.0, 1.0));
}

// main color accumulation: returns rgb and alpha via out param
vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p, out float outA) {
    vec2 np = p + 2.0 / RESOLUTION.y;
    vec3 rd = normalize(p.x*uu + p.y*vv + 2.0*ww);
    vec3 nrd = normalize(np.x*uu + np.y*vv + 2.0*ww);
    
    const float planeDist = 1.0;
    const int furthest = 30;
    const int fadeFrom = 28;
    const float fadeDist = planeDist * float(fadeFrom);
    const float maxDist = planeDist * float(furthest);
    
    float nz = floor(ro.z / planeDist);
    vec4 accum = vec4(0.0); // accumulated color+alpha
    
    for (int i = 1; i <= furthest; ++i) {
        float pz = planeDist * nz + planeDist * float(i);
        float pd = (pz - ro.z) / rd.z;
        vec3 pp = ro + rd * pd;
        
        if (pp.y < 0.0 && pd > 0.0 && accum.w < 0.95) {
            vec3 npp = ro + nrd * pd;
            vec3 off = vec3(0.0);
            vec4 pcol = plane(ro, rd, pp, npp, off, nz + float(i));
            float fadeIn = smoothstep(maxDist, fadeDist, pd);
            pcol.xyz = mix(vec3(0.0), pcol.xyz, fadeIn);
            pcol = clamp(pcol, 0.0, 1.0);
            accum = alphaBlendVec4(accum, pcol); // front over back
        } else {
            break;
        }
    }
    
    // Jupiter moon
    vec4 m = moon(ro, rd);
    
    // compose: layers (accum) over transparent black, then moon blended in
    vec3 base = accum.xyz;
    float baseA = accum.w;
    
    // blend moon over base
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
    
    // output with correct transparency (transparent outside moon/planes)
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
    ]), gl.STATIC_DRAW);

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
    resize(); // initial resize

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













