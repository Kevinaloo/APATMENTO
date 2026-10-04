/* The Shikaz Homes shell (floors, walls, doorways, windows, the entrance
   door) and the geometry helpers the furnishing modules share.

   Ported from the Shikaz viewer. Unchanged apart from three things: the
   curve resolution follows the engine's quality ('low' gives every part
   fewer facets, never fewer parts), nothing is merged here — the engine
   merges by room after the build so each room can be culled — and the
   photographs load from the tour's own photo URL.

   The old viewer never mirrored or moved its root, so the coordinates
   authored here are already world coordinates. */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Obstacle, Quality } from '../../contract';
import { makeMaterials } from './scene-materials';

type Segments={cyl:number;sphere:[number,number];tiny:[number,number];torus:[number,number];tubeRadial:number;rounded:number;lathe:number;cloth:number};
const SEGMENTS:Record<Quality,Segments>={
  high:{cyl:24,sphere:[20,14],tiny:[8,6],torus:[Infinity,Infinity],tubeRadial:6,rounded:2,lathe:Infinity,cloth:1},
  // Curtain pleats and button tufts keep enough vertices per fold to still read as folds.
  low:{cyl:16,sphere:[14,9],tiny:[8,6],torus:[6,24],tubeRadial:5,rounded:1,lathe:24,cloth:.75},
};

/** The rooms as floor rectangles: the walkable floor, and which room a point is in. */
export const zones=[
  {id:'living',x:0,z:0,w:4.2,d:4.25},{id:'dining',x:0,z:4.25,w:4.2,d:1.55},
  {id:'entry',x:0,z:5.8,w:1.3,d:2.7},{id:'kitchen',x:1.3,z:5.8,w:2.9,d:2.7},
  {id:'hall',x:-1.55,z:2.5,w:1.55,d:4.2},{id:'bedroom2',x:-4.85,z:.25,w:3.3,d:3.3},
  {id:'shower',x:-3.65,z:3.55,w:2.1,d:1.35},{id:'toilet',x:-3.65,z:4.9,w:2.1,d:1.5},
  {id:'bedroom',x:-4.85,z:6.7,w:4.85,d:3.65},
];

export function buildApartment(manager:T.LoadingManager,quality:Quality,photoUrl:(id:number)=>string) {
  const seg=SEGMENTS[quality];
  const root=new T.Group(),contents=new T.Group(),walls=new T.Group(),ceilings=new T.Group(),lowWalls=new T.Group();
  root.add(contents,walls,ceilings,lowWalls);
  const m=makeMaterials(),collisions:Obstacle[]=[];
  const loader=new T.TextureLoader(manager),photos=new Map<number,T.Texture>();
  /** A torus's (radial, tubular) segments: as authored, capped under 'low'. */
  const torusSeg=(radial:number,tubular:number):[number,number]=>[Math.min(radial,seg.torus[0]),Math.min(tubular,seg.torus[1])];
  /** A lathe's segments around its axis: as authored, capped under 'low'. */
  const latheSeg=(n:number)=>Math.min(n,seg.lathe);
  /** A cylinder's radial segments, scaled from the 24 the shared helper uses at full quality. */
  const radial=(n:number)=>Math.round(n*seg.cyl/24);
  /** Segment count along a draped, pleated or tufted cloth surface at this quality. */
  const cloth=(n:number)=>Math.max(4,Math.ceil(n*seg.cloth));

  function box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material,r=0) {
    const o=new T.Mesh(r?new RoundedBoxGeometry(w,h,d,seg.rounded,Math.min(r,w/2,h/2,d/2)):new T.BoxGeometry(w,h,d),mat);
    o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;
  }
  function sphere(g:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:T.Material) {
    // Studs, buttons and sprinkler holes are a few millimetres across: they stay coarse and cast no shadow.
    const tiny=Math.max(sx,sy,sz)<.03,[ws,hs]=tiny?seg.tiny:seg.sphere;
    const o=new T.Mesh(new T.SphereGeometry(1,ws,hs),mat);
    o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=!tiny;o.receiveShadow=true;g.add(o);return o;
  }
  function cyl(g:T.Object3D,r1:number,r2:number,h:number,x:number,y:number,z:number,mat:T.Material) {
    const o=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg.cyl),mat);
    o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;
  }
  function tube(g:T.Object3D,points:number[][],r:number,mat:T.Material) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2])));
    const o=new T.Mesh(new T.TubeGeometry(curve,Math.max(8,points.length*3),r,seg.tubeRadial,false),mat);
    // Hairline tubes (stems, window grilles, piping) are too thin to throw a shadow worth its cost.
    o.castShadow=r>.012;o.receiveShadow=true;g.add(o);return o;
  }
  function group(x:number,z:number,rot=0,parent:T.Object3D=contents) {
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;parent.add(g);return g;
  }
  const obstacle=(x:number,z:number,w:number,d:number)=>collisions.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
  function plane(g:T.Object3D,w:number,h:number,x:number,y:number,z:number,mat:T.Material,rot=0) {
    const o=new T.Mesh(new T.PlaneGeometry(w,h),mat);o.position.set(x,y,z);o.rotation.y=rot;o.receiveShadow=true;g.add(o);return o;
  }

  /* Floors: a dark slab, marble tiles laid on the diagonal, and the ceiling above. */
  function floor(x:number,z:number,w:number,d:number) {
    box(contents,w,.16,d,x+w/2,-.095,z+d/2,m.dark);
    const mat=m.marble.clone();mat.map=m.marble.map!.clone();mat.map.repeat.set(w/.45,d/.45);mat.map.rotation=Math.PI/4;mat.map.center.set(.5,.5);
    const o=plane(contents,w,d,x+w/2,0,z+d/2,mat);o.rotation.x=-Math.PI/2;
    const roof=box(ceilings,w,.06,d,x+w/2,2.78,z+d/2,m.plaster);roof.castShadow=false;
  }
  floor(0,0,4.2,8.5);floor(-1.55,2.5,1.55,4.2);floor(-4.85,.25,3.3,3.3);floor(-3.65,3.55,2.1,2.85);floor(-4.85,6.7,4.85,3.65);

  /* Walls: the full-height wall with its cornice and marble skirting, and a knee-height stub for the dollhouse. */
  function wall(x1:number,z1:number,x2:number,z2:number) {
    const len=Math.hypot(x2-x1,z2-z1),x=(x1+x2)/2,z=(z1+z2)/2,a=-Math.atan2(z2-z1,x2-x1);
    box(walls,len+.14,2.75,.14,x,1.375,z,m.mint).rotation.y=a;
    box(lowWalls,len+.14,.15,.15,x,.075,z,m.mint).rotation.y=a;
    box(walls,len+.14,.085,.175,x,2.68,z,m.plaster).rotation.y=a;
    box(walls,len+.14,.095,.175,x,.052,z,m.marble).rotation.y=a;
    collisions.push({x1:Math.min(x1,x2)-.07,x2:Math.max(x1,x2)+.07,z1:Math.min(z1,z2)-.07,z2:Math.max(z1,z2)+.07});
  }
  ([
    // Lounge and dining, with the opening to the hall beside the TV wall and the entrance end.
    [0,0,4.2,0],[4.2,0,4.2,8.5],[0,0,0,3.55],[0,4.65,0,8.5],[0,8.5,4.2,8.5],
    // Kitchen, off the entrance.
    [1.3,5.8,1.3,6.5],[1.3,7.65,1.3,8.5],[1.3,5.8,4.2,5.8],
    // The private hallway and its three doors.
    [-1.55,2.5,0,2.5],[-1.55,3.5,-1.55,3.78],[-1.55,4.7,-1.55,5.1],[-1.55,6.02,-1.55,6.7],
    // Second bedroom.
    [-1.55,.25,-1.55,2.52],[-4.85,.25,-1.55,.25],[-4.85,.25,-4.85,3.55],[-4.85,3.55,-1.55,3.55],
    // Shower and WC.
    [-3.65,3.55,-3.65,6.4],[-3.65,4.9,-1.55,4.9],[-3.65,6.4,-1.55,6.4],
    // Main bedroom.
    [-4.85,6.7,-1.2,6.7],[-.18,6.7,0,6.7],[-4.85,6.7,-4.85,10.35],[-4.85,10.35,0,10.35],[0,6.7,0,10.35],
  ] as [number,number,number,number][]).forEach(a=>wall(...a));

  /* A doorway: lintel and white architrave, and for the private rooms a panelled leaf standing open. */
  function doorway(x:number,z:number,w:number,rot=0,door=false) {
    const g=group(x,z,rot,walls);
    box(g,w+.14,.49,.16,0,2.505,0,m.mint);
    for(const xx of [-w/2,w/2])box(g,.065,2.3,.2,xx,1.15,0,m.white);
    box(g,w+.12,.06,.2,0,2.27,0,m.white);
    if(door) {
      const leaf=new T.Group();leaf.position.x=-w/2;leaf.rotation.y=-Math.PI*.49;g.add(leaf);
      box(leaf,w-.07,2.2,.045,(w-.07)/2,1.1,0,m.white,.012);
      for(const yy of [.5,1.5])box(leaf,w-.23,.75,.065,(w-.07)/2,yy,0,m.white,.03);
      tube(leaf,[[w-.15,1,.03],[w-.15,1,.09],[w-.27,1,.09]],.013,m.chrome);
    }
  }
  doorway(0,4.1,1.1,Math.PI/2);doorway(1.3,7.075,1.15,Math.PI/2);
  doorway(-1.55,3.01,.98,Math.PI/2,true);doorway(-1.55,4.24,.92,Math.PI/2,true);doorway(-1.55,5.56,.92,Math.PI/2,true);doorway(-.69,6.7,1.02,0,true);

  // The timber entrance door at the far end of the entry, with its gold lever.
  box(walls,.97,2.22,.08,.65,1.11,8.4,m.wood,.025);
  for(const y of [.5,1.55])box(walls,.77,.75,.03,.65,y,8.345,m.wood,.07);
  tube(walls,[[1,1,8.33],[1,1,8.26],[.88,1,8.26]],.012,m.gold);

  /** A framed print cut from a listing photograph; uv gives the photo's corners (top-left, top-right, bottom-right, bottom-left). */
  function picture(g:T.Object3D,num:number,w:number,h:number,x:number,y:number,z:number,uv:number[][],rot=0) {
    if(!photos.has(num)){const tex=loader.load(photoUrl(num));tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;photos.set(num,tex)}
    const frame=group(x,z,rot,g);box(frame,w+.018,h+.018,.022,0,y,0,m.dark);
    const geom=new T.PlaneGeometry(w,h,1,1),a=geom.attributes.uv;
    for(let i=0;i<a.count;i++){const u=a.getX(i),v=1-a.getY(i);a.setXY(i,(uv[0][0]*(1-u)+uv[1][0]*u)*(1-v)+(uv[3][0]*(1-u)+uv[2][0]*u)*v,1-((uv[0][1]*(1-u)+uv[1][1]*u)*(1-v)+(uv[3][1]*(1-u)+uv[2][1]*u)*v))}
    const mat=new T.MeshStandardMaterial({map:photos.get(num),roughness:.65});
    const o=new T.Mesh(geom,mat);o.position.set(0,y,.013);frame.add(o);return frame;
  }
  /** A pleated curtain panel, centred at (x, y, z), gathered slightly towards its hem. */
  function curtain(x:number,y:number,z:number,w:number,h:number,mat:T.Material=m.curtain,rot=0) {
    const geom=new T.PlaneGeometry(w,h,cloth(Math.ceil(w*60)),cloth(20)),a=geom.attributes.position;
    for(let i=0;i<a.count;i++){const xx=a.getX(i),yy=a.getY(i),u=xx/w+.5;a.setZ(i,Math.sin(u*Math.PI*2*Math.round(w/.13))*.055+Math.sin(u*34+yy*3)*.008);a.setY(i,yy+Math.cos(u*45)*.014*(1-(yy/h+.5)))}
    geom.computeVertexNormals();
    const o=new T.Mesh(geom,mat);o.position.set(x,y,z);o.rotation.y=rot;
    // Sheers let the light through; only the heavy side panels throw a shadow.
    o.castShadow=mat!==m.sheer;o.receiveShadow=true;contents.add(o);return o;
  }
  /** A window: frame, pale glass, glazing bars, a wrought diamond grille, and a sheer between two side panels. */
  function windowSet(x:number,z:number,w:number,h:number,rot=0,blue=false) {
    const g=group(x,z,rot,walls);
    box(g,w+.14,h+.14,.035,0,1.52,0,m.white);
    const glass=new T.MeshBasicMaterial({color:'#d4e0e4'});box(g,w,h,.04,0,1.52,.02,glass);
    for(let xx=-w/2;xx<=w/2+.01;xx+=w/3)box(g,.03,h,.07,xx,1.52,.055,m.white);
    box(g,w,.03,.07,0,1.5,.055,m.white);
    for(let yy=-h/2;yy<h/2;yy+=.38) {
      for(let xx=-w/2+.19;xx<w/2;xx+=.38)tube(g,[[xx-.18,1.52+yy,.08],[xx,1.52+Math.min(h/2,yy+.18),.08],[xx+.18,1.52+yy,.08]],.007,m.dark);
    }
    const rod=cyl(g,.018,.018,w+.45,0,2.55,.22,m.wood);rod.rotation.z=Math.PI/2;
    const put=(xx:number,ww:number,mat:T.Material,offset:number)=>{const gx=x+Math.cos(rot)*xx+Math.sin(rot)*offset,gz=z-Math.sin(rot)*xx+Math.cos(rot)*offset;curtain(gx,1.3,gz,ww,2.43,mat,rot)};
    put(0,w,m.sheer,.16);put(-w/2-.06,.43,blue?m.blue:m.curtain,.24);put(w/2+.06,.43,blue?m.blue:m.curtain,.24);
  }
  // The lounge window (gold curtains), the second bedroom's and the main bedroom's (navy curtains).
  windowSet(2.35,.09,2.1,1.95,0);windowSet(-3.15,.34,1.65,1.72,0,true);windowSet(-4.76,8.85,1.7,1.83,Math.PI/2,true);

  function flowers(g:T.Object3D,x:number,y:number,z:number,gold=true) {
    cyl(g,.065,.052,.2,x,y+.1,z,gold?m.gold:m.white);
    for(let i=0;i<6;i++){const a=i*2.4,px=x+Math.cos(a)*.1,pz=z+Math.sin(a)*.08,py=y+.3+i%3*.045;tube(g,[[x,y+.12,z],[px,py,pz]],.003,m.green);sphere(g,px,py,pz,.025,.02,.025,m.linen)}
  }
  return {root,contents,walls,ceilings,lowWalls,collisions,m,box,sphere,cyl,tube,group,obstacle,picture,curtain,flowers,plane,torusSeg,latheSeg,radial,cloth};
}
export type ApartmentModel=ReturnType<typeof buildApartment>;
