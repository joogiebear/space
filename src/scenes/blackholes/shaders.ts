import * as THREE from 'three';

/** A quad whose corners run -1..1; the pictures are drawn in the fragment shader. */
export const VS = `varying vec2 vUv;void main(){vUv=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

/**
 * A black hole as it would look with a glowing disc of gas around it. The picture is in units of the horizon radius, and the
 * whole quad reaches nine of them. Three things are drawn the way real light behaves, in simplified form:
 *  - the disc, seen tilted, brighter and hotter toward the inside, and brighter on the side that moves toward us;
 *  - the far side of the disc, whose light the hole bends over the top and under the bottom;
 *  - a dark shadow about 2.6 horizon radii across, ringed by a thin bright photon ring.
 * It is an illustration, not a ray-traced render.
 */
export const BH_FS = `uniform float uTime,uCos,uSeed;uniform vec3 uOuter,uInner;varying vec2 vUv;
float prof(float r){return pow(3./r,2.3)*smoothstep(8.8,6.,r)*smoothstep(2.85,3.3,r);}
vec3 ramp(float r){return mix(uOuter,uInner,clamp(pow(3./r,1.1),0.,1.));}
float streak(float r,float a){float s=a+uTime*2.2/pow(r,1.5)+uSeed;return .72+.18*sin(s*5.+r*.7)+.1*sin(s*11.-r*1.3);}
void main(){
  vec2 p=vUv*9.;float r=length(p);
  vec3 col=vec3(0.);
  vec2 q=vec2(p.x,p.y/uCos);float rd=length(q);
  float dm=prof(rd);
  float beam=pow(clamp(1.+.5*q.x/max(rd,.001),.2,2.),1.8);
  col+=ramp(rd)*dm*streak(rd,atan(q.y,q.x))*beam*2.1;
  float r2=r*1.25,dm2=prof(r2);
  float vert=smoothstep(0.,.75,abs(p.y)/max(r,.001));
  col+=ramp(r2)*dm2*(.35+.65*vert)*streak(r2,atan(p.y,p.x))*.9*(p.y>0.?1.:.55);
  float ring=exp(-pow((r-2.78)/.09,2.));
  col+=mix(uInner,vec3(1.),.5)*ring*(.8+.4*p.x/max(r,.001))*.9;
  col+=uOuter*exp(-r*.45)*.06;
  col*=smoothstep(9.,7.2,r);
  float front=step(p.y,0.)*clamp(dm*3.,0.,1.);
  float sh=(1.-smoothstep(2.55,2.7,r))*(1.-front);
  col=1.-exp(-col*1.3);
  gl_FragColor=vec4(col*(1.-sh),sh);
}`;

/** A pulsar: a tiny bright core, a faint wind of particles, and two beams sweeping round like a lighthouse. */
export const PULSAR_FS = `uniform float uTime;uniform vec3 uCol;varying vec2 vUv;
void main(){
  vec2 p=vUv;float r=length(p);
  vec3 col=vec3(.8,.9,1.)*(exp(-r*r*900.)*2.5+exp(-r*r*120.)*.5+exp(-r*r*9.)*.12);
  float ang=uTime*2.4+.5;
  for(int k=0;k<2;k++){
    float s=k==0?1.:-1.;vec2 d=vec2(cos(ang),sin(ang))*s;
    float al=dot(p,d),pe=dot(p,vec2(-d.y,d.x)),w=.012+.09*max(al,0.);
    float b=al>0.?exp(-pow(pe/w,2.))*(1.-smoothstep(0.,.95,al)):0.;
    col+=uCol*b*.9;
  }
  col+=uCol*exp(-r*r*5.)*.06;
  col*=smoothstep(1.,.8,r);
  gl_FragColor=vec4(1.-exp(-col*1.2),1.);
}`;

/** Light is added to what is behind, and the shadow (alpha) blocks what is behind it. */
const over = {
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
};

export function blackHoleMat(outer: number[], inner: number[], tiltDeg: number, seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCos: { value: Math.max(0.12, Math.cos((tiltDeg * Math.PI) / 180)) },
      uSeed: { value: seed },
      uOuter: { value: new THREE.Vector3(...outer) },
      uInner: { value: new THREE.Vector3(...inner) },
    },
    vertexShader: VS,
    fragmentShader: BH_FS,
    ...over,
  });
}

export function pulsarMat(color: number[]) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Vector3(...color) } },
    vertexShader: VS,
    fragmentShader: PULSAR_FS,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

/** A real picture on a quad, faded to nothing at the round edge so no square shows against the sky. */
export const EHT_FS = `uniform sampler2D uMap;varying vec2 vUv;
void main(){float a=smoothstep(1.,.78,length(vUv));vec3 c=texture2D(uMap,vUv*.5+.5).rgb;gl_FragColor=vec4(c*a,a);}`;

export function ehtMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null } },
    vertexShader: VS,
    fragmentShader: EHT_FS,
    ...over,
  });
}
