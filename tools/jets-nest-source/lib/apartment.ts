import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildApartment, mergeModel } from "./scene-model";
import { furnishRooms } from "./scene-details";
import { Reflector } from "three/addons/objects/Reflector.js";

export type ViewMode="walk"|"overview"|"plan";
export type ApartmentController={goRoom:(id:string)=>void;setMode:(mode:ViewMode)=>void;setNight:(night:boolean)=>void;move:(x:number,z:number)=>void;dispose:()=>void};
type Pose={x:number;z:number;yaw:number;room:string};
type Callbacks={onReady:()=>void;onPose:(pose:Pose)=>void;onError:(message:string)=>void};
export const roomViews:Record<string,{position:[number,number,number];target:[number,number,number]}> = {
 living:{position:[2.90,1.60,.89],target:[1.3,1.0,3.55]},
 kitchen:{position:[3.93,1.60,1.08],target:[5.1,1.10,.64]},
 hall:{position:[2.66,1.60,-.35],target:[3.22,1.15,-1.75]},
 bedroom:{position:[2.87,1.60,-2.98],target:[1.80,1.05,-5.18]},
 bathroom:{position:[1.70,1.60,-1.45],target:[.48,1.0,-1.78]}
};
export function roomAt(x:number,z:number) {
 x=3.6-x;
 if(z < -2.52) return "bedroom";
 if(z < -.04) return x<2.1?"bathroom":"hall";
 if(x>3.63 && z<2.05) return "kitchen";
 return "living";
}
export function insideApartment(x:number,z:number) {
 x=3.6-x;
 return (x>.13&&x<3.47&&z>-.06&&z<4.87)||(x>3.47&&x<5.32&&z>.22&&z<1.87)||
 (x>2.23&&x<3.47&&z>-2.60&&z<.12)||(x>.13&&x<2.25&&z>-2.37&&z<-.13)||
 (x>.13&&x<3.47&&z>-5.87&&z<-2.40);
}
export function createApartment(host:HTMLDivElement,cb:Callbacks):ApartmentController {
 let disposed=false,mode:ViewMode="walk",yaw=0,pitch=0,padX=0,padZ=0,drag=false,prevX=0,prevY=0,frame=0,lastTime=0,lastReport=0;
 const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
 const mobile=matchMedia("(pointer: coarse)").matches;
 let dirty=true;
 const scene=new T.Scene();scene.background=new T.Color("#263b30");
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5));renderer.setSize(host.clientWidth,host.clientHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(63,host.clientWidth/host.clientHeight,.055,70);camera.rotation.order="YXZ";
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enabled=false;orbit.enableDamping=!reduced;orbit.dampingFactor=.075;orbit.minDistance=3;orbit.maxDistance=24;orbit.maxPolarAngle=Math.PI/2-.05;
 const manager=new T.LoadingManager();let loaded=false;
 manager.onLoad=()=>{loaded=true;dirty=true};
 manager.onError=()=>{cb.onError("A reference image could not load. Refresh the view to try again.")};
 const model=buildApartment(manager);scene.add(model.root);
 furnishRooms(model);
 mergeModel(model);
 model.root.scale.x=-1;model.root.position.x=3.6;
 for(const o of model.collisions){const a=o.x1;o.x1=3.6-o.x2;o.x2=3.6-a;}
 const mirror=new Reflector(new T.PlaneGeometry(.55,.43),{textureWidth:512,textureHeight:512,color:0xb6c7bd,clipBias:.003,multisample:2});mirror.position.set(.101,1.70,-1.66);mirror.rotation.y=Math.PI/2;scene.add(mirror);
 const pmrem=new T.PMREMGenerator(renderer);const envScene=new RoomEnvironment();const envTarget=pmrem.fromScene(envScene,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.25;envScene.dispose();pmrem.dispose();
 const ambient=new T.AmbientLight("#fff5df",.62);scene.add(ambient);
 const sky=new T.HemisphereLight("#e9f5ff","#64745e",1.15);scene.add(sky);
 const sun=new T.DirectionalLight("#fff4db",1.95);sun.position.set(3,7,5);sun.target.position.set(1,0,-.5);sun.castShadow=true;
 sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.camera.near=.1;sun.shadow.camera.far=24;sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun,sun.target);
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const lamps:T.PointLight[]=[];
 for(const [x,y,z,power] of [[1.8,2.47,2.6,18],[1.9,2.5,-4.3,15],[4.5,2.5,1.05,10],[2.8,2.5,-1.2,8],[1,2.5,-1.2,9]]) {
   const light=new T.PointLight("#fff1d6",power,8,2);light.position.set(3.6-x,y,z);scene.add(light);lamps.push(light);
 }
 const rt=new T.WebGLRenderTarget(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),{type:T.HalfFloatType});rt.samples=2;
 const composer=new EffectComposer(renderer,rt);composer.addPass(new RenderPass(scene,camera));
 const ao=new GTAOPass(scene,camera,host.clientWidth,host.clientHeight);ao.blendIntensity=.65;ao.updateGtaoMaterial({radius:.22,distanceExponent:1.4,thickness:.25,scale:1});composer.addPass(ao);composer.addPass(new OutputPass());
 ao.enabled=!mobile;
 const lampPowers=lamps.map(l=>l.intensity);
 orbit.addEventListener("change",()=>{dirty=true});
 let savedPosition=new T.Vector3(),savedYaw=0,savedPitch=0;
 function report(){cb.onPose({x:camera.position.x,z:camera.position.z,yaw,room:roomAt(camera.position.x,camera.position.z)})}
 function setWalkPose(id:string) {
   dirty=true;
   const view=roomViews[id] || roomViews.living;camera.position.set(3.6-view.position[0],view.position[1],view.position[2]);
   const dx=-(view.target[0]-view.position[0]),dz=view.target[2]-view.position[2];
   yaw=Math.atan2(dx,dz);pitch=Math.atan2(view.target[1]-view.position[1],Math.hypot(dx,dz));
   camera.rotation.set(pitch,yaw+Math.PI,0,"YXZ");report();
 }
 function setMode(next:ViewMode) {
   dirty=true;renderer.shadowMap.needsUpdate=true;
   if(next===mode)return;
   if(mode==="walk"){savedPosition.copy(camera.position);savedYaw=yaw;savedPitch=pitch}
   mode=next;padX=padZ=0;keys.clear();model.walls.visible=next==="walk";model.ceilings.visible=next==="walk";orbit.enabled=next!=="walk";
   camera.fov=next==="walk"?63:next==="plan"?44:48;camera.updateProjectionMatrix();
   if(next==="walk"){camera.position.copy(savedPosition);yaw=savedYaw;pitch=savedPitch;camera.rotation.set(pitch,yaw+Math.PI,0,"YXZ");report()}
   else {orbit.target.set(.9,0,-.5);orbit.enableRotate=next==="overview";orbit.minPolarAngle=next==="plan"?0:.15;orbit.maxPolarAngle=next==="plan"?.02:Math.PI/2-.05;const eye:[number,number,number]=next==="plan"?[.9,16,-.49]:[9,10.8,11];camera.position.set(...eye);camera.lookAt(orbit.target);orbit.update()}
 }
 const keys=new Set<string>();
 const blocked=(x:number,z:number)=>{
   if(!insideApartment(x,z))return true;
   const r=.14;
   return model.collisions.some(o=>{const px=Math.max(o.x1,Math.min(x,o.x2)),pz=Math.max(o.z1,Math.min(z,o.z2));return (x-px)**2+(z-pz)**2<r*r});
 };
 function advance(dx:number,dz:number,dt:number) {
   if(!dx&&!dz)return;
   const mag=Math.hypot(dx,dz),speed=1.22*(keys.has("ShiftLeft")?1.6:1);
   dx=dx/mag*speed*dt;dz=dz/mag*speed*dt;
   const wx=-Math.cos(yaw)*dx+Math.sin(yaw)*dz,wz=Math.sin(yaw)*dx+Math.cos(yaw)*dz;
   const steps=Math.ceil(Math.max(Math.abs(wx),Math.abs(wz))/.04);
   for(let i=0;i<steps;i++){const nx=camera.position.x+wx/steps,nz=camera.position.z+wz/steps;if(!blocked(nx,camera.position.z))camera.position.x=nx;if(!blocked(camera.position.x,nz))camera.position.z=nz}
 }
 function keydown(e:KeyboardEvent) {
   if(document.querySelector('[data-slot="dialog-content"]'))return;
   if(e.target instanceof HTMLElement && e.target.closest("button,[role=tab],input,textarea,select"))return;
   if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowLeft","ArrowDown","ArrowRight","KeyQ","KeyE","ShiftLeft"].includes(e.code)){e.preventDefault();keys.add(e.code)}
 }
 function keyup(e:KeyboardEvent){keys.delete(e.code)}
 function down(e:PointerEvent){if(mode!=="walk")return;host.focus({preventScroll:true});drag=true;prevX=e.clientX;prevY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)}
 function move(e:PointerEvent){if(!drag||mode!=="walk")return;yaw-=(e.clientX-prevX)*.004;pitch=Math.max(-1.10,Math.min(1.10,pitch-(e.clientY-prevY)*.003));prevX=e.clientX;prevY=e.clientY}
 function up(){drag=false}
 function blur(){keys.clear();padX=padZ=0;drag=false}
 const resize=()=>{dirty=true;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h)};
 const observer=new ResizeObserver(resize);observer.observe(host);
 window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);window.addEventListener("blur",blur);
 renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",up);
 renderer.domElement.addEventListener("webglcontextlost",()=>cb.onError("The 3D view was paused by your browser. Refresh to reopen it."));
 let announced=false;
 setWalkPose("living");savedPosition.copy(camera.position);savedYaw=yaw;savedPitch=pitch;
 function render(time:number) {
   if(disposed)return;
   frame=requestAnimationFrame(render);
   if(document.hidden){blur();lastTime=time;return;}
   const dt=Math.min((time-lastTime)/1000,.04);lastTime=time;
   const moving=drag||padX!==0||padZ!==0||keys.size>0;
   if(moving)dirty=true;
   if(mode==="walk"){
     if(!document.querySelector('[data-slot="dialog-content"]'))advance(padX+(keys.has("KeyD")||keys.has("ArrowRight")?1:0)-(keys.has("KeyA")||keys.has("ArrowLeft")?1:0),padZ+(keys.has("KeyW")||keys.has("ArrowUp")?1:0)-(keys.has("KeyS")||keys.has("ArrowDown")?1:0),dt);
     yaw+=((keys.has("KeyE")?1:0)-(keys.has("KeyQ")?1:0))*dt;
     camera.rotation.set(pitch,yaw+Math.PI,0,"YXZ");
     if(dirty&&time-lastReport>150){report();lastReport=time}
   }else orbit.update();
   if(dirty){composer.render();dirty=false;}
   if(loaded&&!announced){announced=true;cb.onReady()}
 }
 frame=requestAnimationFrame(render);
 return {
   goRoom(id){setMode("walk");setWalkPose(id);host.focus({preventScroll:true})},
   setMode,
   setNight(night){dirty=true;ambient.intensity=night?.36:.62;sky.intensity=night?.3:1.15;sun.intensity=night?.12:1.95;lamps.forEach((l,i)=>{l.color.set(night?"#ffd590":"#fff1d6");l.intensity=lampPowers[i]*(night?1.3:1)});renderer.toneMappingExposure=night?1.07:1.04},
   move(x,z){padX=x;padZ=z},
   dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);window.removeEventListener("blur",blur);renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",up);orbit.dispose();ao.dispose();composer.dispose();mirror.dispose();envTarget.dispose();const materials=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat)}});for(const mat of materials){for(const value of Object.values(mat))if(value instanceof T.Texture)textures.add(value);mat.dispose()}for(const t of textures)t.dispose();renderer.dispose();renderer.domElement.remove()}
 };
}
