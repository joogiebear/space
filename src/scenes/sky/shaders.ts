/** Shaders for Sky Tonight. World axes are x = east, y = up, z = south. */

/** Stars: constant pixel size, hidden below the horizon, dimmed near it (the atmosphere) and by daylight. */
export const STAR_VS = `attribute vec3 aCol;attribute float aSize;uniform float uPx,uVis;varying vec3 vC;varying float vA;
void main(){vec4 wp=modelMatrix*vec4(position,1.);float h=wp.y/length(wp.xyz);
float fade=smoothstep(.0,.07,h);vA=uVis*fade*clamp(.4+aSize*.13,.3,1.);
gl_Position=projectionMatrix*viewMatrix*wp;gl_PointSize=vA>.01?aSize*uPx:0.;vC=aCol;}`;
export const STAR_FS = `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
float a=pow(1.-d,1.05)*vA;gl_FragColor=vec4(vC*1.15,a);}`;

/** Sky dome: a gradient from the horizon colour up to the zenith colour, with a warm glow toward the Sun at dusk. */
export const DOME_VS = `varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const DOME_FS = `uniform vec3 uZen,uHor,uSun;uniform float uGlow;varying vec3 vD;
void main(){float h=clamp(vD.y,0.,1.);vec3 c=mix(uHor,uZen,pow(h,.55));
float s=max(dot(normalize(vD),normalize(uSun)),0.);c+=vec3(1.,.55,.25)*pow(s,5.)*uGlow*(1.-h*.6);
gl_FragColor=vec4(c,1.);}`;

/** The ground below the horizon: opaque, with a little haze where it meets the sky. */
export const GROUND_FS = `uniform vec3 uGround,uHor;varying vec3 vD;
void main(){float d=clamp(-vD.y,0.,1.);vec3 c=uGround*(1.-.55*smoothstep(0.,.5,d));
c=mix(c,uHor*.4,.45*(1.-smoothstep(0.,.12,d)));gl_FragColor=vec4(c,1.);}`;

/** The Moon: a textured sphere lit from the Sun's direction, so its phase is the real one. */
export const MOON_VS = `varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*position);
gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const MOON_FS = `uniform sampler2D uMap;uniform vec3 uSun;varying vec2 vUv;varying vec3 vN;
void main(){float lit=max(dot(normalize(vN),normalize(uSun)),0.);vec3 t=texture2D(uMap,vUv).rgb;
gl_FragColor=vec4(t*(.025+1.15*lit),1.);}`;
