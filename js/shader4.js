// s/shader4.js — Neonwave Sunrise (корректная прозрачность верха + чистая луна)
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("Canvas #shader-canvas4 не найден!");

  // Важно: включаем альфа-канал
  const gl = canvas4.getContext("webgl2", {
    powerPreference: "high-performance",
    alpha: true,
    preserveDrawingBuffer: false,
    antialias: false
  });
  if (!gl) return console.error("WebGL2 не поддерживается.");

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = innerWidth;
    const h = innerHeight;
    canvas4.width = w * dpr;
    canvas4.height = h * dpr;
    canvas4.style.width = w + "px";
    canvas4.style.height = h + "px";
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener("resize", resize);
  resize();

  // ──────────────────────── GLSL ────────────────────────
  const vs = `#version 300 es
  in vec2 aPosition;
  out vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }`;

  const fs = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  uniform vec3  iResolution;
  uniform float iTime;

  #define RESOLUTION iResolution
  #define TIME iTime
  #define PI 3.141592654
  #define TAU (2.0*PI)

  const vec4 hsv2rgb_K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 hsv2rgb(vec3 c){
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
  }

  float hash(vec2 p){ float a=dot(p,vec2(127.1,311.7)); return fract(sin(a)*43758.5453123); }
  vec2 hash2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453123); }

  float vnoise(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    float a=hash(i+vec2(0.0)); float b=hash(i+vec2(1.0,0.0));
    float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  float tanh_approx(float x){ float x2=x*x; return clamp(x*(27.0+x2)/(27.0+9.0*x2), -1.0,1.0); }

  float hifbm(vec2 p){ float s=0.0,a=1.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); a*=0.5; p*=2.0; } return s; }
  float lofbm(vec2 p){ float s=0.0,a=1.0; for(int i=0;i<2;i++){ s+=a*vnoise(p); a*=0.5; p*=2.0; } return s; }
  float hiheight(vec2 p){ return hifbm(p)-1.8; }
  float loheight(vec2 p){ return lofbm(p)-2.15; }

  vec2 raySphere(vec3 ro, vec3 rd, vec4 sph){
    vec3 oc=ro-sph.xyz;
    float b=dot(oc,rd);
    float c=dot(oc,oc)-sph.w*sph.w;
    float h=b*b-c;
    if(h<0.0)return vec2(-1.0);
    h=sqrt(h);
    return vec2(-b-h,-b+h);
  }

  vec3 toSpherical(vec3 p){float r=length(p);float t=acos(p.z/r);float ph=atan(p.y,p.x);return vec3(r,t,ph);}

  const vec3 lpos=1E6*vec3(0.,-0.15,1.0);
  const vec3 ldir=normalize(lpos);

  // --- ЧИСТАЯ ЛУНА БЕЗ ШУМА ---
  vec4 moon(vec3 ro, vec3 rd){
    const vec4 mdim=vec4(1E5*vec3(0.,0.4,1.0),20000.0);
    const vec3 mcol0=vec3(0.95, 0.98, 1.0); // Холодный белый для луны
    const vec3 mcolEdge=vec3(1.0, 0.9, 0.95); // Розоватый край
    
    vec2 md=raySphere(ro,rd,mdim);
    if(md.x < 0.0) return vec4(0.0, 0.0); // Луны нет в кадре
    
    vec3 mpos=ro+rd*md.x;
    vec3 mnor=normalize(mpos-mdim.xyz);
    float mdif=max(dot(ldir,mnor),0.0);
    float mfre=1.0+dot(rd,mnor);
    float imfre=1.0-mfre;
    
    // Базовый цвет луны
    vec3 col = mcol0 * (0.3 + 0.7 * mdif);
    
    // Мягкое свечение по краю
    col += mcolEdge * 0.4 * imfre * smoothstep(0.0, 0.3, mdif);
    
    // Важно: луна ВСЕГДА непрозрачна
    return vec4(col, 1.0);
  }

  // --- ТЕРРЕЙН С РАЗМЫТИЕМ ГОРИЗОНТА ---
  vec4 terrain(vec3 ro, vec3 rd){
    const float planeDist=1.0;
    const int furthest=12;
    float nz=floor(ro.z/planeDist);
    vec4 acol=vec4(0.0);
    
    for(int i=1; i<=furthest; i++){
      float pz=planeDist*nz+planeDist*float(i);
      float pd=(pz-ro.z)/rd.z;
      if(pd <= 0.0) continue;
      
      vec3 pp=ro+rd*pd;
      if(pp.y >= 0.0) continue; // Рисуем только ниже горизонта
      
      // Высота ландшафта
      vec2 stp=vec2(0.5,0.33);
      float he=hifbm(vec2(pp.x,pp.z)*stp)-1.8;
      float d=pp.y-he;
      
      // Динамическое размытие для distant terrain
      float dist=length(pp-ro);
      float blur=smoothstep(30.0, 120.0, dist) * 0.7;
      float aa=(0.01 + 0.03*blur) * RESOLUTION.y;
      
      float alpha=smoothstep(aa, -aa, d);
      if(alpha < 0.01) continue;
      
      // Цвета заката
      float df=exp(-0.1*(dist-2.0));
      vec3 warmColor=hsv2rgb(vec3(0.05, 0.8, mix(1.0, 0.3, df))); // Оранжевый закат
      vec3 coolColor=hsv2rgb(vec3(0.6, 0.5, mix(0.8, 0.2, df))); // Фиолетовый
      
      vec3 col=mix(warmColor, coolColor, smoothstep(0.1, 0.4, pp.z/100.0));
      
      // Свечение на горизонте
      if(dist > 80.0) {
        float horizonGlow=smoothstep(100.0, 50.0, dist) * (1.0 - smoothstep(0.1, 0.9, pp.y+0.1));
        col += vec3(1.0, 0.8, 0.5) * horizonGlow * 1.5;
        alpha = max(alpha, horizonGlow * 0.5); // Усиливаем видимость свечения
      }
      
      // Добавляем к общему результату
      vec4 layer=vec4(col, alpha);
      acol=acol + layer * (1.0 - acol.a); // Простое наложение с альфой
    }
    
    // Гарантируем непрозрачность для ближних слоев
    if(acol.a < 0.9) acol.a = 1.0;
    return acol;
  }

  // --- ФИНАЛЬНАЯ КОМПОЗИЦИЯ ---
  vec4 renderScene(vec2 p){
    float tm=TIME*0.25;
    vec3 ro=vec3(0.0, 0.05, tm); // Немного поднимаем камеру
    vec3 rd=normalize(vec3(p.x, p.y, 2.0));
    
    // Поворот камеры для движения
    float yaw=0.05*tm;
    mat3 cam=mat3(
      cos(yaw), 0, sin(yaw),
      0, 1, 0,
      -sin(yaw), 0, cos(yaw)
    );
    rd=cam*rd;
    
    // Рисуем луну
    vec4 moonCol=moon(ro, rd);
    
    // Рисуем террейн (только нижняя часть)
    vec4 terrainCol=terrain(ro, rd);
    
    // Композиция:
    // 1. Всегда рисуем террейн (он закрывает нижнюю часть)
    // 2. Луну рисуем ТОЛЬКО в верхней части экрана
    vec4 finalCol=terrainCol;
    
    // Горизонтальная граница (0.45 = 45% высоты экрана)
    float horizonY=0.45;
    if(p.y > horizonY) {
      // В верхней части: оставляем только луну, фон прозрачный
      finalCol=moonCol;
      
      // Плавный переход на линии горизонта
      float blend=smoothstep(horizonY, horizonY+0.03, p.y);
      finalCol.rgb=mix(terrainCol.rgb, moonCol.rgb, blend);
      finalCol.a=mix(terrainCol.a, moonCol.a, blend);
    }
    
    return finalCol;
  }

  void main(){
    vec2 uv=gl_FragCoord.xy/RESOLUTION.xy;
    vec2 p=-1.0+2.0*uv;
    p.x*=RESOLUTION.x/RESOLUTION.y;
    
    vec4 col=renderScene(p);
    
    // Пост-эффекты только для цвета (не затрагивая альфу)
    col.rgb=pow(col.rgb, vec3(0.85)); // Легкое затемнение
    
    // Финальная альфа: прозрачность ТОЛЬКО в верхней части вне луны
    if(uv.y > 0.45 && col.a < 0.1) {
      col.a=0.0; // Полная прозрачность для фона
    }
    
    fragColor=vec4(col.rgb, col.a);
  }`;

  // ──────────────────────── Compile ────────────────────────
  function compile(type, src){
    const s=gl.createShader(type);
    gl.shaderSource(s,src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(s));
    return s;
  }
  const v=compile(gl.VERTEX_SHADER,vs);
  const f=compile(gl.FRAGMENT_SHADER,fs);
  const prog=gl.createProgram();
  gl.attachShader(prog,v);
  gl.attachShader(prog,f);
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const posLoc=gl.getAttribLocation(prog,"aPosition");
  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1,1, 1,-1, 1,1
  ]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);

  const uRes=gl.getUniformLocation(prog,"iResolution");
  const uTime=gl.getUniformLocation(prog,"iTime");

  function render(t){
    gl.uniform3f(uRes,gl.drawingBufferWidth,gl.drawingBufferHeight,1.0);
    gl.uniform1f(uTime,t*0.001);
    gl.clearColor(0,0,0,0); // Прозрачный бэкграунд
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
