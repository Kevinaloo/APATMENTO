import {sceneRooms,planBounds,reflectX} from './data';
import type {Obstacle} from './scene-model';
export const PLAYER_RADIUS=.16;
export function insideApartment(x:number,z:number){x=reflectX(x);return sceneRooms.some(r=>x>r.x+.055&&x<r.x+r.w-.055&&z>r.z+.055&&z<r.z+r.d-.055)||
 // Contiguous open floors and door thresholds bridge the small wall-edge margins.
 (x>.07&&x<3.63&&z>-2.53&&z<6.33)||
 (x>3.55&&x<5.04&&z>.55&&z<1.43)||
 (x>4.75&&x<5.10&&z>-1.88&&z<-.92)||
 (x>3.01&&x<3.63&&z>-2.76&&z<-2.44);
}
export function createNavigation(collisions:Obstacle[]){
 const blocked=(x:number,z:number)=>!insideApartment(x,z)||collisions.some(o=>{const px=Math.max(o.x1,Math.min(x,o.x2)),pz=Math.max(o.z1,Math.min(z,o.z2));return(x-px)**2+(z-pz)**2<PLAYER_RADIUS**2;});
 const step=.12,minX=planBounds.minX,minZ=planBounds.minZ,cols=Math.ceil((planBounds.maxX-minX)/step)+1,rows=Math.ceil((planBounds.maxZ-minZ)/step)+1;
 const xy=(index:number):[number,number]=>[minX+(index%cols)*step,minZ+Math.floor(index/cols)*step];
 const key=(x:number,z:number)=>Math.max(0,Math.min(rows-1,Math.round((z-minZ)/step)))*cols+Math.max(0,Math.min(cols-1,Math.round((x-minX)/step)));
 const free=new Uint8Array(cols*rows);for(let i=0;i<free.length;i++)free[i]=blocked(...xy(i))?0:1;
 function segment(a:number[],b:number[]){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/.045);for(let i=0;i<=n;i++){const t=n?i/n:0;if(blocked(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;}
 function nearest(point:number[]){const at=key(point[0],point[1]);if(free[at]&&segment(point,xy(at)))return at;let best=-1,dist=Infinity;for(let i=0;i<free.length;i++){if(!free[i])continue;const p=xy(i),d=Math.hypot(p[0]-point[0],p[1]-point[1]);if(d<dist&&d<.65&&segment(point,p)){dist=d;best=i;}}return best;}
 function path(from:[number,number],to:[number,number]):[number,number][]|null{
  if(blocked(...from)||blocked(...to))return null;
  if(segment(from,to))return [from,to];
  const start=nearest(from),end=nearest(to);if(start<0||end<0)return null;
  const previous=new Int32Array(free.length).fill(-1),queue=[start];previous[start]=start;
  for(let qi=0;qi<queue.length&&previous[end]===-1;qi++){const k=queue[qi],col=k%cols,row=Math.floor(k/cols);for(const next of [col>0?k-1:-1,col<cols-1?k+1:-1,row>0?k-cols:-1,row<rows-1?k+cols:-1])if(next>=0&&free[next]&&previous[next]===-1){previous[next]=k;queue.push(next);}}
  if(previous[end]===-1)return null;
  const raw:[number,number][]=[to];for(let at=end;at!==start;at=previous[at])raw.push(xy(at));raw.push(from);raw.reverse();
  const result=[from];let anchor=0;while(anchor<raw.length-1){let furthest=anchor+1;for(let i=anchor+2;i<raw.length;i++){if(segment(raw[anchor],raw[i]))furthest=i;}result.push(raw[furthest]);anchor=furthest;}
  return result;
 }
 return {blocked,path,segment};
}
export function roomAt(x:number,z:number){
 x=reflectX(x);
 if(x>=4.9)return z<0?'bathroom':'bedroom';
 if(x>=3.7)return 'hall';
 if(z<-2.6)return 'utility';
 if(z<0)return 'kitchen';
 return z<1.8?'dining':'living';
}
