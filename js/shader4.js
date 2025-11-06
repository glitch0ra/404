// s/shader4.js — Neonwave Sunrise (адаптирован под сайт без аудио)
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("Canvas #shader-canvas4 не найден!");

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
#define HSV2RGB(c) (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

float hash(float co){ return fract(sin(co*12.9898)*13758.5453); }
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

vec4 alphaBlend(vec4 back, vec4 front){
  float w = front.w + back.w*(1.0-front.w);
  vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.0-front.w))/w;
  return w>0.0?vec4(xyz,w):vec4(0.0);
}
vec3 alphaBlend(vec3 back, vec4 front){ return mix(back, front.xyz, front.w); }

vec2 mod2(inout vec2 p, vec2 size){
  vec2 c=floor((p+size*0.5)/size);
  p=mod(p+size*0.5,size)-size*0.5;
  return c;
}
float mod1(inout float p,float size){float halfsize=size*0.5;float c=floor((p+halfsize)/size);p=mod(p+halfsize,size)-halfsize;return c;}

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

// --- plane() ---
vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, vec3 off, float n){
  float h=hash(n);
  vec2 p=(pp-off*2.0*vec3(1.0,1.0,0.0)).xy;
  const vec2 stp=vec2(0.5,0.33);
  float he=hiheight(vec2(p.x,pp.z)*stp);
  float lohe=loheight(vec2(p.x,pp.z)*stp);
  float d=p.y-he;
  float lod=p.y-lohe;
  float aa=distance(pp,npp)*sqrt(1.0/3.0);
  float t=smoothstep(aa,-aa,d);
  float df=exp(-0.1*(distance(ro,pp)-2.));
  vec3 acol=hsv2rgb(vec3(mix(0.9,0.6,df),0.9,mix(1.0,0.0,df)));
  vec3 gcol=hsv2rgb(vec3(0.6,0.5,tanh_approx(exp(-mix(2.0,8.0,df)*lod))));
  vec3 col=acol+0.5*gcol;
  return vec4(col,t);
}

// --- чистая луна ---
vec4 moon(vec3 ro, vec3 rd){
  const vec4 mdim=vec4(1E5*vec3(0.,0.4,1.0),20000.0);
  const vec3 mcol0=HSV2RGB(vec3(0.75,0.7,1.0));
  vec2 md=raySphere(ro,rd,mdim);
  vec3 mpos=ro+rd*md.x;
  vec3 mnor=normalize(mpos-mdim.xyz);
  float mdif=max(dot(ldir,mnor),0.0);
  float mf=smoothstep(0.0,10000.0,md.y-md.x);
  vec3 col=mdif*mcol0*4.0;
  return vec4(col,mf);
}

// --- упрощённое небо ---
vec3 skyColor(vec3 ro, vec3 rd){
  const vec3 acol=HSV2RGB(vec3(0.6,0.9,0.075));
  const vec3 lcol=HSV2RGB(vec3(0.75,0.8,1.0));
  vec2 sp=toSpherical(rd.xzy).yz;
  vec4 mcol=moon(ro,rd);
  vec3 col=vec3(0.0);
  // убрано: stars() и яркое небо сверху
  // добавим мягкий градиент перехода к горизонту
  float horizonFade = smoothstep(0.1, -0.2, rd.y);
  col = mix(vec3(0.0), acol, horizonFade);
  col = mix(col, mcol.xyz, mcol.w);
  col += tanh(lcol*0.03);
  return col;
}

vec3 color(vec3 ww,vec3 uu,vec3 vv,vec3 ro,vec2 p){
  float rdd=2.0;
  vec3 rd=normalize(p.x*uu+p.y*vv+rdd*ww);
  vec3 nrd=normalize(p.x*uu+p.y*vv+rdd*ww);
  const float planeDist=1.0;
  const int furthest=12;
  const int fadeFrom=max(furthest-2,0);
  const float fadeDist=planeDist*float(fadeFrom);
  const float maxDist=planeDist*float(furthest);
  float nz=floor(ro.z/planeDist);
  vec3 skyCol=skyColor(ro,rd);
  vec4 acol=vec4(0.0);
  const float cutOff=0.95;
  for(int i=1;i<=furthest;i++){
    float pz=planeDist*nz+planeDist*float(i);
    float pd=(pz-ro.z)/rd.z;
    vec3 pp=ro+rd*pd;
    if(pp.y<0.&&pd>0.0&&acol.w<cutOff){
      vec3 npp=ro+nrd*pd;
      vec4 pcol=plane(ro,rd,pp,npp,vec3(0.0),nz+float(i));
      float fadeIn=smoothstep(maxDist,fadeDist,pd);
      pcol.xyz=mix(skyCol,pcol.xyz,fadeIn);
      pcol=clamp(pcol,0.0,1.0);
      acol=alphaBlend(pcol,acol);
    }else{ break; }
  }
  vec3 col=alphaBlend(skyCol,acol);
  return col;
}

vec3 effect(vec2 p){
  float tm=TIME*0.25;
  vec3 ro=vec3(0.0,0.0,tm);
  vec3 dro=normalize(vec3(0.0,0.09,1.0));
  vec3 ww=normalize(dro);
  vec3 uu=normalize(cross(normalize(vec3(0.0,1.0,0.0)),ww));
  vec3 vv=normalize(cross(ww,uu));
  return color(ww,uu,vv,ro,p);
}

float sRGB(float t){return mix(1.055*pow(t,1./2.4)-0.055,12.92*t,step(t,0.0031308));}
vec3 sRGB(vec3 c){return vec3(sRGB(c.x),sRGB(c.y),sRGB(c.z));}
vec3 aces_approx(vec3 v){v=max(v,0.0);v*=0.6;float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;return clamp((v*(a*v+b))/(v*(c*v+d)+e),0.0,1.0);}

void main() {
  vec2 q = gl_FragCoord.xy / RESOLUTION.xy;
  vec2 p = -1.0 + 2.0*q;
  p.x *= RESOLUTION.x / RESOLUTION.y;
  
  vec3 col = effect(p);

  // Сохраняем размытость горизонта (чуть ниже центра)
  float horizon = smoothstep(0.001, 0.001, q.y);
  float horizonMask = smoothstep(0.5, 0.3, q.y); // та же логика, что у alpha (где небо НЕ прозрачное)
  col = mix(col, vec3(col * 5.8), horizon * horizonMask);

  // ✅ Тот же принцип разделения, что в оригинальном shader4.js
  float alpha = smoothstep(0.565, 0.315, q.y);

  col = aces_approx(col);
  col = sRGB(col);
  fragColor = vec4(col, alpha);
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
    gl.drawArrays(gl.TRIANGLES,0,6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});


