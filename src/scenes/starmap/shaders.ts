/** Stars are sized from absolute magnitude and camera distance on the GPU (apparent magnitude);
 *  exoplanet hosts are drawn as thin rings. */
export const VS = `attribute float aAbs;attribute vec3 aCol;uniform float uPx,uRef,uGain;varying vec3 vC;varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);float d=clamp(length(mv.xyz),.02,uRef);
float m=aAbs+5.*log(d/10.)/2.302585;float sz=clamp((7.2-m+uGain)*1.05,0.,15.);
gl_Position=projectionMatrix*mv;gl_PointSize=sz<.8?0.:max(sz,1.4)*uPx;vC=aCol;vA=clamp(.35+(8.-m+uGain)*.12,.2,1.);}`;
export const FS = `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=pow(1.-d,1.6)*vA;gl_FragColor=vec4(vC*1.1,a);}`;
export const EVS = `attribute vec3 aCol;uniform float uPx;varying vec3 vC;void main(){vC=aCol;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=6.5*uPx;}`;
export const EFS = `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float r=smoothstep(.55,.65,d)*(1.-smoothstep(.85,.97,d));gl_FragColor=vec4(vC,r*.55);}`;
