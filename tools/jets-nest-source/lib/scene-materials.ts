import * as T from "three";

export function makeMaterials() {
  let seed=8912;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const texture=(kind:string)=>{
    const canvas=document.createElement("canvas");canvas.width=canvas.height=512;
    const c=canvas.getContext("2d")!;
    c.fillStyle=kind==="wood"?"#ae7942":kind==="rug"?"#e6ddc5":kind==="stripe"?"#e2c891":kind==="marble"?"#ebece7":"#d8ccb6";
    c.fillRect(0,0,512,512);
    if(kind==="wood") {
      for(let x=0;x<512;x++){c.strokeStyle="rgba(72,35,10,"+(0.04+rand()*.13)+")";c.lineWidth=1+rand()*2;c.beginPath();c.moveTo(x,0);for(let y=0;y<=512;y+=12)c.lineTo(x+Math.sin(y*.011+x*.025)*3+Math.sin(y*.031)*1.5,y);c.stroke()}
    }
    if(kind==="stripe") {
      const colors=["#632b21","#dab84e","#daccb2","#184c4a","#332b27","#bc3c20","#e0be55","#bbc4aa"];
      for(let y=0;y<512;){const h=4+rand()*25;c.fillStyle=colors[Math.floor(rand()*colors.length)];c.beginPath();c.moveTo(0,y);for(let x=0;x<=512;x+=16)c.lineTo(x,y+Math.sin(x*.016+y)*4+rand()*5);c.lineTo(512,y+h);c.lineTo(0,y+h);c.fill();y+=h}
    }
    if(kind==="marble"){
      for(let i=0;i<24;i++){const x=rand()*650-130,y=rand()*512;c.strokeStyle="rgba(124,131,123,"+(.025+rand()*.07)+")";c.lineWidth=.5+rand()*3;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+90,y+20,x+70,y+90,x+200,y+180);c.stroke()}
      c.strokeStyle="#b2b1a3";c.lineWidth=2;c.strokeRect(0,0,512,512);
    }
    if(kind==="rug"){
      c.strokeStyle="#bcac7e";c.lineWidth=9;
      for(let x=-512;x<=1024;x+=155)for(let y=-250;y<900;y+=240){c.beginPath();c.moveTo(x,y);c.lineTo(x+100,y+120);c.lineTo(x,y+240);c.lineTo(x-100,y+120);c.closePath();c.stroke()}
      c.strokeStyle="#eee7d4";c.lineWidth=3;
      for(let x=-512;x<=1024;x+=155){c.beginPath();c.moveTo(x,0);c.lineTo(x+512,512);c.stroke()}
    }
    const pixels=c.getImageData(0,0,512,512);
    for(let i=0;i<pixels.data.length;i+=4){const n=(rand()-.5)*(kind==="cloth"?24:kind==="rug"?22:11);pixels.data[i]+=n;pixels.data[i+1]+=n;pixels.data[i+2]+=n}
    c.putImageData(pixels,0,0);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;return tex;
  };
  const cloth=texture("cloth");cloth.repeat.set(3,3);
  const weave=texture("cloth");weave.colorSpace=T.NoColorSpace;weave.repeat.set(5,5);
  const woodTex=texture("wood");
  const marbleTex=texture("marble");
  const standard=(color:T.ColorRepresentation,roughness=.6,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const mats={
    mint:standard("#79b69a",.92),plaster:standard("#efece0",.9),white:standard("#f8f5eb",.43),
    cloth:new T.MeshPhysicalMaterial({color:"#c5b195",map:cloth,bumpMap:weave,bumpScale:.006,roughness:.86,sheen:.45,sheenRoughness:.8,sheenColor:new T.Color("#e9d7bb")}),
    seam:standard("#9e886e",.92),
    linen:new T.MeshPhysicalMaterial({color:"#f4f1e6",bumpMap:weave,bumpScale:.005,roughness:.94,sheen:.22}),
    gold:new T.MeshStandardMaterial({color:"#d7b44b",metalness:.8,roughness:.2}),
    curtain:new T.MeshPhysicalMaterial({color:"#cda435",bumpMap:weave,bumpScale:.004,roughness:.48,metalness:.22,sheen:.8,sheenColor:new T.Color("#f2cf61"),side:T.DoubleSide}),
    mustard:new T.MeshPhysicalMaterial({color:"#edb621",bumpMap:weave,bumpScale:.005,roughness:.86,sheen:.5}),
    wood:new T.MeshStandardMaterial({map:woodTex,roughness:.44,color:"#dbc297"}),
    paleWood:new T.MeshStandardMaterial({map:woodTex,roughness:.4,color:"#f3e8c7"}),
    marble:new T.MeshStandardMaterial({map:marbleTex,roughness:.33,color:"#f5f6f1"}),
    chrome:standard("#b6c0c0",.19,.92),
    black:standard("#181b1a",.4),dark:standard("#333933",.7),
    stripe:new T.MeshStandardMaterial({map:texture("stripe"),bumpMap:weave,bumpScale:.008,roughness:.86}),
    rug:new T.MeshStandardMaterial({map:texture("rug"),bumpMap:weave,bumpScale:.012,roughness:1}),
    ceramic:new T.MeshPhysicalMaterial({color:"#faf9f2",side:T.DoubleSide,roughness:.18,clearcoat:.6,clearcoatRoughness:.15}),
    glass:new T.MeshPhysicalMaterial({color:"#a9cdcb",transparent:true,opacity:.25,roughness:.1,metalness:.15}),
    blue:standard("#27629e",.97),red:standard("#c72e21",.36),green:standard("#305739",.86),pink:standard("#c19d99",.5)
  };
  return mats;
}
export type Materials=ReturnType<typeof makeMaterials>;
