/** Asteroids and comets: Kepler's equation is solved per point in the vertex shader (uJD = days since J2000). */
export const AVS = `attribute vec4 aE1;attribute vec4 aE2;uniform float uJD,uPx,uSize;varying vec3 vC;uniform vec3 uCol;
void main(){float a=aE1.x,e=aE1.y,I=aE1.z,Om=aE1.w,w=aE2.x;
float n=.01720209895/(a*sqrt(a));float M=mod(aE2.y+n*(uJD-aE2.z),6.2831853);
float E=e>.8?3.14159265:M;for(int k=0;k<10;k++){E-=(E-e*sin(E)-M)/(1.-e*cos(E));}
float xv=a*(cos(E)-e),yv=a*sqrt(1.-e*e)*sin(E);float cw=cos(w),sw=sin(w),cO=cos(Om),sO=sin(Om),cI=cos(I),sI=sin(I);
vec3 p=vec3((cw*cO-sw*sO*cI)*xv+(-sw*cO-cw*sO*cI)*yv,(cw*sO+sw*cO*cI)*xv+(-sw*sO+cw*cO*cI)*yv,sw*sI*xv+cw*sI*yv);
gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,p.z,-p.y,1.);
float f=aE2.w;vC=f<.5?uCol:f<1.5?vec3(1.,.62,.25):f<2.5?vec3(1.,.28,.25):vec3(.45,.92,1.);gl_PointSize=uSize*uPx*(f>2.5?1.5:1.);}`;
export const AFS = `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,smoothstep(1.,.2,d)*.5);}`;
