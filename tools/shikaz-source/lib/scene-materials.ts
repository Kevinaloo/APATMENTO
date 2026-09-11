import * as T from 'three';
export function makeMaterials() {
 let seed=98211;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 function texture(kind:string){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;
  c.fillStyle=({wood:'#956149',oak:'#b49773',marble:'#e5e0d4',cloth:'#cecbc5',linen:'#f5f2e9',rug:'#b8aea0',blue:'#25415f',tile:'#ece6d8',stone:'#a9aaa7',weave:'#999999'} as Record<string,string>)[kind]||'#cccccc';c.fillRect(0,0,512,512);
  if(kind==='wood'||kind==='oak')for(let x=0;x<512;x++){c.strokeStyle=`rgba(48,20,7,${.02+rand()*.16})`;c.lineWidth=1+rand()*2;c.beginPath();c.moveTo(x,0);for(let y=0;y<=512;y+=8)c.lineTo(x+Math.sin(y*.015+x*.04)*2.4+Math.sin(y*.045+x*.02),y);c.stroke()}
  if(kind==='marble'){for(let i=0;i<11;i++){const x=rand()*600-100,y=rand()*512;c.strokeStyle=`rgba(137,117,94,${.03+rand()*.08})`;c.lineWidth=.6+rand()*2;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+70,y-10,x+160,y+100,x+330,y+200);c.stroke()}c.strokeStyle='#868479';c.lineWidth=2;c.strokeRect(0,0,512,512)}
  if(kind==='tile'){c.strokeStyle='#beb7a5';c.lineWidth=2;c.strokeRect(0,0,512,512);c.strokeStyle='#978059';c.lineWidth=2.3;c.beginPath();c.moveTo(256,395);c.bezierCurveTo(260,270,220,270,259,166);c.moveTo(251,300);c.quadraticCurveTo(282,270,306,280);c.stroke();c.fillStyle='#c1a367';for(let i=-1;i<=1;i++){c.beginPath();c.ellipse(256+i*12,150,8,27,-i*.3,0,Math.PI*2);c.fill()}for(let i=0;i<3;i++){c.beginPath();c.arc(291,337+i*14,3,0,7);c.fill()}}
  if(kind==='rug'){c.fillStyle='#655248';c.fillRect(0,0,80,512);c.fillRect(220,0,80,512);c.fillRect(0,130,512,68);c.fillRect(0,410,512,65)}
  if(kind==='linen'){c.fillStyle='#e9e5df';for(let x=0;x<512;x+=13)c.fillRect(x,0,4,512)}
  if(kind==='blue'){c.strokeStyle='#94a4b1';c.lineWidth=2;for(let i=0;i<28;i++){const x=rand()*512,y=rand()*512;c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*7,y+10+rand()*36);c.stroke()}}
  const pixels=c.getImageData(0,0,512,512);for(let i=0;i<pixels.data.length;i+=4){const n=(rand()-.5)*(kind==='weave'?70:kind==='cloth'||kind==='rug'?28:kind==='stone'?36:10);pixels.data[i]+=n;pixels.data[i+1]+=n;pixels.data[i+2]+=n}c.putImageData(pixels,0,0);
  if(kind==='weave'){c.globalAlpha=.16;c.strokeStyle='#222';c.lineWidth=1;for(let i=0;i<512;i+=3){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke()}}
  const t=new T.CanvasTexture(canvas);t.colorSpace=kind==='weave'?T.NoColorSpace:T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
 }
 const weave=texture('weave');weave.repeat.set(3,3);
 const std=(color:T.ColorRepresentation,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const fabric=(color:string,map?:T.Texture)=>new T.MeshPhysicalMaterial({color,map,bumpMap:weave,bumpScale:.008,roughness:.94,sheen:.65,sheenRoughness:.85,sheenColor:new T.Color('#dad7ce')});
 const linen=fabric('#ffffff',texture('linen'));linen.side=T.DoubleSide;
 const mats={mint:std('#e1ddcf',.96),plaster:std('#f0eee6',.94),white:std('#f6f4ed',.35),cloth:fabric('#f3f1ec',texture('cloth')),seam:std('#aaa59c',.98),linen,
 gold:std('#b9913c',.31,.72),curtain:fabric('#b18b31'),mustard:fabric('#caa82d'),wood:new T.MeshStandardMaterial({map:texture('wood'),roughness:.42,color:'#c99586'}),paleWood:new T.MeshStandardMaterial({map:texture('oak'),roughness:.62}),marble:new T.MeshStandardMaterial({map:texture('marble'),roughness:.4}),tile:new T.MeshStandardMaterial({map:texture('tile'),roughness:.3}),stone:new T.MeshStandardMaterial({map:texture('stone'),bumpMap:weave,bumpScale:.012,roughness:.87}),
 chrome:std('#c4c9ca',.21,.95),black:std('#151919',.33),dark:std('#34383a',.7),stripe:fabric('#ffffff',texture('blue')),rug:new T.MeshStandardMaterial({map:texture('rug'),bumpMap:weave,bumpScale:.023,roughness:1}),ceramic:new T.MeshPhysicalMaterial({color:'#f7f6ef',roughness:.2,clearcoat:.7,clearcoatRoughness:.2,side:T.DoubleSide}),glass:new T.MeshPhysicalMaterial({color:'#ccdbe0',transparent:true,opacity:.3,roughness:.15,metalness:.25}),blue:fabric('#253e59'),red:fabric('#a72237'),green:std('#37523b',.88),pink:std('#bb9181'),glow:new T.MeshBasicMaterial({color:'#fff4d8'}),sheer:new T.MeshPhysicalMaterial({color:'#fffcf2',roughness:1,transparent:true,opacity:.68,side:T.DoubleSide,depthWrite:false}),greyRug:fabric('#aaa7a4')};
 mats.curtain.side=mats.blue.side=T.DoubleSide;return mats;
}
export type Materials=ReturnType<typeof makeMaterials>;
