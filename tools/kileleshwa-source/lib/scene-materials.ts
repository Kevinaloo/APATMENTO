import * as T from 'three';

// Seeded, locally generated surface detail keeps the apartment independent of CDNs.
export function makeMaterials() {
  let seed = 731;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  function texture(kind:string) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const c = canvas.getContext('2d')!;
    c.fillStyle = ({wood:'#c9b48f',marble:'#e8e6df',cloth:'#ece9e1',rug:'#e9e5d9',zebra:'#faf8ed',curtain:'#b6b8b5',art:'#b78d23',floorwood:'#c4a677'} as Record<string,string>)[kind] || '#eeeeea';
    c.fillRect(0,0,512,512);
    if(kind==='wood'||kind==='floorwood') {
      for(let x=0;x<512;x++) { c.strokeStyle=`rgba(68,43,18,${.025+random()*.13})`;c.lineWidth=.5+random()*1.2;c.beginPath();c.moveTo(x,0);for(let y=0;y<=512;y+=8)c.lineTo(x+Math.sin(y*.011+x*.008)*4+Math.sin(y*.055+x*.03)*1.8,y);c.stroke(); }
      if(kind==='floorwood'){c.strokeStyle='#927d5f';c.lineWidth=1;for(let x=0;x<512;x+=128){c.strokeRect(x,0,128,512);c.beginPath();c.moveTo(x,150+(x%256));c.lineTo(x+128,150+(x%256));c.stroke();}}
    }
    if(kind==='marble') {
      for(let i=0;i<85;i++){const x=random()*800-180,y=random()*512;c.strokeStyle=`rgba(110,112,110,${.012+random()*.045})`;c.lineWidth=.5+random()*9;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+35,y+80,x+130,y+90,x+210,y+220);c.stroke();}
      c.strokeStyle='#b8b7af';c.lineWidth=1.2;c.strokeRect(0,0,512,512);
    }
    if(kind==='rug') {
      for(let i=0;i<21000;i++){const x=random()*512,y=random()*512;const s=Math.sin(x*.05)+Math.sin(y*.02+x*.036);c.fillStyle=s+random()>.5?'rgba(24,24,22,.88)':'rgba(129,125,115,.32)';c.fillRect(x,y,1+random()*7,1+random()*3);}
      c.strokeStyle='#d6d0c0';c.lineWidth=9;c.strokeRect(5,5,502,502);
    }
    if(kind==='zebra') {
      for(let i=-3;i<18;i++){c.fillStyle='#121616';c.beginPath();const x=i*39;c.moveTo(x,0);for(let y=0;y<=512;y+=8)c.lineTo(x+Math.sin(y*.025+i*1.3)*27+Math.sin(y*.011)*20,y);for(let y=512;y>=0;y-=8)c.lineTo(x+23+Math.sin(y*.025+i*1.3+.12)*28+Math.sin(y*.011)*20,y);c.fill();}
    }
    if(kind==='curtain') {
      c.strokeStyle='rgba(76,82,82,.3)';c.lineWidth=1.4;
      for(let y=-80;y<600;y+=65)for(let x=-60;x<600;x+=65){c.beginPath();c.moveTo(x,y+32);c.lineTo(x+32,y+14);c.lineTo(x+65,y+32);c.lineTo(x+32,y+51);c.closePath();c.stroke();for(let j=0;j<4;j++){c.beginPath();c.moveTo(x+8,y+35+j*4);c.lineTo(x+32,y+49+j*4);c.lineTo(x+58,y+34+j*4);c.stroke();}}
    }
    if(kind==='art') {
      for(let i=0;i<9;i++){const x=(i%3)*190+random()*80,y=Math.floor(i/3)*190+random()*80;for(let r=6;r<110;r+=5){c.strokeStyle=r%3?'#dbb642':'#8d660e';c.lineWidth=2.4;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}}
    }
    const pixels=c.getImageData(0,0,512,512);
    for(let i=0;i<pixels.data.length;i+=4){const noise=(random()-.5)*(kind==='cloth'?28:10);pixels.data[i]+=noise;pixels.data[i+1]+=noise;pixels.data[i+2]+=noise;}
    c.putImageData(pixels,0,0);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;return tex;
  }
  const cloth=texture('cloth'),bump=cloth.clone();bump.colorSpace=T.NoColorSpace;bump.repeat.set(6,6);
  const standard=(color:T.ColorRepresentation,roughness=.6,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const fabric=(color:string)=>new T.MeshPhysicalMaterial({color,bumpMap:bump,bumpScale:.006,roughness:.93,sheen:.55,sheenColor:new T.Color('#c9c8c1'),sheenRoughness:.9});
  const marble=texture('marble'),wood=texture('wood');
  const m={
    plaster:standard('#e5e3db',.94), white:standard('#efeee4',.34), edge:standard('#cfc5ac',.5),
    oak:new T.MeshStandardMaterial({map:wood,color:'#e4d6b6',roughness:.47}),
    timber:new T.MeshStandardMaterial({map:texture('floorwood'),roughness:.56}),
    marble:new T.MeshStandardMaterial({map:marble,roughness:.24}),
    cream:fabric('#c5beaf'),linen:fabric('#e9e6dc'),velvet:fabric('#11181c'),blue:fabric('#6c8298'),yellow:fabric('#dbab1c'),
    zebra:new T.MeshPhysicalMaterial({map:texture('zebra'),bumpMap:bump,bumpScale:.004,roughness:.91,sheen:.4}),
    curtain:new T.MeshPhysicalMaterial({color:'#969d9a',map:texture('curtain'),bumpMap:bump,bumpScale:.003,roughness:.85,side:T.DoubleSide}),
    rug:new T.MeshStandardMaterial({map:texture('rug'),bumpMap:bump,bumpScale:.011,roughness:1}),
    art:new T.MeshStandardMaterial({map:texture('art'),bumpMap:texture('art'),bumpScale:.025,metalness:.65,roughness:.38}),
    gold:standard('#cfad53',.26,.82),black:standard('#141919',.4),taupe:standard('#b7ac96',.56),
    steel:standard('#a1a6a5',.27,.8),chrome:standard('#c8d2d2',.13,.95),green:standard('#3c6233',.72),
    ceramic:new T.MeshPhysicalMaterial({color:'#f6f5ed',roughness:.19,clearcoat:.5,side:T.DoubleSide}),
    glass:new T.MeshPhysicalMaterial({color:'#b8d2d0',transparent:true,opacity:.18,roughness:.12,metalness:.1,depthWrite:false,side:T.DoubleSide}),
    glow:new T.MeshStandardMaterial({color:'#fff1cd',emissive:'#ffe3a2',emissiveIntensity:2.2,roughness:.24}),
    screen:new T.MeshStandardMaterial({color:'#14343d',emissive:'#1e6473',emissiveIntensity:.3,roughness:.16,metalness:.2}),
  };
  return m;
}
