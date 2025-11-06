// assets/js/shader4.js
document.addEventListener("DOMContentLoaded", () => {
  const canvas4 = document.getElementById("shader-canvas4");
  if (!canvas4) return console.error("❌ Canvas #shader-canvas4 не найден!");

  const gl4 = canvas4.getContext("webgl2", {
    powerPreference: "high-performance",
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl4) return alert("Ваш браузер не поддерживает WebGL2");

  function resize() {
    canvas4.width = window.innerWidth;
    canvas4.height = window.innerHeight;
    gl4.viewport(0, 0, gl4.drawingBufferWidth, gl4.drawingBufferHeight);
  }
  window.addEventListener("resize", resize);
  resize();

  const vertexSrc = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const fragmentSrc = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;

  #define RESOLUTION iResolution
  #define TIME iTime
  #define PI 3.141592654
  #define TAU (2.0*PI)

  const vec4 hsv2rgb_K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 hsv2rgb(vec3 c){
    vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz)*6.0 - hsv2rgb_K.www);
    return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
  }

  float hash(float n){return fract(sin(n)*43758.5453123);}
  float hash(vec2 p){return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123);}
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    float a=hash(i);
    float b=hash(i+vec2(1,0));
    float c=hash(i+vec2(0,1));
    float d=hash(i+vec2(1,1));
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  }
  float hifbm(vec2 p){float s=0.,a=1.;for(int i=0;i<5;i++){s+=a*vnoise(p);a*=.5;p*=2.;}return s;}
  float hiheight(vec2 p){return hifbm(p)-1.8;}

  vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 npp, float n){
    vec2 p=pp.xy;
    const vec2 stp=vec2(0.5,0.33);
    float he=hiheight(vec2(p.x,pp.z)*stp);
    float d=p.y-he;
    float aa=distance(pp,npp)*0.5773;
    float t=smoothstep(aa,-aa,d);
    float df=exp(-0.1*(distance(ro,pp)-2.));
    vec3 acol=hsv2rgb(vec3(mix(0.9,0.6,df),0.9,mix(1.0,0.0,df)));
    return vec4(acol,t);
  }

  vec3 stars(vec2 sp){
    const vec3 scol0=hsv2rgb(vec3(0.85,0.8,1.0));
    const vec3 scol1=hsv2rgb(vec3(0.65,0.5,1.0));
    vec3 col=vec3(0.0);
    for(float i=0.;i<6.;i++){
      vec2 np=mod(sp+0.5*i,PI*vec2(0.05))-0.5*PI*vec2(0.05);
      float l=length(np);
      float w=exp(-3000.0*max(l-0.001,0.0));
      col+=mix(scol0,scol1,fract(i*0.37))*w;
    }
    return col;
  }

  vec3 skyColor(vec3 rd){
    vec3 acol=hsv2rgb(vec3(0.6,0.9,0.075));
    vec3 lcol=hsv2rgb(vec3(0.75,0.8,1.0));
    vec2 sp=vec2(atan(rd.y,rd.x),acos(rd.z));
    float li=0.02/(abs((rd.y+0.055))+0.025);
    vec3 col=stars(sp)*smoothstep(0.5,0.0,li)*0.9;
    col+=acol*0.8;
    col+=tanh(lcol*li)*0.6;
    return col;
  }

  vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p){
    vec3 rd=normalize(p.x*uu+p.y*vv+2.0*ww);
    float nz=floor(ro.z);
    vec3 skyCol=skyColor(rd);
    vec4 acol=vec4(0.);
    for(int i=1;i<=10;i++){
      float pd=float(i);
      vec3 pp=ro+rd*pd;
      if(pp.y<0.){
        vec3 npp=ro+rd*pd;
        vec4 pcol=plane(ro,rd,pp,npp,nz+float(i));
        acol=mix(acol,vec4(pcol.xyz,1.0),pcol.w);
      }
    }
    return mix(skyCol,acol.rgb,acol.w);
  }

  vec3 effect(vec2 p, vec2 q){
    float tm=TIME*0.25;
    vec3 ro=vec3(0.0,0.0,tm);
    vec3 dro=normalize(vec3(0.0,0.09,1.0));
    vec3 ww=normalize(dro);
    vec3 uu=normalize(cross(vec3(0.0,1.0,0.0),ww));
    vec3 vv=normalize(cross(ww,uu));
    return color(ww,uu,vv,ro,p);
  }

  vec3 renderSun(vec2 q,out float sunMask){
    vec2 c=vec2(0.5,0.5);
    float d=distance(q,c);
    float sun=exp(-d*80.0)*1.6;
    float halo=exp(-d*18.0)*0.45;
    sunMask=clamp(sun+halo,0.0,1.0);
    vec3 sunCol=hsv2rgb(vec3(0.05,0.9,1.0))*(1.0+0.6*halo);
    return sunCol*sunMask;
  }

  vec3 renderSphere(vec2 q,out float sphereMask){
    vec2 center=vec2(0.5,0.28);
    float r=0.12;
    float d=distance(q,center);
    if(d>r){sphereMask=0.0;return vec3(0.0);}
    float nr=d/r;
    float z=sqrt(max(0.0,1.0-nr*nr));
    vec3 n=normalize(vec3((q-center)/r,z));
    vec3 l=normalize(vec3(0.0,-0.15,1.0));
    float diff=max(dot(n,l),0.0);
    vec3 base=hsv2rgb(vec3(0.72+0.02*sin(TIME*0.6),0.8,1.0));
    vec3 col=base*(0.4+1.2*diff);
    sphereMask=smoothstep(r,r*0.88,d);
    return col*sphereMask;
  }

  vec3 aces(vec3 v){v=max(v,0.0);v*=0.6;return clamp((v*(2.51*v+0.03))/(v*(2.43*v+0.59)+0.14),0.0,1.0);}
  float srgb(float t){return mix(1.055*pow(t,1./2.4)-0.055,12.92*t,step(t,0.0031308));}
  vec3 srgb(vec3 c){return vec3(srgb(c.x),srgb(c.y),srgb(c.z));}

  void main(){
    vec2 q=gl_FragCoord.xy/RESOLUTION.xy;
    vec2 p=-1.0+2.0*q;
    p.x*=RESOLUTION.x/RESOLUTION.y;

    vec3 col=effect(p,q);

    float sunMask=0.;vec3 sunCol=renderSun(q,sunMask);
    float sphereMask=0.;vec3 sphereCol=renderSphere(q,sphereMask);
    col+=sunCol+sphereCol;

    col=aces(col);
    col=srgb(col);

    float bgAlpha=smoothstep(0.60,0.42,q.y);
    float objAlpha=max(sunMask,sphereMask);
    float alpha=max(bgAlpha,objAlpha);
    fragColor=vec4(col,alpha);
  }`;

  function compileShader(type, src){
    const sh=gl4.createShader(type);
    gl4.shaderSource(sh, src);
    gl4.compileShader(sh);
    if(!gl4.getShaderParameter(sh, gl4.COMPILE_STATUS)){
      console.error(gl4.getShaderInfoLog(sh));
      throw new Error("Shader compile failed");
    }
    return sh;
  }

  const vs=compileShader(gl4.VERTEX_SHADER,vertexSrc);
  const fs=compileShader(gl4.FRAGMENT_SHADER,fragmentSrc);
  const prog=gl4.createProgram();
  gl4.attachShader(prog,vs);
  gl4.attachShader(prog,fs);
  gl4.linkProgram(prog);
  if(!gl4.getProgramParameter(prog,gl4.LINK_STATUS))
    console.error(gl4.getProgramInfoLog(prog));
  gl4.useProgram(prog);

  const quad=gl4.createBuffer();
  gl4.bindBuffer(gl4.ARRAY_BUFFER,quad);
  gl4.bufferData(gl4.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl4.STATIC_DRAW);
  gl4.enableVertexAttribArray(0);
  gl4.vertexAttribPointer(0,2,gl4.FLOAT,false,0,0);

  const resLoc=gl4.getUniformLocation(prog,"iResolution");
  const timeLoc=gl4.getUniformLocation(prog,"iTime");

  let start=performance.now();
  function render(){
    resize();
    const t=(performance.now()-start)*0.001;
    gl4.uniform3f(resLoc,canvas4.width,canvas4.height,1.0);
    gl4.uniform1f(timeLoc,t);
    gl4.clearColor(0,0,0,0);
    gl4.clear(gl4.COLOR_BUFFER_BIT);
    gl4.drawArrays(gl4.TRIANGLES,0,6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
