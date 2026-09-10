import * as T from "three";
import type { ApartmentModel } from "./scene-model";

export function furnishRooms(model:ApartmentModel) {
 const {contents,walls,m,box,sphere,cyl,tube,group,obstacle,picture,curtain,flowers}=model;
 const turn=Math.PI;
 const bowl=(g:T.Group,x:number,y:number,z:number,sx=1,sz=1)=>{
   const points=[[.012,-.10],[.07,-.09],[.15,-.045],[.205,.028],[.212,.045],[.245,.047],[.252,.02],[.228,-.065],[.13,-.13],[.04,-.135]].map(p=>new T.Vector2(p[0],p[1]));
   const o=new T.Mesh(new T.LatheGeometry(points,40),m.ceramic);o.position.set(x,y,z);o.scale.set(sx,1,sz);o.castShadow=o.receiveShadow=true;g.add(o);
   const drain=cyl(g,.014,.014,.006,x,y-.089,z,m.chrome);return o;
 };
 const tap=(g:T.Group,x:number,y:number,z:number)=>{
   cyl(g,.022,.025,.10,x,y+.05,z,m.chrome);
   tube(g,[[x,y+.08,z],[x,y+.16,z],[x,y+.16,z+.07],[x,y+.13,z+.09]],.014,m.chrome);
   box(g,.025,.01,.075,x,y+.171,z-.01,m.chrome,.006);
 };
 const sink=(x:number,z:number,rot:number,pedestal:boolean)=>{
   const g=group(x,z,rot);
   if(pedestal) {
     const shape=[[.145,0],[.155,.06],[.11,.22],[.08,.52],[.11,.68]].map(p=>new T.Vector2(p[0],p[1]));
     const p=new T.Mesh(new T.LatheGeometry(shape,32),m.ceramic);p.castShadow=p.receiveShadow=true;g.add(p);
   } else {
     tube(g,[[0,.65,-.08],[0,.46,-.08],[0,.40,-.11],[0,.40,-.24]],.022,m.chrome);
   }
   bowl(g,0,.79,.025,pedestal?1.12:.95,pedestal?.84:.77);
   box(g,.45,.035,.15,0,.823,-.14,m.ceramic,.025);
   tap(g,0,.833,-.14);
   return g;
 };
 // Hall fixture, confirmed opposite the combined bathroom.
 const hs=sink(3.30,-1.66,-turn/2,true);
 box(hs,.43,.59,.014,0,1.15,-.206,m.marble);
 box(hs,.59,.47,.024,0,1.70,-.206,m.chrome);
 box(hs,.255,.33,.055,0,2.31,-.206,m.white,.012);
 box(hs,.055,.035,.007,0,2.34,-.172,m.black);
 obstacle(3.27,-1.66,.48,.56);
 // Bathroom marble cladding on the inner faces of the enclosing walls.
 function tiledWall(x:number,z:number,w:number,rot:number) {
   const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;walls.add(g);
   const tile=m.marble.clone();tile.map=m.marble.map!.clone();tile.map.repeat.set(w/.4,2.7/.4);
   const o=new T.Mesh(new T.PlaneGeometry(w,2.7),tile);o.position.y=1.35;o.receiveShadow=true;g.add(o);
   box(g,w,.30,.012,0,1.45,.008,m.black);
   for(let xx=-w/2;xx<w/2;xx+=.095)box(g,.005,.3,.014,xx,1.45,.016,m.white);
   for(let yy=1.30;yy<1.61;yy+=.10)box(g,w,.005,.014,0,yy,.016,m.white);
 }
 tiledWall(.074,-1.25,2.38,turn/2);tiledWall(1.05,-2.424,1.98,0);tiledWall(1.05,-.074,1.98,turn);
 tiledWall(2.024,-2.24,.40,-turn/2);tiledWall(2.024,-.55,.9,-turn/2);
 // Toilet, cistern, pipe boxing and drain.
 const toilet=group(.63,-2.03);
 const basePts=[[.13,0],[.14,.05],[.105,.22],[.15,.29],[.225,.37],[.23,.42]].map(p=>new T.Vector2(p[0],p[1]));
 const base=new T.Mesh(new T.LatheGeometry(basePts,36),m.ceramic);base.scale.z=1.35;base.castShadow=base.receiveShadow=true;toilet.add(base);
 box(toilet,.46,.45,.22,0,.64,-.25,m.ceramic,.055);box(toilet,.48,.032,.24,0,.87,-.25,m.ceramic,.014);
 cyl(toilet,.032,.032,.005,.07,.89,-.25,m.chrome);
 sphere(toilet,0,.45,.02,.235,.035,.30,m.ceramic);
 const seat=new T.Mesh(new T.TorusGeometry(.20,.016,10,40),m.ceramic);seat.rotation.x=turn/2;seat.scale.y=1.32;seat.position.set(0,.424,.025);toilet.add(seat);
 obstacle(.63,-2.02,.50,.76);
 box(contents,.32,.45,.25,1.08,.225,-2.29,m.marble);
 box(contents,.15,2.6,.14,1.22,1.3,-2.35,m.marble);
 cyl(contents,.055,.063,.16,1.38,.08,-2.19,m.ceramic);cyl(contents,.013,.013,.34,1.38,.27,-2.19,m.red);
 box(contents,.145,.009,.145,.28,.015,-1.66,m.chrome);
 for(let i=0;i<8;i++)box(contents,.008,.011,.12,.227+i*.016,.02,-1.66,m.dark);
 // High frosted ventilation window.
 const win=group(.082,-2.03,turn/2);
 box(win,.54,.65,.028,0,2.03,0,m.chrome);box(win,.46,.57,.032,0,2.03,.022,m.dark);
 box(win,.015,.58,.04,0,2.03,.041,m.chrome);box(win,.48,.018,.04,0,2.02,.041,m.chrome);
 const bathSink=sink(.29,-.49,turn/2,false);obstacle(.27,-.48,.5,.46);
 const shower=group(.09,-1.33,turn/2);
 tube(shower,[[0,2.34,0],[0,2.34,.20],[0,2.30,.31]],.019,m.chrome);
 cyl(shower,.085,.10,.17,0,2.28,.32,new T.MeshStandardMaterial({color:"#b9c2a7",roughness:.36}));
 cyl(shower,.096,.077,.025,0,2.185,.32,m.white);
 for(let i=0;i<18;i++){const a=i*2.4;sphere(shower,Math.sin(a)*.07,2.168,.32+Math.cos(a)*.07,.004,.003,.004,m.dark)}
 for(let i=0;i<3;i++){const wire=new T.MeshStandardMaterial({color:["#632d25","#d8b135","#252721"][i]});tube(shower,[[-.22,2.17,0],[-.25,2.08,.01],[.12,2.05,.01],[.25,2.10,.01],[.22,2.32,.07]],.0022,wire)}
 const valve=cyl(shower,.04,.04,.035,0,1.02,.024,m.chrome);valve.rotation.x=turn/2;
 box(shower,.06,.016,.027,0,1.02,.064,m.chrome,.007);
 tube(shower,[[0,.52,0],[0,.52,.08],[0,.47,.1]],.017,m.gold);
 box(shower,.07,.014,.026,0,.57,.06,m.gold,.004);
 box(shower,.17,.025,.10,.32,.98,.05,m.black,.014);
 for(let i=0;i<2;i++)tube(shower,[[.42,2.03+i*.045,0],[.42,2.03+i*.045,.10],[.91,2.03+i*.045,.10],[.91,2.03+i*.045,0]],.009,m.chrome);
 const bucket=cyl(contents,.16,.12,.26,.33,.14,-.22,m.red);tube(contents,[[.17,.33,-.22],[.2,.43,-.22],[.45,.43,-.22],[.49,.33,-.22]],.008,m.red);
 // Bedroom: timber wardrobe to the left of the upholstered bed.
 const bed=group(2.08,-4.76);
 box(bed,1.79,.22,2.14,0,.22,0,m.dark,.028);
 box(bed,1.77,.225,2.11,0,.421,0,m.linen,.075);
 box(bed,1.91,1.34,.11,0,.84,-1.065,m.white,.009);
 box(bed,1.76,1.15,.065,0,.855,-.99,m.cloth,.018);
 // Fan-shaped upholstered headboard seams converge toward the lower centre.
 for(let i=0;i<=9;i++){const top=-.86+i*(1.72/9),bottom=-.57+i*(1.14/9);tube(bed,[[top,1.40,-.945],[(top+bottom)/2,.86,-.941],[bottom,.30,-.944]],.004,m.seam)}
 for(let x of [-.91,.91])box(bed,.065,.42,.085,x,.21,1.09,m.white);
 box(bed,1.90,.09,.10,0,.65,1.08,m.white,.01);box(bed,1.74,.45,.10,0,.385,1.09,m.cloth,.025);
 for(let x=-.72;x<=.73;x+=.18)tube(bed,[[x,.17,1.145],[x,.40,1.15],[x,.59,1.14]],.003,m.seam);
 function drape(w:number,d:number,z:number,mat:T.Material,y:number) {
   const geom=new T.PlaneGeometry(w,d,72,70),a=geom.attributes.position;
   for(let i=0;i<a.count;i++){const x=a.getX(i),zz=a.getY(i);const edge=Math.max(0,Math.abs(x)-.825);const drop=edge*1.85;const ripple=(Math.sin(x*22+zz*14)*.006+Math.sin(x*40-zz*7)*.003)*(1+edge*8);a.setXYZ(i,x,y-drop+ripple,z-zz)}
   geom.computeVertexNormals();const mesh=new T.Mesh(geom,mat);mesh.castShadow=mesh.receiveShadow=true;bed.add(mesh);
 }
 drape(2.06,1.71,.16,m.linen,.558);
 drape(2.04,.62,.69,m.mustard,.574);
 drape(1.87,.12,-.65,m.linen,.58);
 for(let x of [-.42,.42]){
   const p=box(bed,.74,.14,.43,x,.63,-.78,m.linen,.09);p.rotation.y=x*.06;
   tube(bed,[[x-.31,.62,-.58],[x,.62,-.56],[x+.31,.62,-.58]],.002,m.white);
 }
 obstacle(2.08,-4.76,1.92,2.3);
 const ward=group(.40,-5.02);
 box(ward,.66,2.60,1.17,0,1.3,-.195,m.wood,.012);
 // Wardrobe doors face into the room across the bed's left aisle.
 for(let z of [-.43,.08]){box(ward,.032,2.5,.49,.35,1.3,z,m.wood,.008);box(ward,.025,.23,.022,.38,1.15,z+.13,m.dark,.006)}
 box(ward,.04,2.48,.36,-.29,1.3,.56,m.mint);
 for(let z of [.38,.75])box(ward,.70,2.60,.03,.04,1.3,z,m.wood);
 for(let y=.10;y<=2.58;y+=.49)box(ward,.70,.032,.36,.04,y,.56,m.wood);
 obstacle(.4,-5.02,.77,1.65);
 const bedside=group(.99,-5.25);
 for(let y of [.04,.24,.47])box(bedside,.38,.026,.37,0,y,0,m.white);
 for(let x of [-.185,.185])box(bedside,.023,.48,.37,x,.24,0,m.white);
 box(bedside,.38,.56,.025,0,.28,-.172,m.white);
 flowers(bedside,0,.5,0,true);
 obstacle(.99,-5.25,.38,.38);
 picture(contents,10,.95,.74,2.0,2.02,-5.916,[[.558,.138],[.827,.054],[.837,.37],[.569,.396]]);
 // Kitchen tiles and a small window above the open sink counter.
 const ktile=m.marble.clone();ktile.map=m.marble.map!.clone();ktile.map.repeat.set(4,6);
 box(walls,1.73,2.6,.016,4.53,1.3,.174,ktile);
 box(walls,.016,2.6,1.78,5.374,1.3,1.05,ktile);
 box(walls,1.73,2.6,.016,4.53,1.3,1.925,ktile);
 const kitchen=group(4.40,.46);
 box(kitchen,.245,.055,.63,-.5625,.90,0,m.marble,.008);box(kitchen,.625,.055,.63,.3725,.90,0,m.marble,.008);
 for(let z of [-.2575,.2575])box(kitchen,.50,.055,.115,-.19,.90,z,m.marble,.006);
 for(let x of [-.65,.65])box(kitchen,.09,.86,.62,x,.43,0,m.marble);
 box(kitchen,1.35,.075,.10,0,.846,.26,m.marble);
 // Recessed stainless bowl with a separate ridged draining board.
 const steel=m.chrome.clone();steel.roughness=.29;
 steel.side=T.DoubleSide;
 const bowlMesh=new T.Mesh(new T.LatheGeometry([[.02,-.1],[.10,-.1],[.17,-.06],[.21,0],[.22,.012]].map(p=>new T.Vector2(...p as [number,number])),36),steel);
 bowlMesh.position.set(-.19,.94,0);bowlMesh.scale.set(1.18,.76,.85);kitchen.add(bowlMesh);
 box(kitchen,.47,.015,.43,.32,.94,0,steel,.025);
 for(let x=.13;x<.54;x+=.041)tube(kitchen,[[x,.952,-.15],[x,.952,.15]],.003,m.chrome);
 tap(kitchen,-.19,.94,-.235);
 tube(kitchen,[[-.19,.82,0],[-.19,.55,0],[-.10,.51,0],[.02,.54,-.22],[.02,.74,-.25]],.022,m.white);
 obstacle(4.40,.46,1.4,.66);
 const window=group(4.51,.189);
 box(window,1.13,1.39,.037,0,1.72,0,m.chrome);
 box(window,1.06,1.32,.04,0,1.72,.022,m.dark);
 for(let x of [-.27,.27])box(window,.018,1.32,.043,x,1.72,.05,m.chrome);
 for(let y of [1.37,1.83,2.34])box(window,1.06,.023,.043,0,y,.05,m.chrome);
 curtain(4.54,1.78,.265,1.20,1.12,m.linen);
 curtain(4.54,2.28,.28,1.20,.21,m.curtain);
 curtain(4.54,1.27,.28,1.20,.14,m.curtain);
 curtain(3.82,1.29,.28,.38,2.44,m.curtain);
 const krod=cyl(contents,.017,.017,1.65,4.37,2.48,.26,m.black);krod.rotation.z=turn/2;
 // Cooker on its open black stand, beneath pale wood wall cupboards.
 const stove=group(5.04,1.32,-turn/2);
 box(stove,.71,.05,.50,0,.82,0,m.dark,.012);
 for(let x of [-.31,.31])for(let z of [-.2,.2])box(stove,.032,.77,.032,x,.39,z,m.dark);
 box(stove,.66,.027,.46,0,.14,0,m.dark);
 box(stove,.68,.12,.43,0,.91,0,m.black,.016);box(stove,.65,.08,.015,0,.90,.221,m.chrome,.007);
 for(let x of [-.19,.19]){
   const ring=new T.Mesh(new T.TorusGeometry(.107,.012,9,32),m.chrome);ring.rotation.x=turn/2;ring.position.set(x,.982,0);stove.add(ring);
   cyl(stove,.059,.059,.020,x,.98,0,m.dark);
   for(let j=0;j<4;j++){const a=j*turn/2;box(stove,.025,.019,.12,x+Math.sin(a)*.07,.998,Math.cos(a)*.07,m.black).rotation.y=a}
   const knob=cyl(stove,.032,.031,.022,x,.91,.237,m.black);knob.rotation.x=turn/2;
 }
 cyl(stove,.12,.12,.32,.04,.32,0,m.black);
 obstacle(5.04,1.32,.55,.75);
 const cabinet=group(5.17,1.22,-turn/2);
 box(cabinet,1.30,.82,.34,0,2.07,0,m.paleWood,.008);
 for(let i=0;i<3;i++){const x=-.43+i*.43;box(cabinet,.418,.795,.032,x,2.07,.19,m.paleWood,.006);box(cabinet,.011,.21,.02,x+.12,1.88,.218,m.dark,.004)}
 // Use the photographed coffee-cup strip as a surface reference.
 picture(contents,11,1.65,.28,4.51,1.30,.21,[[.222,.473],[.678,.475],[.68,.588],[.222,.584]]);
 picture(contents,11,1.70,.28,5.36,1.29,1.06,[[.222,.473],[.678,.475],[.68,.588],[.222,.584]],-turn/2);
 const kettle=group(4.96,.44);
 cyl(kettle,.066,.095,.21,0,1.065,0,m.black);cyl(kettle,.085,.085,.018,0,.953,0,m.red);sphere(kettle,0,1.175,0,.07,.018,.07,m.black);
 tube(kettle,[[.05,1.17,0],[.14,1.14,0],[.15,1.02,0],[.08,.99,0]],.013,m.black);
 const blender=group(4.75,.36);
 cyl(blender,.068,.085,.17,0,1.027,0,m.pink);cyl(blender,.075,.06,.22,0,1.22,0,m.glass);cyl(blender,.08,.08,.017,0,1.34,0,m.wood);
 for(let y of [1,1.03,1.06])sphere(blender,0,y,.083,.01,.006,.004,m.white);
 const utensil=group(5.06,.62);
 cyl(utensil,.045,.043,.13,0,1.005,0,m.mustard);
 for(let i=0;i<5;i++){const x=(i-2)*.019;tube(utensil,[[x,.97,0],[x*1.5,1.20,0]],.007,m.wood);sphere(utensil,x*1.5,1.24,0,.015,.035,.007,m.wood)}
 box(contents,.25,.012,.53,4.04,.02,1.27,m.blue,.012);
 // The living room's distinctive checkered pendant and round wall light.
 const glow=new T.MeshStandardMaterial({color:"#fff4ce",emissive:"#ffe8b7",emissiveIntensity:.7,roughness:.4,side:T.DoubleSide});
 cyl(contents,.012,.012,.18,1.8,2.62,2.6,m.white);
 for(let row=0;row<4;row++)for(let col=0;col<12;col++){
   const geom=new T.CylinderGeometry(.135,.135,.073,5,1,true,col*turn/6,turn/6);
   const o=new T.Mesh(geom,(row+col)%2?m.gold:glow);o.position.set(1.8,2.34+row*.073,2.6);contents.add(o);
 }
 sphere(contents,.089,2.18,2.78,.025,.12,.12,glow);
}
