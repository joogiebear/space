import * as THREE from 'three';
import { U } from './gl';

const VERT = 'attribute vec3 aCol;attribute float aSize;uniform float uPx;varying vec3 vC;void main(){vC=aCol;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPx;}';
const FRAG = 'uniform float uRing;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float g=pow(1.-d,2.2);float r=smoothstep(.62,.7,d)*(1.-smoothstep(.9,1.,d));float a=uRing>.5?r+g*.25:g;gl_FragColor=vec4(vC,a);}';

/** A fixed set of constant-pixel-size glowing dots or rings (selection rings, markers). */
export class Markers {
  readonly points: THREE.Points;
  private pos: THREE.BufferAttribute;
  private col: THREE.BufferAttribute;
  private size: THREE.BufferAttribute;

  constructor(readonly n: number, ring = false) {
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    this.col = new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3);
    this.size = new THREE.BufferAttribute(new Float32Array(n), 1);
    g.setAttribute('position', this.pos); g.setAttribute('aCol', this.col); g.setAttribute('aSize', this.size);
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: U.uPx, uRing: { value: ring ? 1 : 0 } },
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: VERT, fragmentShader: FRAG,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  set(i: number, x: number, y: number, z: number, col: ArrayLike<number>, size: number) {
    this.pos.setXYZ(i, x, y, z); this.col.setXYZ(i, col[0], col[1], col[2]); this.size.setX(i, size);
    this.pos.needsUpdate = this.col.needsUpdate = this.size.needsUpdate = true;
  }

  hide(i: number) { this.size.setX(i, 0); this.size.needsUpdate = true; }
}
