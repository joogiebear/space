import * as THREE from 'three';
import type { GalaxyPhoto } from './photos';

/** Most a photograph is stretched across its minor axis when it is turned face-on: beyond this stars smear too much. */
export const MAX_STRETCH = 3;

/** How much to stretch the minor axis to undo a disc seen at `inclinationDeg` (0 face-on, 90 edge-on). */
export const deprojection = (inclinationDeg: number) =>
  Math.min(MAX_STRETCH, 1 / Math.max(Math.cos((inclinationDeg * Math.PI) / 180), 1e-3));

/**
 * Where a point of the galaxy's own plane (x along the disc's major axis, y across it, in world units) falls in the
 * photograph, as fractions of its width and height from the bottom left. This is the shader's maths in plain code.
 * The photograph shows the disc tilted by its real inclination, so across the major axis a point is where it is, and
 * across the minor axis it is `stretch` times closer to the middle; then the picture's own tilt on the page is undone.
 */
export function planeToUv(
  x: number,
  y: number,
  p: Pick<GalaxyPhoto, 'angle' | 'inclination'>,
  width: number,
  aspect: number,
): [number, number] {
  const s = deprojection(p.inclination ?? 0),
    a = ((p.angle ?? 0) * Math.PI) / 180,
    mx = x,
    my = y / s;
  const qx = Math.cos(a) * mx - Math.sin(a) * my,
    qy = Math.sin(a) * mx + Math.cos(a) * my;
  return [0.5 + qx / width, 0.5 + (qy * aspect) / width];
}

const VS = `varying vec2 vP;uniform float uH;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FS = `uniform sampler2D uMap;uniform float uOpacity,uWidth,uAspect,uStretch;uniform vec2 uRot;uniform vec4 uCrop;varying vec2 vP;
void main(){
vec2 m=vec2(vP.x,-vP.y/uStretch);
vec2 q=vec2(uRot.x*m.x-uRot.y*m.y,uRot.y*m.x+uRot.x*m.y);
vec2 uv=vec2(.5)+vec2(q.x,q.y*uAspect)/uWidth;
if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;
// a round window on the galaxy's own plane: the stretched corners of the picture are mostly smeared background
float edge=(1.-smoothstep(.55,1.,length(vP)/(uWidth*.5)))*(1.-smoothstep(.8,1.,length((uv-.5)*2.)));
vec3 c=texture2D(uMap,uCrop.xy+uv*uCrop.zw).rgb;
gl_FragColor=vec4(c,edge*uOpacity);}`;

/**
 * The photograph as a flat disc in the galaxy's own plane, turned face-on (deprojected) so that, from the angle the
 * model galaxy is tilted to, it looks like the photograph. Give it the same rotation as the galaxy's stars.
 */
export function photoPlane(width: number, photo: GalaxyPhoto) {
  const half = width * 0.75 * Math.max(1, deprojection(photo.inclination ?? 0)),
    a = ((photo.angle ?? 0) * Math.PI) / 180;
  const geo = new THREE.PlaneGeometry(half * 2, half * 2);
  geo.rotateX(-Math.PI / 2); // lie in the galaxy's plane (x, z)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null as THREE.Texture | null },
      uOpacity: { value: 0 },
      uH: { value: half },
      uWidth: { value: width },
      uAspect: { value: 1 },
      uStretch: { value: deprojection(photo.inclination ?? 0) },
      uRot: { value: new THREE.Vector2(Math.cos(a), Math.sin(a)) },
      uCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
    },
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}
