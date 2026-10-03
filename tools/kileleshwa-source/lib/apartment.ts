import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {buildApartment,mergeModel,orientModel} from './scene-model';
import {furnishRooms} from './scene-details';
import {furnishServices} from './scene-services';
import {roomViews,rooms,reflectX} from './data';
import {createNavigation,roomAt} from './navigation';
export {roomViews} from './data';
export {insideApartment} from './navigation';

export type ViewMode='walk'|'overview'|'plan';
type Lighting='day'|'golden'|'evening';
type Pose={x:number;z:number;yaw:number;room:string};
type Callbacks={onReady:()=>void;onPose:(pose:Pose)=>void;onError:(message:string)=>void;onTourChange:(playing:boolean)=>void;onProgress:(progress:number)=>void;onModeChange?:(mode:ViewMode)=>void};
export type ApartmentController={goRoom:(id:string)=>void;setMode:(mode:ViewMode)=>void;setLighting:(light:Lighting)=>void;setTour:(playing:boolean)=>void;setPaused:(paused:boolean)=>void;move:(x:number,z:number)=>void;reset:()=>void;dispose:()=>void};

export function createApartment(host:HTMLDivElement,cb:Callbacks):ApartmentController{
 let disposed=false,mode:ViewMode='walk',lighting:Lighting='day',paused=false,touring=false,frame=0,lastTime=0,lastReport=0,dirty=true,drag=false,pointer=0,previousX=0,previousY=0,downX=0,downY=0,padX=0,padZ=0,yaw=0,pitch=0,tourIndex=0,tourDwell=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(pointer: coarse)').matches;
 const scene=new T.Scene();scene.background=new T.Color('#d7dbd5');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.info.autoReset=false;
 renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(61,Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight),.05,90);camera.rotation.order='YXZ';
 const planCamera=new T.OrthographicCamera(-7,7,7,-7,.1,80);planCamera.position.set(4.25,20,1.3);planCamera.up.set(0,0,-1);planCamera.lookAt(4.25,0,1.3);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enabled=false;orbit.enableDamping=!motion.matches;orbit.dampingFactor=.09;orbit.minDistance=7;orbit.maxDistance=25;orbit.maxPolarAngle=Math.PI/2-.1;
 const planOrbit=new OrbitControls(planCamera,renderer.domElement);planOrbit.enabled=false;planOrbit.enableRotate=false;planOrbit.enableDamping=false;planOrbit.minZoom=.75;planOrbit.maxZoom=2.5;planOrbit.target.set(4.25,0,1.3);
 const model=buildApartment();furnishRooms(model);furnishServices(model);mergeModel(model);orientModel(model);scene.add(model.root);
 const nav=createNavigation(model.collisions);
 const mirror=new Reflector(new T.CircleGeometry(.265,40),{textureWidth:mobile?256:512,textureHeight:mobile?256:512,color:0xcbd3c7,clipBias:.004,multisample:0});mirror.position.set(reflectX(3.585),1.76,1.89);mirror.rotation.y=Math.PI/2;mirror.scale.y=1.2;scene.add(mirror);
 const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment(),envTarget=pmrem.fromScene(environment,.03);scene.environment=envTarget.texture;scene.environmentIntensity=.26;environment.dispose();pmrem.dispose();
 const ambient=new T.AmbientLight('#fff6e9',.46),sky=new T.HemisphereLight('#f5f9ff','#b3a695',1.05);scene.add(ambient,sky);
 const sun=new T.DirectionalLight('#fff3d9',1.8);sun.position.set(reflectX(.8),8,9.5);sun.target.position.set(reflectX(3),0,1.5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.2,far:30});sun.shadow.bias=-.00025;sun.shadow.normalBias=.028;sun.shadow.radius=3;scene.add(sun,sun.target);
 // Local fill lights preserve the interior's photographed soft illumination.
 const lamps:T.PointLight[]=[];
 for(const [x,y,z,power] of [[1.85,2.38,4.5,16],[1.8,2.5,1.0,11],[1.6,2.4,-1.3,13],[6.8,2.5,2,13],[5.8,2.5,-1.2,10],[4.25,2.5,-.6,8],[1.8,2.4,-3.3,6]]){const lamp=new T.PointLight('#fff1d8',power,9,2);lamp.position.set(reflectX(x),y,z);scene.add(lamp);lamps.push(lamp);}
 const lampPowers=lamps.map(l=>l.intensity);
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const target=new T.WebGLRenderTarget(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),{type:T.HalfFloatType});target.samples=mobile?0:2;
 const composer=new EffectComposer(renderer,target),renderPass=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera,host.clientWidth,host.clientHeight);ao.blendIntensity=.55;ao.updateGtaoMaterial({radius:.22,distanceExponent:1.4,thickness:.5,scale:1});ao.enabled=!mobile;composer.addPass(renderPass);composer.addPass(ao);composer.addPass(new OutputPass());
 const hotspots=new T.Group();scene.add(hotspots);const picks:T.Object3D[]=[];
 for(const room of rooms){const p=roomViews[room.id].position;const ring=new T.Mesh(new T.RingGeometry(.12,.15,36),new T.MeshBasicMaterial({color:'#d9b974',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p[0],.035,p[2]);ring.userData.room=room.id;hotspots.add(ring);const disk=new T.Mesh(new T.CircleGeometry(.19,24),new T.MeshBasicMaterial({color:'#f4e9d3',transparent:true,opacity:.09,side:T.DoubleSide,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.copy(ring.position);disk.userData.room=room.id;hotspots.add(disk);picks.push(disk);}
 const keys=new Set<string>(),saved={position:new T.Vector3(),yaw:0,pitch:0};
 type Journey={points:[number,number][];lengths:number[];distance:number;elapsed:number;duration:number;id:string;startYaw:number;startPitch:number};
 let journey:Journey|null=null;
 const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
 const report=()=>cb.onPose({x:camera.position.x,z:camera.position.z,yaw,room:roomAt(camera.position.x,camera.position.z)});
 function orient(target:T.Vector3|[number,number,number]){const point=target instanceof T.Vector3?target:new T.Vector3(...target);const dx=point.x-camera.position.x,dz=point.z-camera.position.z;yaw=Math.atan2(dx,dz);pitch=Math.atan2(point.y-camera.position.y,Math.hypot(dx,dz));camera.rotation.set(pitch,yaw+Math.PI,0,'YXZ');}
 function direct(id:string){const view=roomViews[id]||roomViews.living;camera.position.set(...view.position);orient(view.target);dirty=true;report();}
 function stopTour(){if(touring){touring=false;cb.onTourChange(false);}tourDwell=0;}
 function setMode(next:ViewMode){
  if(mode===next)return;
  stopTour();journey=null;clearInput();dirty=true;renderer.shadowMap.needsUpdate=true;
  if(mode==='walk'){saved.position.copy(camera.position);saved.yaw=yaw;saved.pitch=pitch;}
  mode=next;cb.onModeChange?.(next);model.walls.visible=next==='walk';model.ceilings.visible=next==='walk';model.lowWalls.visible=next!=='walk';mirror.visible=next==='walk';hotspots.visible=next==='walk';orbit.enabled=next==='overview'&&!paused;planOrbit.enabled=next==='plan'&&!paused;
  renderPass.camera=next==='plan'?planCamera:camera;ao.camera=next==='plan'?planCamera:camera;ao.enabled=!mobile&&next!=='plan';
  if(next==='walk'){camera.position.copy(saved.position);yaw=saved.yaw;pitch=saved.pitch;camera.fov=61;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw+Math.PI,0,'YXZ');report();}
  else if(next==='overview'){camera.fov=44;camera.updateProjectionMatrix();orbit.target.set(4.25,.2,1.3);camera.position.set(13,10.5,12.5);camera.lookAt(orbit.target);orbit.update();}
  else{planCamera.zoom=1;planOrbit.target.set(4.25,0,1.3);planCamera.position.set(4.25,20,1.3);planCamera.updateProjectionMatrix();planOrbit.update();}
 }
 function navigate(id:string){
  if(!roomViews[id])return;
  if(mode!=='walk')setMode('walk');
  clearInput();const destination=roomViews[id].position;const path=nav.path([camera.position.x,camera.position.z],[destination[0],destination[2]]);
  if(motion.matches){direct(id);journey=null;return;}
  if(!path){cb.onError('This route is temporarily unavailable. Use Return to living room to reset your position.');return;}
  const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
  journey={points:path,lengths,distance:lengths.at(-1)!,elapsed:0,duration:Math.max(1.3,lengths.at(-1)!/1.3),id,startYaw:yaw,startPitch:pitch};dirty=true;
 }
 function advanceJourney(dt:number){
  if(!journey)return;
  const j=journey;j.elapsed+=dt;const t=Math.min(1,j.elapsed/j.duration),ease=t*t*(3-2*t),distance=ease*j.distance;
  let i=1;while(i<j.lengths.length-1&&j.lengths[i]<distance)i++;
  const a=j.points[i-1],b=j.points[i],portion=(distance-j.lengths[i-1])/Math.max(.001,j.lengths[i]-j.lengths[i-1]);camera.position.set(T.MathUtils.lerp(a[0],b[0],portion),1.6,T.MathUtils.lerp(a[1],b[1],portion));
  const view=roomViews[j.id],dx=view.target[0]-camera.position.x,dz=view.target[2]-camera.position.z;
  let aim=Math.atan2(b[0]-a[0],b[1]-a[1]);if(j.distance<.2)aim=Math.atan2(dx,dz);const arrival=T.MathUtils.smoothstep(t,.62,1);aim+=angleDelta(aim,Math.atan2(dx,dz))*arrival;
  yaw+=angleDelta(yaw,aim)*Math.min(1,dt*3.4);pitch=T.MathUtils.lerp(pitch,T.MathUtils.lerp(-.07,Math.atan2(view.target[1]-1.6,Math.hypot(dx,dz)),arrival),Math.min(1,dt*4));
  if(t===1){journey=null;tourDwell=0;}dirty=true;
 }
 function clearInput(){keys.clear();padX=padZ=0;drag=false;}
 function manual(){journey=null;stopTour();}
 function advance(dx:number,dz:number,dt:number){if(!dx&&!dz)return;manual();const mag=Math.hypot(dx,dz),speed=keys.has('ShiftLeft')?1.8:1.15;dx=dx/mag*speed*dt;dz=dz/mag*speed*dt;const wx=-Math.cos(yaw)*dx+Math.sin(yaw)*dz,wz=Math.sin(yaw)*dx+Math.cos(yaw)*dz;const steps=Math.max(1,Math.ceil(Math.max(Math.abs(wx),Math.abs(wz))/.035));for(let i=0;i<steps;i++){const nx=camera.position.x+wx/steps,nz=camera.position.z+wz/steps;if(!nav.blocked(nx,camera.position.z))camera.position.x=nx;if(!nav.blocked(camera.position.x,nz))camera.position.z=nz;}dirty=true;}
 const raycaster=new T.Raycaster(),ndc=new T.Vector2();
 function hit(e:PointerEvent){const rect=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(ndc,mode==='plan'?planCamera:camera);if(mode==='walk'){const hit=raycaster.intersectObjects(picks)[0];if(!hit)return null;const obstruction=raycaster.intersectObject(model.root,true)[0];return obstruction&&obstruction.distance<hit.distance-.15?null:hit.object.userData.room as string;}
  const plane=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();if(!raycaster.ray.intersectPlane(plane,point)||!nav.path([roomViews.living.position[0],roomViews.living.position[2]],[point.x,point.z]))return null;const id=roomAt(point.x,point.z);return roomViews[id]?id:null;
 }
 function down(e:PointerEvent){if(paused)return;pointer=e.pointerId;downX=previousX=e.clientX;downY=previousY=e.clientY;if(mode==='walk'){manual();drag=true;host.focus({preventScroll:true});renderer.domElement.setPointerCapture(e.pointerId);}}
 function movePointer(e:PointerEvent){if(paused)return;if(drag&&mode==='walk'){yaw-=(e.clientX-previousX)*.0035;pitch=T.MathUtils.clamp(pitch-(e.clientY-previousY)*.0028,-1.12,1.12);previousX=e.clientX;previousY=e.clientY;dirty=true;}else renderer.domElement.style.cursor=hit(e)?'pointer':mode==='walk'?'grab':'default';}
 function up(e:PointerEvent){if(paused)return;if(e.pointerId===pointer&&Math.hypot(e.clientX-downX,e.clientY-downY)<6){const id=hit(e);if(id){stopTour();navigate(id);}}drag=false;}
 function keydown(e:KeyboardEvent){if(paused||mode!=='walk'||(e.target instanceof HTMLElement&&e.target.closest('button,a,input,textarea,select,dialog,[role=button]')))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','ShiftLeft'].includes(e.code)){e.preventDefault();manual();keys.add(e.code);}}
 const keyup=(e:KeyboardEvent)=>keys.delete(e.code),blur=()=>clearInput();
 const contextLost=(event:Event)=>{event.preventDefault();clearInput();stopTour();paused=true;cb.onError('The browser paused the 3D view. Reload to reopen it, or explore the original photos.');};
 const resize=()=>{dirty=true;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();const halfH=Math.max(5.7,4.9/(w/h));planCamera.left=-halfH*w/h;planCamera.right=halfH*w/h;planCamera.top=halfH;planCamera.bottom=-halfH;planCamera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 orbit.addEventListener('change',()=>{dirty=true;});planOrbit.addEventListener('change',()=>{dirty=true;});
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',movePointer);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',blur);renderer.domElement.addEventListener('webglcontextlost',contextLost);
 direct('living');saved.position.copy(camera.position);saved.yaw=yaw;saved.pitch=pitch;model.lowWalls.visible=false;
 let announced=false;
 function render(time:number){
  if(disposed)return;frame=requestAnimationFrame(render);const dt=Math.min((time-lastTime)/1000,.045);lastTime=time;if(document.hidden){clearInput();return;}
  if(!paused&&mode==='walk'){
   advance(padX+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),padZ+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),dt);
   if(keys.has('KeyQ')||keys.has('KeyE')){yaw+=((keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0))*dt;dirty=true;}
   advanceJourney(dt);
   if(touring){if(!journey){tourDwell+=dt;if(!motion.matches){yaw+=Math.sin(tourDwell*.5)*dt*.055;dirty=true;}if(tourDwell>5){tourIndex++;if(tourIndex>=rooms.length){stopTour();cb.onProgress(1);}else navigate(rooms[tourIndex].id);}}cb.onProgress(Math.min(1,(tourIndex+(journey?Math.min(.7,journey.elapsed/journey.duration*.7):.7+Math.min(.3,tourDwell/5*.3)))/rooms.length));}
  }
  if(mode==='walk'){camera.rotation.set(pitch,yaw+Math.PI,0,'YXZ');if(dirty&&time-lastReport>100){report();lastReport=time;}}else if(mode==='overview'&&!paused)orbit.update();else if(mode==='plan'&&!paused)planOrbit.update();
  if(dirty){renderer.info.reset();composer.render();dirty=false;if(!announced){announced=true;cb.onReady();}}
 }
 frame=requestAnimationFrame(render);
 const api:ApartmentController={
  goRoom(id){stopTour();navigate(id);},setMode,
  setLighting(light){lighting=light;dirty=true;renderer.shadowMap.needsUpdate=true;const night=light==='evening',golden=light==='golden';ambient.intensity=night?.23:.46;sky.intensity=night?.25:golden?.8:1.05;sun.intensity=night?.12:golden?1.9:1.8;sun.color.set(golden?'#ffc580':night?'#8da8d5':'#fff3d9');sun.position.set(reflectX(golden?-4:.8),golden?4:8,9.5);lamps.forEach((l,i)=>{l.color.set(night?'#ffcc88':golden?'#ffe1ad':'#fff1d8');l.intensity=lampPowers[i]*(night?1.4:1);});model.m.glow.emissiveIntensity=night?3.3:2.2;scene.background=new T.Color(night?'#25343c':golden?'#d5bca3':'#d7dbd5');renderer.toneMappingExposure=night?1.04:.96;},
  setTour(playing){if(!playing){stopTour();journey=null;return;}setMode('walk');touring=true;tourIndex=0;tourDwell=0;cb.onTourChange(true);cb.onProgress(0);navigate(rooms[0].id);},
  setPaused(value){paused=value;if(value)clearInput();orbit.enabled=!value&&mode==='overview';planOrbit.enabled=!value&&mode==='plan';dirty=true;},
  move(x,z){if(paused)return;if(x||z)manual();padX=x;padZ=z;},
  reset(){stopTour();journey=null;setMode('walk');direct('living');cb.onProgress(0);},
  dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',movePointer);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',blur);renderer.domElement.removeEventListener('webglcontextlost',contextLost);orbit.dispose();planOrbit.dispose();ao.dispose();composer.dispose();mirror.dispose();envTarget.dispose();const mats=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(mat=>mats.add(mat));}});Object.values(model.m).forEach(mat=>mats.add(mat));for(const mat of mats){Object.values(mat).forEach(value=>{if(value instanceof T.Texture)textures.add(value);});mat.dispose();}textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
 };
 // A read-only snapshot enables repeatable geometry/performance checks in a local preview.
 if(location.hostname==='localhost'||location.hostname==='127.0.0.1')Object.defineProperty(host,'tourSnapshot',{configurable:true,value:()=>({mode,lighting,paused,touring,journey:journey?.id||null,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},yaw,room:roomAt(camera.position.x,camera.position.z),blocked:nav.blocked(camera.position.x,camera.position.z),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,orthographic:renderPass.camera===planCamera})});
 return api;
}
