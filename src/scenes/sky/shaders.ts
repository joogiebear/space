import { MW } from '@/lib/sky';

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

/**
 * The Milky Way: a glow painted on the celestial sphere in galactic coordinates. The smooth profile uses the same
 * constants as lib/sky.ts (tested); noise adds the dark dust lanes (the Great Rift) and the grain of unresolved stars.
 */
export const MW_VS = `varying vec3 vD;varying float vH;void main(){vD=normalize(position);
vec4 wp=modelMatrix*vec4(position,1.);vH=wp.y/length(wp.xyz);gl_Position=projectionMatrix*viewMatrix*wp;}`;
const f = (n: number) => n.toFixed(4);
/** The fragment shader. `light` uses fewer noise layers and no grain: about a third of the work per pixel. */
export const mwFragment = (light: boolean) => `uniform float uVis;varying vec3 vD;varying float vH;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbmLane(vec3 p){float a=.5,s=0.;for(int i=0;i<${light ? 3 : 5};i++){s+=a*vnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float fbmCloud(vec3 p){float a=.5,s=0.;for(int i=0;i<${light ? 2 : 5};i++){s+=a*vnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
void main(){
vec3 d=normalize(vD);
float gx=-0.0548755604*d.x-0.8734370902*d.y-0.4838350155*d.z;
float gy=0.4941094279*d.x-0.4448296300*d.y+0.7469822445*d.z;
float gz=-0.8676661490*d.x-0.1980763734*d.y+0.4559837762*d.z;
float l=degrees(atan(gy,gx)),b=degrees(asin(clamp(gz,-1.,1.)));
float ab=abs(b);
float lw=${f(MW.longitudeFloor)}+${f(1 - MW.longitudeFloor)}*exp(-pow(l/${f(MW.longitudeSpan)},2.));
float prof=exp(-ab/${f(MW.discScale)})*lw+${f(MW.thickWeight)}*exp(-ab/${f(MW.thickScale)})*lw
+${f(MW.bulgeWeight)}*exp(-pow(l/${f(MW.bulgeL)},2.)-pow(b/${f(MW.bulgeB)},2.));
float lane=fbmLane(d*7.+vec3(3.));
float rift=smoothstep(.5,.72,lane)*exp(-ab/5.);
float riftBoost=1.+.5*smoothstep(0.,70.,l)*(1.-smoothstep(70.,95.,l));
float cloud=.55+.9*fbmCloud(d*18.);
float grain=${light ? '1.' : '.75+.5*vnoise(d*140.)'};
float I=prof*(1.-.7*rift*riftBoost)*cloud*grain;
float bulge=exp(-pow(l/${f(MW.bulgeL * 1.6)},2.)-pow(b/${f(MW.bulgeB * 1.6)},2.));
vec3 col=mix(vec3(.62,.74,1.),vec3(1.,.86,.62),clamp(bulge*1.3,0.,1.));
float fade=smoothstep(0.,.14,vH);
gl_FragColor=vec4(col,clamp(I*.085*uVis*fade,0.,1.));}`;
export const MW_FS = mwFragment(false);

/**
 * The Milky Way from a photographic star map (NASA SVS "Deep Star Maps 2020", built from ESA Gaia data): an equirectangular
 * image in galactic coordinates, centred on longitude 0 with longitude increasing to the left. It is sampled at a blurred
 * detail level so the baked-in stars (the sky already has its own, at their true brightness) melt into a glow and only
 * the band and its dust lanes remain. The longitude seam would give the hardware a huge texture gradient across one row of
 * pixels, so the gradient is taken from whichever of two seams is far away.
 */
export const MW_FS_PHOTO = `uniform sampler2D uMap;uniform float uVis,uGain,uBlur;varying vec3 vD;varying float vH;
void main(){
vec3 d=normalize(vD);
float gx=-0.0548755604*d.x-0.8734370902*d.y-0.4838350155*d.z;
float gy=0.4941094279*d.x-0.4448296300*d.y+0.7469822445*d.z;
float gz=-0.8676661490*d.x-0.1980763734*d.y+0.4559837762*d.z;
float u=.5-atan(gy,gx)/6.2831853,v=.5+asin(clamp(gz,-1.,1.))/3.14159265;
float du=min(fwidth(u),fwidth(fract(u+.5)))*uBlur,dv=fwidth(v)*uBlur;
vec3 c=textureGrad(uMap,vec2(u,v),vec2(du,0.),vec2(0.,dv)).rgb;
float fade=smoothstep(0.,.14,vH);
gl_FragColor=vec4(c*uGain,clamp(uVis*fade,0.,1.));}`;
export const MW_FS_LIGHT = mwFragment(true);
