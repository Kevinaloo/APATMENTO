export const listing={id:'2d488e1a-3582-409f-ac3c-5f67adc90c74',title:'Fully furnished Elegant 1Bedroom in Kileleshwa',location:'Kileleshwa · Nairobi',description:'A considered city retreat. Pale oak, soft ivory and a touch of gold.',guests:2,bedrooms:1,bathrooms:1};
export const photoUrl=(id:number)=>`/tours/kileleshwa-elegant/photos/${id}.jpg`;
export const rooms=[
 {id:'living',name:'Living room',detail:'Soft ivory. A little gold.',image:3,photos:[1,3,5,8]},
 {id:'dining',name:'Dining & work',detail:'Slow mornings. Space to focus.',image:11,photos:[11,5,1]},
 {id:'kitchen',name:'Kitchen',detail:'Pale oak, thoughtfully equipped.',image:6,photos:[6,12,7,13]},
 {id:'bedroom',name:'Bedroom',detail:'Charcoal velvet. A golden finish.',image:2,photos:[2,16,17]},
 {id:'bathroom',name:'Bathroom',detail:'Marble tones & a glass shower.',image:9,photos:[9,14]},
 {id:'utility',name:'Laundry',detail:'The practical details, considered.',image:10,photos:[10,6]},
];
export const amenityPhotos=[{id:18,name:'Shared indoor pool'},{id:4,name:'Shared gym'},{id:15,name:'Shared play area'}];
export const sceneRooms=[
 {id:'living',x:0,z:1.8,w:3.7,d:4.6},{id:'dining',x:0,z:0,w:3.7,d:1.8},
 {id:'kitchen',x:0,z:-2.6,w:3.7,d:2.6},{id:'utility',x:0,z:-3.8,w:3.7,d:1.2},
 {id:'hall',x:3.7,z:-2.6,w:1.2,d:4.4},{id:'bedroom',x:4.9,z:0,w:3.6,d:4},
 {id:'bathroom',x:4.9,z:-2.6,w:2.4,d:2.6},
];
export const reflectX=(x:number)=>8.5-x;
export const planRooms=sceneRooms.map(room=>({...room,x:reflectX(room.x+room.w)}));
export const planBounds={minX:0,maxX:8.5,minZ:-3.8,maxZ:6.4};
const authoredViews:Record<string,{position:[number,number,number];target:[number,number,number]}>= {
 living:{position:[.9,1.6,2.25],target:[2.4,1.25,5.3]},
 dining:{position:[.7,1.6,.25],target:[2.6,1.02,1.65]},
 kitchen:{position:[1.5,1.6,-.48],target:[1.5,1.2,-2.4]},
 bedroom:{position:[7.85,1.6,.65],target:[6.5,1.15,2.8]},
 bathroom:{position:[5.42,1.6,-1.35],target:[6.8,1.25,-1.1]},
 utility:{position:[2.6,1.6,-3.15],target:[.75,.7,-3.4]},
};
export const roomViews=Object.fromEntries(Object.entries(authoredViews).map(([id,view])=>[id,{position:[reflectX(view.position[0]),view.position[1],view.position[2]] as [number,number,number],target:[reflectX(view.target[0]),view.target[1],view.target[2]] as [number,number,number]}]));
