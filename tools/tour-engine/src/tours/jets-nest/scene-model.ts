/* The apartment shell (floors, walls, door frames, the entrance door),
   the living room and kitchenette furniture, and the geometry helpers the
   furnishing module shares.

   Ported from the Jets Nest viewer. Unchanged apart from three things: the
   curve resolution follows the engine's quality ('low' gives every part
   fewer facets, never fewer parts), nothing is merged here — the engine
   merges by room after the build so each room can be culled — and the
   photographs load from the tour's own photo URL. */
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Obstacle, Quality } from "../../contract";
import { makeMaterials } from "./scene-materials";
import { reflectX } from "./data";

type Segments={cyl:number;sphere:[number,number];tiny:[number,number];torus:[number,number];tubeRadial:number;rounded:number;lathe:number;cloth:number};
const SEGMENTS:Record<Quality,Segments>={
  high:{cyl:24,sphere:[16,12],tiny:[8,6],torus:[Infinity,Infinity],tubeRadial:7,rounded:2,lathe:Infinity,cloth:1},
  // Pleats and button tufts keep enough vertices per fold to still read as folds.
  low:{cyl:16,sphere:[14,9],tiny:[8,6],torus:[6,24],tubeRadial:5,rounded:1,lathe:24,cloth:.7},
};

export function buildApartment(manager:T.LoadingManager,quality:Quality,photoUrl:(id:number)=>string) {
  const seg=SEGMENTS[quality];
  const root=new T.Group(), contents=new T.Group(), walls=new T.Group(), ceilings=new T.Group(), lowWalls=new T.Group();
  root.add(contents,walls,ceilings,lowWalls);
  const m=makeMaterials(), collisions:Obstacle[]=[];
  const loader=new T.TextureLoader(manager);
  const photos=new Map<number,T.Texture>();
  /** A torus's (radial, tubular) segments: as authored, capped under 'low'. */
  const torusSeg=(radial:number,tubular:number):[number,number]=>[Math.min(radial,seg.torus[0]),Math.min(tubular,seg.torus[1])];
  /** A lathe's segments around its axis: as authored, capped under 'low'. */
  const latheSeg=(n:number)=>Math.min(n,seg.lathe);
  /** Segment count along a draped or pleated cloth surface at this quality. */
  const cloth=(n:number)=>Math.max(4,Math.ceil(n*seg.cloth));
  const box=(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material,r=0)=>{
    const geom=r?new RoundedBoxGeometry(w,h,d,seg.rounded,Math.min(r,w/2,h/2,d/2)):new T.BoxGeometry(w,h,d);
    const mesh=new T.Mesh(geom,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
  };
  const sphere=(g:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:T.Material)=>{
    // Studs, buttons and petals are a few millimetres across: they stay coarse and cast no shadow.
    const tiny=Math.max(sx,sy,sz)<.045,[ws,hs]=tiny?seg.tiny:seg.sphere;
    const mesh=new T.Mesh(new T.SphereGeometry(1,ws,hs),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=!tiny;mesh.receiveShadow=true;g.add(mesh);return mesh;
  };
  const cyl=(g:T.Object3D,r1:number,r2:number,h:number,x:number,y:number,z:number,mat:T.Material)=>{
    const o=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg.cyl),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;
  };
  const tube=(g:T.Object3D,points:number[][],r:number,mat:T.Material)=>{
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2])));
    const o=new T.Mesh(new T.TubeGeometry(curve,Math.max(8,points.length*4),r,seg.tubeRadial,false),mat);o.castShadow=true;g.add(o);return o;
  };
  const group=(x:number,z:number,rot=0)=>{const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;contents.add(g);return g};
  const obstacle=(x:number,z:number,w:number,d:number)=>collisions.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
  function floor(x:number,z:number,w:number,d:number) {
    box(contents,w+.12,.12,d+.12,x,-.09,z,m.dark);
    const mat=m.marble.clone();mat.map=m.marble.map!.clone();mat.map.repeat.set(w/.45,d/.45);mat.roughness=.48;
    const o=new T.Mesh(new T.PlaneGeometry(w,d),mat);o.rotation.x=-Math.PI/2;o.position.set(x,.003,z);o.receiveShadow=true;contents.add(o);
    const roof=box(ceilings,w,.06,d,x,2.73,z,m.plaster);roof.castShadow=false;
  }
  function wall(x1:number,z1:number,x2:number,z2:number) {
    const len=Math.hypot(x2-x1,z2-z1),x=(x1+x2)/2,z=(z1+z2)/2,angle=-Math.atan2(z2-z1,x2-x1);
    box(walls,len+.12,2.7,.12,x,1.35,z,m.mint).rotation.y=angle;
    box(lowWalls,len+.12,.20,.13,x,.10,z,m.mint).rotation.y=angle;
    box(walls,len+.12,.07,.145,x,2.64,z,m.plaster).rotation.y=angle;
    box(walls,len+.1,.115,.143,x,.059,z,m.marble).rotation.y=angle;
    collisions.push({x1:Math.min(x1,x2)-.06,x2:Math.max(x1,x2)+.06,z1:Math.min(z1,z2)-.06,z2:Math.max(z1,z2)+.06});
  }
  function lintel(x:number,z:number,width:number,rot=0,wood=false) {
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;walls.add(g);
    box(g,width+.12,.47,.14,0,2.47,0,m.mint);
    if(wood) {
      box(g,.07,2.24,.18,-width/2,1.12,0,m.wood);
      box(g,.07,2.24,.18,width/2,1.12,0,m.wood);
      box(g,width+.10,.08,.18,0,2.21,0,m.wood);
    }
  }
  floor(1.8,2.5,3.6,5);floor(4.525,1.05,1.85,1.9);floor(2.85,-1.25,1.5,2.5);floor(1.05,-1.25,2.1,2.5);floor(1.8,-4.25,3.6,3.5);
  [[0,0,0,5],[0,5,3.6,5],[3.6,1.32,3.6,5],[3.6,0,3.6,.28],[0,0,2.12,0],[3.48,0,3.6,0],[3.6,.1,5.45,.1],[5.45,.1,5.45,2],[3.6,2,5.45,2],[3.6,-2.5,3.6,-1.04],[3.6,-.1,3.6,0],[2.1,-2.5,2.1,-2.0],[2.1,-1,2.1,0],[0,-2.5,0,0],[0,-2.5,2.24,-2.5],[3.3,-2.5,3.6,-2.5],[0,-6,0,-2.5],[0,-6,3.6,-6],[3.6,-6,3.6,-2.5]].forEach(v=>wall(...v as [number,number,number,number]));
  lintel(2.8,0,1.36);lintel(3.6,.8,1.04,Math.PI/2);lintel(2.77,-2.5,1.06,0,true);lintel(2.1,-1.5,1,Math.PI/2,true);lintel(3.6,-.57,.94,Math.PI/2,true);
  const entry=box(walls,.065,2.17,.84,3.6,1.085,-.57,m.wood,.015);obstacle(3.6,-.57,.1,.9);
  for(let y=.55;y<2;y+=.64)box(walls,.08,.46,.62,3.55,y,-.57,m.wood,.045);
  sphere(walls,3.48,1,-.27,.024,.026,.026,m.gold);
  function picture(g:T.Object3D,photo:number,w:number,h:number,x:number,y:number,z:number,uv:number[][],rot=0) {
    if(!photos.has(photo)){const tex=loader.load(photoUrl(photo));tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;photos.set(photo,tex)}
    const frame=new T.Group();frame.position.set(x,y,z);frame.rotation.y=rot;g.add(frame);
    box(frame,w+.018,h+.018,.024,0,0,0,m.black,.006);
    const geom=new T.PlaneGeometry(w,h,16,16),attr=geom.attributes.uv;
    for(let i=0;i<attr.count;i++){const u=1-attr.getX(i),v=1-attr.getY(i);const topX=uv[0][0]*(1-u)+uv[1][0]*u,topY=uv[0][1]*(1-u)+uv[1][1]*u,bottomX=uv[3][0]*(1-u)+uv[2][0]*u,bottomY=uv[3][1]*(1-u)+uv[2][1]*u;attr.setXY(i,topX*(1-v)+bottomX*v,1-(topY*(1-v)+bottomY*v))}
    const mat=new T.MeshStandardMaterial({map:photos.get(photo),roughness:.6,emissive:photo===16?"#ffffff":"#000000",emissiveMap:photo===16?photos.get(photo):null,emissiveIntensity:photo===16?.38:0});
    const mesh=new T.Mesh(geom,mat);mesh.position.z=.014;frame.add(mesh);return frame;
  }
  function curtain(x:number,y:number,z:number,w:number,h:number,mat:T.Material=m.curtain,rot=0) {
    // Five columns per pleat at least, or the pleats turn into zigzags.
    const geom=new T.PlaneGeometry(w,h,Math.max(cloth(100),Math.round(w/.17)*5),cloth(45)),a=geom.attributes.position;
    for(let i=0;i<a.count;i++){const px=a.getX(i),py=a.getY(i),u=(px/w+.5);a.setZ(i,Math.sin(u*Math.PI*2*Math.round(w/.17))*.055+Math.sin(u*52+py*2)*.008);a.setY(i,py+Math.cos(u*37)*.008*(1-(py/h+.5)))}
    geom.computeVertexNormals();const o=new T.Mesh(geom,mat);o.position.set(x,y,z);o.rotation.y=rot;o.castShadow=o.receiveShadow=true;contents.add(o);return o;
  }
  function flowers(g:T.Object3D,x:number,y:number,z:number,gold=true) {
    cyl(g,.07,.05,.19,x,y+.095,z,gold?m.gold:m.ceramic);
    for(let i=0;i<8;i++){const a=i*2.4,px=x+Math.sin(a)*.09,pz=z+Math.cos(a)*.07,py=y+.28+(i%3)*.04;tube(g,[[x,y+.1,z],[px,py-.04,pz]],.003,m.green);const leaf=sphere(g,px-.035,py-.065,pz,.04,.012,.018,m.green);leaf.rotation.z=a;for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;sphere(g,px+Math.cos(angle)*.014,py,pz+Math.sin(angle)*.014,.018,.009,.015,gold?m.linen:m.mustard)}sphere(g,px,py+.008,pz,.009,.006,.009,m.mustard)}
  }
  function sofa(x:number,z:number,w:number,rot:number,seats:number) {
    const g=group(x,z,rot);
    box(g,w,.33,.83,0,.25,0,m.cloth,.06);
    box(g,w-.08,.62,.17,0,.72,-.34,m.cloth,.055);
    const inner=w-.34;
    const geom=new T.PlaneGeometry(inner,.5,Math.round(w*48),26),a=geom.attributes.position;
    const buttons:number[][]=[];
    for(let j=0;j<2;j++)for(let i=0;i<Math.floor(inner/.27);i++)buttons.push([-inner/2+.14+i*.27+(j%2)*.10,-.12+j*.24]);
    for(let i=0;i<a.count;i++){const px=a.getX(i),py=a.getY(i);let depth=.026;for(const b of buttons){const r=(px-b[0])**2+(py-b[1])**2;depth-=.035*Math.exp(-r/.0019)}a.setZ(i,depth+Math.sin(px*31+py*24)*.002)}
    geom.computeVertexNormals();const tuft=new T.Mesh(geom,m.cloth);tuft.position.set(0,.75,-.242);g.add(tuft);
    for(const b of buttons){sphere(g,b[0],.75+b[1],-.252,.012,.012,.008,m.seam)}
    for(let i=0;i<seats;i++){const px=-inner/2+(i+.5)*inner/seats;box(g,inner/seats-.012,.155,.63,px,.46,.062,m.cloth,.042);tube(g,[[px-inner/seats/2+.04,.487,.367],[px+inner/seats/2-.04,.487,.367]],.002,m.seam)}
    for(let side=-1;side<=1;side+=2){
      box(g,.17,.69,.92,side*(w/2-.08),.54,0,m.cloth,.055);
      for(let j=0;j<12;j++)sphere(g,side*(w/2-.08),.27+j*.052,.466,.009,.009,.009,m.chrome);
      for(let j=0;j<14;j++)sphere(g,side*(w/2-.08),.89,-.40+j*.061,.009,.009,.009,m.chrome);
      for(let zz of [-.29,.29])box(g,.075,.10,.075,side*(w/2-.13),.055,zz,m.dark,.018);
    }
    for(let i=0;i<=seats;i++){const px=-inner/2+i*inner/seats;box(g,.045,.50,.014,px,.75,-.199,m.gold,.009)}
    for(let i=0;i<2;i++){const pillow=box(g,.38,.40,.12,(i?1:-1)*(inner/2-.24),.73,-.07,m.stripe,.064);pillow.rotation.x=-.14;pillow.rotation.z=(i?1:-1)*.09}
    if(rot===Math.PI/2)obstacle(x,z,.98,w);else obstacle(x,z,w,.98);
  }
  sofa(.52,2.76,2.64,Math.PI/2,3);sofa(1.87,4.45,1.82,Math.PI,2);
  curtain(1.8,1.29,4.87,3.35,2.47);
  const rod=cyl(contents,.019,.019,3.55,1.8,2.57,4.81,m.black);rod.rotation.z=Math.PI/2;
  for(let i=0;i<20;i++){const ring=new T.Mesh(new T.TorusGeometry(.029,.007,...torusSeg(7,18)),m.chrome);ring.position.set(.2+i*.169,2.53,4.80);contents.add(ring)}
  box(contents,.41,.8,.39,.45,.4,4.44,m.white,.032);cyl(contents,.14,.14,.33,.45,1.02,4.44,m.glass);cyl(contents,.05,.1,.1,.45,.83,4.44,m.glass);
  const rug=box(contents,2.62,.017,3.43,1.97,.018,2.72,m.rug,.008);rug.receiveShadow=true;
  const table=group(1.93,2.6);box(table,.70,.035,1.56,0,.43,0,m.white,.012);box(table,.68,.035,1.52,0,.04,0,m.white,.008);
  box(table,.033,.36,.49,-.18,.23,-.46,m.white);box(table,.033,.36,.49,.18,.23,.46,m.white);box(table,.60,.026,.43,0,.21,.39,m.white);
  obstacle(1.93,2.6,.7,1.56);
  box(table,.046,.018,.16,.12,.46,-.40,m.black,.009);
  for(let j=0;j<6;j++)for(let i=0;i<3;i++)sphere(table,.103+i*.015,.47,-.45+j*.017,.004,.002,.004,m.white);
  picture(contents,16,1.20,.72,3.518,1.50,2.7,[[.553,.376],[.764,.358],[.766,.595],[.559,.554]],-Math.PI/2);
  picture(contents,16,.42,.69,3.52,2.04,1.69,[[.824,.078],[.982,.033],[.978,.37],[.819,.375]],-Math.PI/2);
  box(contents,.025,1.05,.035,3.523,.525,2.70,m.white);
  box(contents,.022,.13,.15,3.512,.2,2.64,m.white,.008);
  picture(contents,14,1.13,.76,.91,2.03,.075,[[.126,.133],[.325,.142],[.343,.315],[.149,.331]]);
  const fridge=group(1.75,.38);
  box(fridge,.52,.95,.56,0,.475,0,m.dark,.028);box(fridge,.48,.87,.04,0,.48,.29,new T.MeshStandardMaterial({color:"#737b73",metalness:.5,roughness:.38}),.012);
  box(fridge,.20,.025,.04,.1,.86,.317,m.chrome,.01);
  box(fridge,.46,.285,.38,0,1.1,0,m.black,.022);
  box(fridge,.31,.20,.012,-.05,1.1,.198,m.dark,.013);
  for(let y of [1.06,1.16]){const knob=cyl(fridge,.032,.032,.018,.173,y,.21,m.chrome);knob.rotation.x=Math.PI/2}
  obstacle(1.75,.38,.55,.6);
  for(let y of [.10,.39,.76])box(contents,1.34,.03,.38,.83,y,.26,m.white,.008);
  for(let x of [.20,1.46])box(contents,.025,.69,.36,x,.41,.26,m.white);
  for(let x of [.45,1.1]){cyl(contents,.012,.012,.61,x,.43,.36,m.chrome)}
  box(contents,.43,.035,1.03,.29,.76,.79,m.white,.008);box(contents,.025,.75,.42,.49,.375,1.25,m.white);
  const chair=group(.86,.95,-Math.PI/2);
  box(chair,.39,.06,.36,0,.46,0,m.white,.04);box(chair,.42,.27,.065,0,.73,-.17,m.white,.04);
  for(let x of [-.16,.16])for(let z of [-.14,.14])tube(chair,[[x,.045,z],[x,.48,z*.8],[x,.82,-.17]],.012,m.dark);
  obstacle(.82,.97,.46,.46);
  const speaker=(x:number,y:number,z:number)=>{box(contents,.16,.25,.15,x,y,z,m.black,.025);box(contents,.11,.23,.012,x,y,z+.08,m.white,.018);for(let yy of [-.055,.05])sphere(contents,x,y+yy,z+.09,.03,.03,.008,m.black)};
  speaker(.93,.52,.28);speaker(.57,.52,.28);speaker(.82,.17,.49);
  flowers(contents,.25,.78,1.12,true);flowers(contents,.86,.78,.25,false);
  return {root,contents,walls,ceilings,lowWalls,collisions,m,box,sphere,cyl,tube,group,obstacle,picture,curtain,flowers,torusSeg,latheSeg,cloth};
}
export type ApartmentModel=ReturnType<typeof buildApartment>;

// Mirror the authored apartment so it reads the way the listing photographs show it.
export function orientModel(model:ApartmentModel) {
  model.root.scale.x=-1;model.root.position.x=reflectX(0);
  for(const o of model.collisions){const a=o.x1;o.x1=reflectX(o.x2);o.x2=reflectX(a);}
}
