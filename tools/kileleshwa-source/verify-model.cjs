const {buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.join(__dirname,'node_modules/.cache/verify-model.cjs');
buildSync({stdin:{contents:`import {buildApartment,orientModel} from './lib/scene-model';import {furnishRooms} from './lib/scene-details';import {furnishServices} from './lib/scene-services';import {roomViews} from './lib/data';import {createNavigation} from './lib/navigation';const model=buildApartment();furnishRooms(model);furnishServices(model);orientModel(model);export {roomViews};export const nav=createNavigation(model.collisions);`,resolveDir:__dirname,loader:'ts'},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const context=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,key)=>key in o?o[key]:()=>{}});
global.document={createElement:()=>({getContext:()=>context})};
const {roomViews,nav}=require(output);let routes=0;
for(const [room,{position:[x,,z]}] of Object.entries(roomViews)){
 assert.equal(nav.blocked(x,z),false,room+' landing intersects furniture or walls');
 for(const [next,{position:[tx,,tz]}] of Object.entries(roomViews)){
  const route=nav.path([x,z],[tx,tz]);assert.ok(route,room+' has no traversable route to '+next);
  for(let i=1;i<route.length;i++)assert.ok(nav.segment(route[i-1],route[i]),room+' to '+next+' cuts through an obstacle');routes++;
 }
}
assert.equal(nav.blocked(-.5,3),true,'outside floor must block movement');assert.equal(nav.blocked(5.4,4.7),true,'sofa must block movement');assert.equal(nav.blocked(1.6,2.48),true,'bed must block movement');
console.log('PASS:',routes,'room-to-room paths, clear arrival positions, walls and furniture collisions');fs.unlinkSync(output);
