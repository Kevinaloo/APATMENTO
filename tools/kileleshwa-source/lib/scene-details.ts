import * as T from 'three';
import type {Model} from './scene-model';

export function furnishRooms(model:Model){
 const {contents,walls,ceilings,m,box,sphere,cyl,tube,group,obstacle,torus}=model;
 // Cream chaise sectional: seat seams, separate back cushions and zebra scatter cushions.
 const sofa=group(3.08,4.77,-Math.PI/2);
 box(sofa,3.00,.34,.92,0,.27,0,m.cream,.085);
 box(sofa,3.02,.57,.2,0,.72,-.37,m.cream,.065);
 for(const side of [-1,1]){box(sofa,.17,.64,.98,side*1.43,.53,.02,m.cream,.065);for(const z of [-.3,.3])cyl(sofa,.035,.028,.13,side*1.32,.075,z,m.black);}
 for(let i=0;i<3;i++){
   const x=(i-1)*.89;box(sofa,.87,.19,.72,x,.49,.07,m.cream,.057);
   const back=box(sofa,.88,.5,.18,x,.84,-.23,m.cream,.073);back.rotation.x=-.13;
   for(let j=0;j<2;j++)sphere(sofa,x+(j?1:-1)*.18,.85,-.119,.012,.013,.007,m.taupe);
   tube(sofa,[[x-.4,.515,.43],[x,.504,.438],[x+.4,.515,.43]],.0025,m.linen);
 }
 box(sofa,.88,.35,1.53,.94,.28,.35,m.cream,.07);box(sofa,.88,.18,1.38,.94,.5,.4,m.cream,.06);
 for(const [x,z,rz] of [[-1.05,-.05,-.14],[.82,-.02,.1],[.13,.10,-.10]]){const pillow=box(sofa,.43,.45,.15,x,.79,z,m.zebra,.07);pillow.rotation.set(-.18,0,rz);}
 const sofaThrow=box(sofa,.54,.08,.69,.91,.625,.47,m.blue,.035);sofaThrow.rotation.y=.16;
 obstacle(3.1,4.77,.98,3.04);obstacle(2.65,5.71,1.72,.96);
 box(contents,2.92,.014,3.48,1.85,.016,4.63,m.rug,.009);
 // Black nesting tables with crossed metal legs.
 for(let i=0;i<3;i++){
   const z=4.93-i*.43,x=1.78-i*.08,h=.59-i*.07,w=.61-i*.045,d=.47;
   box(contents,w,.032,d,x,h,z,m.black,.009);
   for(const side of [-1,1]){tube(contents,[[x-w*.43,.025,z+side*d*.43],[x+w*.43,h-.01,z+side*d*.43]],.013,m.black);tube(contents,[[x+w*.43,.025,z+side*d*.43],[x-w*.43,h-.01,z+side*d*.43]],.013,m.black);tube(contents,[[x-w*.43,.025,z+side*d*.43],[x+w*.43,.025,z+side*d*.43]],.013,m.black);}
 }
 obstacle(1.7,4.5,.72,1.35);
 box(contents,.05,.016,.17,1.82,.622,4.95,m.black,.008);
 for(let i=0;i<5;i++)sphere(contents,1.82,.633,4.9+i*.019,.005,.002,.004,m.white);
 // Oak media wall and long geometric black-and-brass console.
 for(let i=0;i<6;i++)box(walls,.035,2.65,.56,.072,1.39,3.08+i*.59,m.oak,.002);
 box(contents,.055,.76,1.34,.12,1.61,4.58,m.black,.014);
 box(contents,.007,.70,1.27,.153,1.61,4.58,m.screen,.005);
 // A quiet abstract screen image, not an invented exterior view.
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d')!;
 const sky=ctx.createLinearGradient(0,0,640,360);sky.addColorStop(0,'#14353b');sky.addColorStop(.5,'#496e77');sky.addColorStop(1,'#112b35');ctx.fillStyle=sky;ctx.fillRect(0,0,640,360);
 for(let i=0;i<7;i++){ctx.fillStyle=`rgba(117,166,169,${.04+i*.014})`;ctx.beginPath();ctx.moveTo(0,300-i*16);for(let x=0;x<=640;x+=20)ctx.lineTo(x,250+Math.sin(x*.012+i*.5)*(35+i*6)-i*16);ctx.lineTo(640,360);ctx.lineTo(0,360);ctx.fill();}
 const screenTex=new T.CanvasTexture(canvas);screenTex.colorSpace=T.SRGBColorSpace;const screenMat=new T.MeshBasicMaterial({map:screenTex});const screen=new T.Mesh(new T.PlaneGeometry(1.27,.7),screenMat);screen.rotation.y=Math.PI/2;screen.position.set(.158,1.61,4.58);contents.add(screen);
 box(contents,.41,.035,2.24,.34,.53,4.6,m.black,.02);box(contents,.37,.025,2.12,.34,.1,4.6,m.black,.009);box(contents,.34,.31,.7,.34,.32,4.6,m.black,.007);
 for(const z of [3.53,5.67])for(const x of [.17,.51])tube(contents,[[x,.08,z],[x,.53,z]],.013,m.gold);
 for(const z of [3.95,5.22]){tube(contents,[[.53,.1,z-.34],[.53,.53,z+.34]],.008,m.gold);tube(contents,[[.53,.53,z-.34],[.53,.1,z+.34]],.008,m.gold);}
 box(contents,.012,.016,.21,.523,.32,4.6,m.gold,.002);obstacle(.34,4.6,.45,2.28);
 for(let i=0;i<3;i++)box(contents,.19,.035,.28,.33,.565+i*.035,5.27,i%2?m.black:m.linen,.002);
 const tray=cyl(contents,.13,.12,.016,.32,.562,3.93,m.chrome);for(let i=0;i<8;i++)sphere(contents,.30+Math.cos(i*2.4)*.075,.58,3.93+Math.sin(i*2.4)*.075,.019,.011,.022,i%2?m.yellow:m.green);
 // Gold relief over the sofa, recreated from the concentric motif in the photo.
 box(walls,.03,.79,1.28,3.62,1.97,4.81,m.gold,.004);box(walls,.013,.75,1.24,3.60,1.97,4.81,m.art);
 // Multi-orb chandelier: each globe sits at the end of a fine brass arm.
 const chandelier=new T.Group();chandelier.position.set(1.85,0,4.52);ceilings.add(chandelier);
 cyl(chandelier,.075,.075,.04,0,2.76,0,m.gold);cyl(chandelier,.014,.014,.46,0,2.51,0,m.gold);cyl(chandelier,.038,.038,.14,0,2.25,0,m.gold);
 for(let i=0;i<10;i++){const a=i*Math.PI*2/10,r=i%2?.67:.39,y=2.22+(i%3)*.085;const x=Math.cos(a)*r,z=Math.sin(a)*r;tube(chandelier,[[0,2.24,0],[x*.48,2.25,z*.48],[x,y,z]],.009,m.gold);sphere(chandelier,x,y,z,.088,.088,.088,m.glow);torus(chandelier,.037,.006,x,y,z,m.gold);}
 // White pedestal table set for two.
 const dining=group(1.84,1.2);cyl(dining,.5,.5,.035,0,.745,0,m.white);cyl(dining,.06,.12,.60,0,.42,0,m.white);cyl(dining,.12,.31,.115,0,.105,0,m.white);cyl(dining,.33,.33,.022,0,.037,0,m.white);obstacle(1.84,1.2,1,1);
 for(const side of [-1,1]){
   const g=group(1.84,1.2+side*.8,side===1?Math.PI:0);
   box(g,.46,.055,.43,0,.46,0,m.white,.08);const back=box(g,.46,.44,.05,0,.69,-.18,m.white,.10);back.rotation.x=-.13;
   for(const x of [-.18,.18])for(const z of [-.15,.15])tube(g,[[x*1.15,.03,z*1.3],[x,.435,z]],.011,m.gold);
   obstacle(1.84,1.2+side*.8,.47,.47);
   cyl(dining,.14,.13,.012,0,.771,side*.27,m.ceramic);cyl(dining,.105,.10,.012,0,.784,side*.27,m.ceramic);cyl(dining,.046,.035,.095,0,.838,side*.27,m.ceramic);const handle=torus(dining,.029,.007,.047,.838,side*.27,m.ceramic);handle.rotation.y=Math.PI/2;
 }
 cyl(dining,.04,.05,.16,.08,.845,0,m.gold);for(let i=0;i<7;i++){const x=.08+Math.sin(i*2.4)*.03,z=Math.cos(i*2.4)*.025;tube(dining,[[x,.83,z],[x,.99+(i%2)*.035,z]],.0025,m.gold);sphere(dining,x,1.0+(i%2)*.035,z,.013,.029,.008,m.gold);}
 // Compact work desk and ergonomic chair.
 const desk=group(3.02,2.71,Math.PI/2);box(desk,.94,.043,.60,0,.75,0,m.black,.008);for(const x of [-.445,.445])box(desk,.035,.71,.58,x,.373,0,m.black);box(desk,.86,.5,.03,0,.48,.27,m.black);obstacle(3.02,2.71,.62,.98);
 const chair=group(3.48,2.71,Math.PI/2);box(chair,.44,.08,.44,0,.46,0,m.black,.09);const chairBack=box(chair,.42,.57,.05,0,.77,.18,m.black,.07);chairBack.rotation.x=.1;box(chair,.3,.2,.055,0,1.11,.2,m.black,.085);cyl(chair,.034,.034,.38,0,.22,0,m.chrome);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;tube(chair,[[0,.13,0],[Math.sin(a)*.29,.07,Math.cos(a)*.29]],.014,m.chrome);sphere(chair,Math.sin(a)*.29,.04,Math.cos(a)*.29,.035,.035,.02,m.black);}
 for(let i=0;i<6;i++)box(chair,.3,.024,.015,0,.6+i*.065,.146,m.taupe,.012);
 // Entry console / ornate oval mirror, positioned clear of the inferred doorway.
 const consoleGroup=group(3.48,1.89,Math.PI/2);box(consoleGroup,.72,.035,.28,0,.8,0,m.black,.004);
 for(const side of [-1,1]){tube(consoleGroup,[[-.34,.04,side*.10],[.34,.785,side*.10]],.018,m.gold);tube(consoleGroup,[[.34,.04,side*.10],[-.34,.785,side*.10]],.018,m.gold);}
 const mirrorFrame=torus(walls,.285,.02,3.62,1.76,1.89,m.gold);mirrorFrame.rotation.y=-Math.PI/2;mirrorFrame.scale.y=1.2;
 for(let i=0;i<24;i++){const a=i*Math.PI*2/24;const ornament=torus(walls,.027,.008,3.60,1.76+Math.sin(a)*.34,1.89+Math.cos(a)*.285,m.gold);ornament.rotation.y=-Math.PI/2;}
 cyl(consoleGroup,.055,.045,.12,.20,.879,0,m.ceramic);for(let i=0;i<6;i++){const leaf=sphere(consoleGroup,.20+Math.sin(i)*.036,.954,Math.cos(i)*.034,.045,.012,.025,m.green);leaf.rotation.z=i;}
 obstacle(3.48,1.89,.3,.74);
 // Bedroom: charcoal tufted upholstery, white linen, mustard throw and pale-blue cushions.
 const bed=group(6.9,2.48,Math.PI); // local head faces the north wall after the rotation
 // Keep local head at +z so the entrance sees the footboard and bedding.
 box(bed,1.87,.38,2.12,0,.3,0,m.velvet,.06);box(bed,1.80,.23,2.01,0,.61,0,m.linen,.085);
 box(bed,1.98,1.46,.13,0,.85,-1.08,m.velvet,.045);
 for(let i=0;i<5;i++)for(let j=0;j<3;j++)box(bed,.37,.37,.095,(i-2)*.386,.56+j*.37,-.985,m.velvet,.055);
 box(bed,1.91,.66,.13,0,.43,1.08,m.velvet,.07);
 for(const x of [-.44,.44]){const p=box(bed,.71,.17,.41,x,.83,-.72,m.linen,.075);p.rotation.x=.17;const cushion=box(bed,.45,.41,.14,x,.97,-.43,m.blue,.09);cushion.rotation.set(-.24,0,x*.2);}
 // Turn the completed bed to put the head at z=3.56, foot at z=1.40.
 bed.rotation.y=Math.PI;
 const quiltGeom=new T.PlaneGeometry(1.86,.74,48,24),q=quiltGeom.attributes.position;for(let i=0;i<q.count;i++){const x=q.getX(i),y=q.getY(i);q.setZ(i,.012*Math.sin(x*23+y*7)+.009*Math.sin(x*41));}quiltGeom.computeVertexNormals();const quilt=new T.Mesh(quiltGeom,m.yellow);quilt.rotation.x=-Math.PI/2;quilt.position.set(0,.766,.49);quilt.castShadow=true;bed.add(quilt);
 for(const side of [-1,1])box(bed,.045,.23,.73,side*.925,.64,.49,m.yellow,.018);
 obstacle(6.9,2.48,1.96,2.25);
 // Six circular woven decorations above the bed.
 for(const [x,y,r] of [[6.30,2.11,.105],[6.66,2.32,.14],[7.13,2.48,.12],[7.50,2.29,.115],[6.61,1.91,.13],[7.02,2.11,.15]]){const disk=cyl(walls,r,r,.018,x,y,3.91,m.zebra);disk.rotation.x=Math.PI/2;torus(walls,r,.005,x,y,3.894,m.gold);}
 // Tall taupe wardrobes and an oak/white bedside table.
 for(let i=0;i<4;i++){const z=2.06+i*.46;box(contents,.51,2.49,.45,5.2,1.255,z,m.taupe,.004);box(contents,.017,.29,.013,5.463,1.17,z+.155,m.black,.003);}
 obstacle(5.21,2.75,.56,1.86);
 box(contents,.44,.46,.40,8.05,.42,3.43,m.white,.012);box(contents,.44,.034,.42,8.05,.67,3.43,m.white);box(contents,.40,.16,.02,8.05,.565,3.213,m.oak);sphere(contents,8.05,.565,3.192,.015,.015,.01,m.black);
 for(const x of [-.14,.14])for(const z of [-.13,.13])cyl(contents,.018,.012,.21,8.05+x,.105,3.43+z,m.oak);
 cyl(contents,.09,.085,.025,8.05,.70,3.43,m.gold);cyl(contents,.014,.014,.25,8.05,.83,3.43,m.gold);cyl(contents,.105,.155,.21,8.05,1.00,3.43,m.velvet);cyl(contents,.105,.105,.008,8.05,1.11,3.43,m.gold);obstacle(8.05,3.43,.44,.42);
 const light=new T.Group();ceilings.add(light);cyl(light,.16,.16,.04,6.75,2.8,1.9,m.gold);sphere(light,6.75,2.745,1.9,.14,.065,.14,m.glow);
 // Small switches keep otherwise spare walls believable without inventing amenities.
 for(const [x,z,rotation] of [[3.64,.34,-Math.PI/2],[5.02,.38,Math.PI/2],[.09,2.33,Math.PI/2]]){const g=new T.Group();g.position.set(x,1.15,z);g.rotation.y=rotation;walls.add(g);box(g,.10,.105,.012,0,0,0,m.steel,.005);box(g,.026,.052,.013,0,0,.01,m.taupe,.002);}
}
