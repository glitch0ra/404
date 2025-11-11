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

    const vertexSrc = `#version 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    const fragmentSrc = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        
        uniform vec3 iResolution;
        uniform float iTime;

        #define _Steps 12.0
        #define _Size 0.3
        
        // === СКОРОСТИ ===
        #define ROT_X_SPEED 0.5
        #define ROT_Y_SPEED 0.5
        #define ROT_Z_SPEED 0.5
        #define RING_SPEED 0.4
        #define RING_FLOW_SPEED 0.1

        // === ТОЧНЫЕ ЦВЕТА БЕНЗИНОВОГО ПЕРЕЛИВАНИЯ ===
        const vec3 COLOR_CYAN = vec3(0.0, 0.898, 1.0);    // #00e5ff (голубой)
        const vec3 COLOR_PINK = vec3(1.0, 0.0, 0.816);    // #ff00d0 (розовый)
        const vec3 COLOR_PURPLE = vec3(0.451, 0.0, 1.0);  // #7300ff (фиолетовый)
        const vec3 COLOR_GREEN = vec3(0.0, 1.0, 0.502);   // #00ff80 (зелёный)

        float hash(float x) { return fract(sin(x) * 15.0); }
        float hash(vec2 x) { return hash(x.x + hash(x.y)); }

        float value(vec2 p, float f) {
            float bl = hash(floor(p * f + vec2(0.0, 0.0)));
            float br = hash(floor(p * f + vec2(1.0, 0.0)));
            float tl = hash(floor(p * f + vec2(0.0, 1.0)));
            float tr = hash(floor(p * f + vec2(1.0, 1.0)));
            vec2 fr = fract(p * f);
            fr = (3.0 - 2.0 * fr) * fr * fr;
            float b = mix(bl, br, fr.x);
            float t = mix(tl, tr, fr.x);
            return mix(b, t, fr.y);
        }

        void Rotate(inout vec3 vector, vec2 angle) {
            vector.yz = cos(angle.y) * vector.yz + sin(angle.y) * vec2(-1.0, 1.0) * vector.zy;
            vector.xz = cos(angle.x) * vector.xz + sin(angle.x) * vec2(-1.0, 1.0) * vector.zx;
        }

        void Rotate3D(inout vec3 vector, vec3 angles) {
            vector.yz = cos(angles.x) * vector.yz + sin(angles.x) * vec2(-1.0, 1.0) * vector.zy;
            vector.xz = cos(angles.y) * vector.xz + sin(angles.y) * vec2(-1.0, 1.0) * vector.zx;
            vector.xy = cos(angles.z) * vector.xy + sin(angles.z) * vec2(-1.0, 1.0) * vector.yx;
        }

        // === МАСЛЯНИСТОЕ ПЕРЕЛИВАНИЕ (все 4 цвета одновременно) ===
        vec3 oilMix(vec3 p, float t) {
            // Глобальная фаза для плавного переливания
            float timePhase = t * 0.5;
            
            // Волны с разными частотами и фазами для одновременного смешивания
            float wave1 = sin(p.x * 0.3 + p.y * 0.4 + timePhase) * 0.5 + 0.5; // ФИОЛЕТОВЫЙ
            float wave2 = sin(p.y * 0.4 + p.z * 0.3 + timePhase + 1.57) * 0.5 + 0.5; // ЗЕЛЕНЫЙ
            float wave3 = sin(p.z * 0.35 + p.x * 0.45 + timePhase + 3.14) * 0.5 + 0.5; // ГОЛУБОЙ
            float wave4 = sin(p.x * 0.5 + p.y * 0.3 + timePhase + 4.71) * 0.5 + 0.5; // РОЗОВЫЙ
            
            // Добавляем маслянистый шум
            float oilFlow = sin(p.x * 1.2 + p.y * 0.9 + t * 2.0) * 0.06;
            
            // Смешиваем все 4 цвета одновременно
            vec3 col = COLOR_PURPLE * (wave1 + oilFlow) + 
                       COLOR_GREEN * (wave2 + oilFlow) + 
                       COLOR_CYAN * (wave3 + oilFlow) + 
                       COLOR_PINK * (wave4 + oilFlow);
            
            col = clamp(col, 0.0, 2.0); // Допускаем пересвет
            
            // Увеличиваем насыщенность
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(lum), col, 1.4);
            
            // Ограничиваем яркость
            float maxVal = max(max(col.r, col.g), col.b);
            if (maxVal > 1.0) col /= (maxVal + 0.1);
            
            // Гамма-коррекция для глубины
            col = pow(clamp(col, 0.0, 1.0), vec3(0.95));
            
            return col;
        }

        // === НЕОНОВАЯ ПОДСВЕТКА ===
        vec3 neonGlow(vec3 color, float intensity, float radius) {
            float glowRadius = smoothstep(0.0, 0.5, radius);
            float glowPower = intensity * (1.0 + glowRadius * 2.0);
            return color * glowPower;
        }

        vec4 raymarchDisk(vec3 ray, vec3 zeroPos) {
            vec3 position = zeroPos;
            float lengthPos = length(position.xz);
            float dist = min(1.0, lengthPos * (1.0 / _Size) * 0.5) * _Size * 0.4 * (1.0 / _Steps) / (abs(ray.y) + 0.0001);
            position += dist * _Steps * ray * 0.5;
            
            vec4 o = vec4(0.0);
            for(float i = 0.0; i < _Steps; i++) {
                position -= dist * ray;
                float intensity = clamp(1.0 - abs((i - 0.8) * (1.0 / _Steps) * 2.0), 0.0, 1.0);
                lengthPos = length(position.xz);
                
                float distMult = 1.0;
                distMult *= clamp((lengthPos - _Size * 0.75) * (1.0 / _Size) * 1.5, 0.0, 1.0);
                distMult *= clamp((_Size * 10.0 - lengthPos) * (1.0 / _Size) * 0.20, 0.0, 1.0);
                distMult *= distMult;
                
                float u = lengthPos + iTime * RING_FLOW_SPEED + intensity * _Size * 0.2;
                
                vec2 xy;
                float rot = mod(iTime * RING_SPEED, 8192.0);
                xy.x = -position.z * sin(rot) + position.x * cos(rot);
                xy.y = position.x * sin(rot) + position.z * cos(rot);
                float x = abs(xy.x / (xy.y + 0.0001));
                float angle = 0.02 * atan(x);
                
                const float f = 70.0;
                float noise = value(vec2(angle, u * (1.0 / _Size) * 0.05), f);
                noise = noise * 0.66 + 0.33 * value(vec2(angle, u * (1.0 / _Size) * 0.05), f * 2.0);
                float extraWidth = noise * 1.0 * (1.0 - clamp(i * (1.0 / _Steps) * 2.0 - 1.0, 0.0, 1.0));
                float alpha = clamp(noise * (intensity + extraWidth) * ((1.0 / _Size) * 10.0 + 0.01) * dist * distMult, 0.0, 1.0);
                
                vec3 p3d = position * 0.1;
                vec3 baseColor = oilMix(p3d, iTime * 0.5);
                vec3 neonColor = neonGlow(baseColor, intensity, alpha) * intensity * 2.5;
                neonColor *= distMult;
                
                vec3 colVec = neonColor;
                o = clamp(vec4(colVec * alpha + o.rgb * (1.0 - alpha), o.a * (1.0 - alpha) + alpha), vec4(0.0), vec4(10.0));
                
                lengthPos *= (1.0 / _Size);
            }
            o.rgb = pow(clamp(o.rgb, 0.0, 10.0), vec3(0.75));
            return o;
        }

        vec3 spherePos = vec3(8.0, 6.0, 25.0);

        vec4 rayMarch(vec3 ro, vec3 rd) {
            vec3 pos = ro;
            vec4 col = vec4(0.0);
            vec4 glow = vec4(0.0);
            vec3 bhPos = spherePos;

            pos -= bhPos;
            float time = iTime * 0.5;
            vec3 rotationAngles = vec3(
                sin(time * ROT_X_SPEED) * 0.5,
                cos(time * ROT_Y_SPEED) * 0.8,
                sin(time * ROT_Z_SPEED) * 0.3
            );
            Rotate3D(pos, rotationAngles);
            Rotate3D(rd, rotationAngles);

            for(int disks = 0; disks < 32; disks++) {
                for(int h = 0; h < 6; h++) {
                    float dotpos = dot(pos, pos);
                    float invDist = inversesqrt(dotpos);
                    float centDist = dotpos * invDist;
                    float stepDist = 0.92 * abs(pos.y / (rd.y + 0.0001));
                    float farLimit = centDist * 0.5;
                    float closeLimit = centDist * 0.1 + 0.05 * centDist * centDist * (1.0 / _Size);
                    stepDist = min(stepDist, min(farLimit, closeLimit));

                    float invDistSqr = invDist * invDist;
                    float forceK = 0.725;
                    float bendForce = stepDist * invDistSqr * _Size * forceK;
                    rd = normalize(rd - (bendForce * invDist) * pos);
                    pos += stepDist * rd;

                    glow += vec4(1.2, 1.1, 1.0, 1.0) * 
                            (0.01 * stepDist * invDistSqr * invDistSqr * 
                             clamp(centDist * 2.0 - 1.2, 0.0, 1.0));
                }

                float dist2 = length(pos);
                if(dist2 > _Size * 1000.0) {
                    break;
                }
                else if(abs(pos.y) <= _Size * 0.002) {
                    vec4 diskCol = raymarchDisk(rd, pos);
                    pos.y = 0.0;
                    pos += abs(_Size * 0.001 / (rd.y + 0.0001)) * rd;
                    col = vec4(diskCol.rgb * (1.0 - col.a) + col.rgb, 
                               col.a + diskCol.a * (1.0 - col.a));
                }
            }

            if(col.a == 0.0 && length(glow.rgb) < 0.01) {
                return vec4(0.0);
            }

            return vec4(col.rgb * col.a + glow.rgb * (1.0 - col.a), 
                       min(1.0, col.a + length(glow.rgb) * 0.5));
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.x;
            vec3 ro = vec3(0.0, 0.0, -8.0);
            vec3 rd = normalize(vec3(uv, 1.0));
            
            vec4 blackHole = rayMarch(ro, rd);
            
            float dist = length(uv);
            if (dist < 0.8 && dist > _Size * 2.0 && blackHole.a < 0.5) {
                float suction = 1.0 - smoothstep(_Size * 2.0, 0.8, dist);
                float angle = atan(uv.y, uv.x);
                float twist = angle + suction * sin(iTime * 3.0) * 0.3;
                vec2 twistedUV = vec2(cos(twist), sin(twist)) * dist;
                vec3 suctionColor = vec3(0.2, 0.4, 0.7) * suction * 0.3;
                float suctionAlpha = suction * 0.4;
                blackHole.rgb += suctionColor * suctionAlpha;
                blackHole.a = max(blackHole.a, suctionAlpha);
            }
            
            fragColor = blackHole;
            fragColor.rgb = pow(clamp(fragColor.rgb, 0.0, 10.0), vec3(0.65));
        }
    `;

    // === ОСТАЛЬНОЙ КОД JS ===
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

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLoc = gl.getUniformLocation(program, 'iResolution');
    const iTimeLoc = gl.getUniformLocation(program, 'iTime');

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    window.addEventListener('resize', resize);
    resize();

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
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
});
