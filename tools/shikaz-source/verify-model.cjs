// Verify that every room landing is clear and reachable through the walkable floor.
const {buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.join(__dirname,'node_modules/.cache/verify-model.cjs');
buildSync({stdin:{contents:`import * as T from 'three';import {buildApartment} from './lib/scene-model';import {furnishRooms} from './lib/scene-details';import {furnishServices} from './lib/scene-services';import {roomViews,insideApartment} from './lib/apartment';const m=buildApartment(new T.LoadingManager());furnishRooms(m);furnishServices(m);export {roomViews,insideApartment};export const collisions=m.collisions;`,resolveDir:__dirname,loader:'ts'},outfile:output,bundle:true,platform:'node',format:'cjs',treeShaking:true,logLevel:'silent'});
const context=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(o,key)=>key in o?o[key]:()=>{}});
global.document={createElement:()=>({getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
const {roomViews,insideApartment,collisions}=require(output);
const blocked=(x,z)=>!insideApartment(x,z)||collisions.some(o=>{const px=Math.max(o.x1,Math.min(x,o.x2)),pz=Math.max(o.z1,Math.min(z,o.z2));return (x-px)**2+(z-pz)**2<.14**2});
const step=.06,minX=-4.86,maxX=4.2,maxZ=10.38,cols=Math.round((maxX-minX)/step)+1,rows=Math.round(maxZ/step)+1;
const key=(x,z)=>Math.round(z/step)*cols+Math.round((x-minX)/step);
const xy=k=>[minX+(k%cols)*step,Math.floor(k/cols)*step];
const start=key(roomViews.living.position[0],roomViews.living.position[2]),seen=new Set([start]),queue=[start];
for(let i=0;i<queue.length;i++){const k=queue[i],col=k%cols,row=Math.floor(k/cols);for(const next of [col>0?k-1:-1,col<cols-1?k+1:-1,row>0?k-cols:-1,row<rows-1?k+cols:-1]){if(next<0||seen.has(next)||blocked(...xy(next)))continue;seen.add(next);queue.push(next)}}
for(const [name,{position:[x,,z]}] of Object.entries(roomViews)){assert.equal(blocked(x,z),false,name+' landing intersects furniture or a wall');assert.ok(seen.has(key(x,z)),name+' has no walkable path from the living room');console.log('Clear landing and reachable:',name)}
fs.unlinkSync(output);
