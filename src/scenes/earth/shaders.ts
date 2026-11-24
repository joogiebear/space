/** Satellites: two-body Kepler propagation plus J2 secular drift of RAAN, argument of perigee and mean motion,
 *  evaluated per point in the vertex shader from TLE mean elements. aE1 = (inc, raan, ecc, argp), aE2 = (M0, n rev/min, epoch, category). */
export const SVS = `attribute vec4 aE1;attribute vec4 aE2;attribute vec3 aCol;attribute float aSize;uniform float uDays,uPx;uniform float uVis[8];varying vec3 vC;varying float vF;
void main(){float cat=aE2.w;if(uVis[int(cat+.5)]<.5){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
float inc=aE1.x,e=aE1.z;float n=aE2.y/60.;float a=pow(398600.4418/(n*n),1./3.);float dt=(uDays-aE2.z)*86400.;
float p=a*(1.-e*e);float k=1.5*.00108262668*pow(6378.137/p,2.);float ci=cos(inc);
float Om=aE1.y-k*n*ci*dt;float w=aE1.w+.5*k*n*(5.*ci*ci-1.)*dt;float M=mod(aE2.x+n*(1.+.5*k*sqrt(1.-e*e)*(3.*ci*ci-1.))*dt,6.2831853);
float E=e>.8?3.14159265:M;for(int i=0;i<7;i++){E-=(E-e*sin(E)-M)/(1.-e*cos(E));}
float xv=a*(cos(E)-e),yv=a*sqrt(1.-e*e)*sin(E);float cw=cos(w),sw=sin(w),cO=cos(Om),sO=sin(Om),sI=sin(inc);
vec3 r=vec3((cw*cO-sw*sO*ci)*xv+(-sw*cO-cw*sO*ci)*yv,(cw*sO+sw*cO*ci)*xv+(-sw*sO+cw*cO*ci)*yv,sw*sI*xv+cw*sI*yv)/6371.;
gl_Position=projectionMatrix*modelViewMatrix*vec4(r.x,r.z,-r.y,1.);gl_PointSize=aSize*uPx;vC=aCol;}`;
export const SFS = `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,smoothstep(1.,.3,d));}`;
