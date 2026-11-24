import * as THREE from 'three';
import { U } from '@/engine';
import { sim } from '@/engine';

/** Differential rotation (inner stars orbit faster) runs in the vertex shader. */
export const VS = `attribute float aRho;attribute float aAng;attribute float aY;attribute float aSize;attribute vec3 aCol;
uniform float uTime,uScale,uPx,uF,uSz;varying vec3 vC;
void main(){float a=aAng+uTime/(.5+aRho);vec3 p=vec3(cos(a)*aRho,aY,sin(a)*aRho)*uScale;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
float s=uF/max(-mv.z,1e-4);gl_PointSize=aSize*uSz*uPx*(1.+min(1.6,s*.04));vC=aCol;}`;
export const FS = `uniform float uAlpha;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=smoothstep(1.,.15,d)*uAlpha;gl_FragColor=vec4(vC,a);}`;

export function galaxyMat(scale: number, sz: number, alpha: number) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uScale: { value: scale }, uPx: U.uPx, uF: U.uF, uSz: { value: sz }, uAlpha: { value: alpha } },
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
}
/** Shared galaxy spin phase, driven by the simulation's capped time. */
export const spinTime = () => sim.gt * .1;
export const rgb01 = (c: number[]) => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255);
