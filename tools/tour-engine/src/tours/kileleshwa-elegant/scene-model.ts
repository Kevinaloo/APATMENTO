/* The apartment shell (floors, walls, door frames, tray ceilings, curtains)
   and the geometry helpers the furnishing modules share.

   Ported from the Kileleshwa viewer. Unchanged apart from two things: the
   curve resolution follows the engine's quality ('low' gives every part
   fewer facets, never fewer parts), and nothing is merged here — the
   engine merges by room after the build so each room can be culled. */
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Obstacle,Quality} from '../../contract';
import {makeMaterials} from './scene-materials';
import {sceneRooms,reflectX} from './data';

type Segments={cyl:number;sphere:[number,number];torus:[number,number];tubeRadial:number;rounded:number;cloth:number};
const SEGMENTS:Record<Quality,Segments>={
 high:{cyl:28,sphere:[20,12],torus:[8,40],tubeRadial:6,rounded:2,cloth:1},
 // Draped cloth keeps enough columns per pleat that the folds still read as folds.
 low:{cyl:16,sphere:[14,9],torus:[6,24],tubeRadial:5,rounded:1,cloth:.66},
};

export function buildApartment(quality:Quality){
 const seg=SEGMENTS[quality];
 const root=new T.Group(),contents=new T.Group(),walls=new T.Group(),ceilings=new T.Group(),lowWalls=new T.Group();root.add(contents,walls,ceilings,lowWalls);
 const m=makeMaterials(),collisions:Obstacle[]=[];
 const box=(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material,r=0)=>{const mesh=new T.Mesh(r?new RoundedBoxGeometry(w,h,d,seg.rounded,Math.min(r,w/2,h/2,d/2)):new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const sphere=(g:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:T.Material)=>{const mesh=new T.Mesh(new T.SphereGeometry(1,seg.sphere[0],seg.sphere[1]),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const cyl=(g:T.Object3D,r1:number,r2:number,h:number,x:number,y:number,z:number,mat:T.Material)=>{const mesh=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg.cyl),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const tube=(g:T.Object3D,points:number[][],r:number,mat:T.Material)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2])));const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(6,points.length*4),r,seg.tubeRadial,false),mat);mesh.castShadow=true;g.add(mesh);return mesh;};
 const torus=(g:T.Object3D,r:number,t:number,x:number,y:number,z:number,mat:T.Material)=>{const mesh=new T.Mesh(new T.TorusGeometry(r,t,seg.torus[0],seg.torus[1]),mat);mesh.position.set(x,y,z);mesh.castShadow=true;g.add(mesh);return mesh;};
 const group=(x:number,z:number,rot=0)=>{const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;contents.add(g);return g;};
 const obstacle=(x:number,z:number,w:number,d:number)=>collisions.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
 /** Segment count for a draped cloth surface at this quality. */
 const cloth=(n:number)=>Math.max(4,Math.ceil(n*seg.cloth));
 function floor(x:number,z:number,w:number,d:number,wood=false){box(contents,w+.08,.14,d+.08,x+w/2,-.09,z+d/2,m.taupe);const mat=(wood?m.timber:m.marble).clone();mat.map=mat.map!.clone();mat.map.repeat.set(w/(wood?1.2:.65),d/(wood?2:.65));const plane=new T.Mesh(new T.PlaneGeometry(w,d),mat);plane.rotation.x=-Math.PI/2;plane.position.set(x+w/2,.002,z+d/2);plane.receiveShadow=true;contents.add(plane);const ceiling=box(ceilings,w,.06,d,x+w/2,2.85,z+d/2,m.plaster);ceiling.castShadow=false;}
 sceneRooms.forEach(r=>floor(r.x,r.z,r.w,r.d,r.id==='bedroom'));
 function wall(x1:number,z1:number,x2:number,z2:number,mat:T.Material=m.plaster){const len=Math.hypot(x2-x1,z2-z1),x=(x1+x2)/2,z=(z1+z2)/2,a=-Math.atan2(z2-z1,x2-x1);box(walls,len+.1,2.85,.1,x,1.425,z,mat).rotation.y=a;box(lowWalls,len+.1,.18,.11,x,.09,z,mat).rotation.y=a;box(walls,len+.1,.085,.135,x,.044,z,m.edge).rotation.y=a;collisions.push({x1:Math.min(x1,x2)-.05,x2:Math.max(x1,x2)+.05,z1:Math.min(z1,z2)-.05,z2:Math.max(z1,z2)+.05});}
 function lintel(x:number,z:number,width:number,rot=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;walls.add(g);box(g,width,.52,.12,0,2.59,0,m.plaster);for(const side of [-1,1])box(g,.06,2.32,.15,side*width/2,1.16,0,m.oak);box(g,width+.1,.06,.15,0,2.32,0,m.oak);}
 // Connections beyond the photographed rooms are approximate, documented in the viewer.
 ([[0,-3.8,0,6.4],[0,6.4,3.7,6.4],[3.7,1.5,3.7,6.4],[3.7,-2.6,3.7,.48],[3.7,-2.6,4.9,-2.6],[3.7,1.8,4.9,1.8],[4.9,1.5,4.9,4],[4.9,-2.6,4.9,-1.95],[4.9,-.85,4.9,.48],[4.9,4,8.5,4],[8.5,0,8.5,4],[4.9,0,8.5,0],[4.9,-2.6,7.3,-2.6],[7.3,-2.6,7.3,0],[0,-3.8,3.7,-3.8],[3.7,-3.8,3.7,-2.6],[0,-2.6,2.95,-2.6]] as [number,number,number,number][]).forEach(v=>wall(...v));
 lintel(3.7,.99,1.02,Math.PI/2);lintel(4.9,.99,1.02,Math.PI/2);lintel(4.9,-1.4,1.1,Math.PI/2);lintel(3.325,-2.6,.75);
 // Recessed tray ceilings and skirting, kept out of dollhouse views.
 for(const [x,z,w,d] of [[1.85,3.2,3.7,6.4],[6.7,2,3.6,4]]){
   for(const side of [-1,1]){box(ceilings,.24,.18,d,x+side*(w/2-.12),2.72,z,m.plaster);box(ceilings,w,.18,.22,x,2.72,z+side*(d/2-.11),m.plaster);}
   for(const zz of [z-d*.3,z,z+d*.3])for(const xx of [x-w/2+.18,x+w/2-.18]){cyl(ceilings,.045,.045,.009,xx,2.623,zz,m.glow);cyl(ceilings,.054,.054,.011,xx,2.632,zz,m.white);}
 }
 function curtain(x:number,z:number,w:number,h:number,rot=0){const geom=new T.PlaneGeometry(w,h,cloth(w*60),cloth(24)),p=geom.attributes.position;for(let i=0;i<p.count;i++){const u=(p.getX(i)/w+.5);p.setZ(i,Math.sin(u*Math.PI*2*Math.round(w/.15))*.052);p.setY(i,p.getY(i)+.014*Math.sin(u*61)*(1-(p.getY(i)/h+.5)));}geom.computeVertexNormals();const mesh=new T.Mesh(geom,m.curtain);mesh.position.set(x,h/2+.07,z);mesh.rotation.y=rot;mesh.castShadow=mesh.receiveShadow=true;contents.add(mesh);const rail=cyl(contents,.014,.014,w+.12,x,h+.13,z,m.black);rail.rotation.z=Math.PI/2;return mesh;}
 curtain(1.85,6.29,3.53,2.55);curtain(8.38,2.6,2.55,2.58,Math.PI/2);
 return {root,contents,walls,ceilings,lowWalls,m,collisions,box,sphere,cyl,tube,group,obstacle,torus,curtain,cloth};
}
export type Model=ReturnType<typeof buildApartment>;

// Convert authored room coordinates to the entry-facing orientation in the photos.
export function orientModel(model:Model){model.root.scale.x=-1;model.root.position.x=8.5;for(const obstacle of model.collisions){const left=obstacle.x1;obstacle.x1=reflectX(obstacle.x2);obstacle.x2=reflectX(left);}}
