"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Footprints, Box, Map, Images, Info, Maximize, Sun, Moon, RotateCcw, Play, Pause, ChevronLeft, ChevronRight, MousePointer2, Compass } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ApartmentController, ViewMode } from "@/lib/apartment";

const rooms = [
  { id:"living", name:"Living room", detail:"Mint, velvet & gold", image:15, photos:[15,16,17,14,12,13] },
  { id:"kitchen", name:"Kitchen", detail:"A compact cooking space", image:11, photos:[11,4] },
  { id:"hall", name:"Hallway", detail:"Connecting the rooms", image:6, photos:[6,17] },
  { id:"bedroom", name:"Bedroom", detail:"Warm timber & soft linen", image:8, photos:[8,7,10,1] },
  { id:"bathroom", name:"Bathroom", detail:"Combined shower & toilet", image:3, photos:[3,2,5,9] },
];

export default function Home() {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<ApartmentController | null>(null);
  const [ready,setReady] = useState(false);
  const [error,setError] = useState("");
  const [mode,setMode] = useState<ViewMode>("walk");
  const [room,setRoom] = useState("living");
  const [night,setNight] = useState(false);
  const [gallery,setGallery] = useState(false);
  const [info,setInfo] = useState(false);
  const [photo,setPhoto] = useState(15);
  const [tour,setTour] = useState(false);
  const [pose,setPose] = useState({x:2.75,z:0.8,yaw:0});
  const selected = rooms.find(r=>r.id===room) || rooms[0];
  const visibleState = useRef({room,mode,night});
  useEffect(()=>{visibleState.current={room,mode,night}},[room,mode,night]);
  useEffect(()=>{
    if(!ready)return;
    type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
    const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const register=(tool:Tool)=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}};
    register({name:"navigate_apartment",description:"Move to the selected apartment room and show its 3D walking view.",inputSchema:{type:"object",properties:{room:{type:"string",enum:rooms.map(r=>r.id)}},required:["room"],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input)=>{
      const value=input as {room?:unknown};
      if(!value || typeof value.room!=="string" || !rooms.some(r=>r.id===value.room) || Object.keys(value).some(k=>k!=="room"))throw new Error("Choose living, kitchen, hall, bedroom, or bathroom.");
      flushSync(()=>chooseRoom(value.room as string));
      return {room:visibleState.current.room,view:visibleState.current.mode};
    }});
    register({name:"get_apartment_view",description:"Read the room, view mode and lighting currently shown in the apartment viewer.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({room:visibleState.current.room,view:visibleState.current.mode,lighting:visibleState.current.night?"evening":"daylight",dimensions:"estimated"})});
    return ()=>lifecycle.abort();
  // Register a single page-scoped tool surface once the 3D scene is ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready]);

  useEffect(()=>{
    let alive=true;
    import("@/lib/apartment").then(({createApartment})=>{
      if(!alive || !mount.current) return;
      const controller=createApartment(mount.current,{
        onReady:()=>{if(alive)setReady(true)},
        onPose:(p)=>{if(alive){setPose(p);setRoom(p.room)}},
        onError:(message)=>{if(alive)setError(message)}
      });
      if(alive) api.current=controller; else controller.dispose();
    }).catch(()=>{if(alive)setError("The 3D view could not load. You can still explore the original room photos.")});
    return ()=>{alive=false;api.current?.dispose();api.current=null};
  },[]);
  useEffect(()=>{
    if(!tour) return;
    let i=rooms.findIndex(r=>r.id===room);
    const interval=setInterval(()=>{i=(i+1)%rooms.length;chooseRoom(rooms[i].id,false)},8000);
    return ()=>clearInterval(interval);
  // The tour starts from the room selected when playback begins.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tour]);

  function chooseRoom(id:string,stopTour=true) {
    if(stopTour)setTour(false);
    setRoom(id);setMode("walk");api.current?.goRoom(id);
  }
  function changeMode(value:string) {
    const next=value as ViewMode;
    setMode(next);setTour(false);api.current?.setMode(next);
  }
  function changeLight() {setNight(!night);api.current?.setNight(!night)}
  function openPhotos() {setPhoto(selected.image);setGallery(true)}
  function stepPhoto(step:number) {
    const list=selected.photos;const i=list.indexOf(photo);
    setPhoto(list[(Math.max(0,i)+step+list.length)%list.length]);
  }
  async function fullscreen() {
    if(document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.().catch(()=>{});
  }
  const pad = (dx:number,dz:number) => ({
    onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{event.currentTarget.setPointerCapture(event.pointerId);setTour(false);api.current?.move(dx,dz)},
    onPointerUp:()=>api.current?.move(0,0),
    onPointerCancel:()=>api.current?.move(0,0),
    onLostPointerCapture:()=>api.current?.move(0,0),
  });

  return <main className="apartment-app">
    <div ref={mount} className="scene" aria-label="Interactive 3D apartment. Drag to look around; use W A S D or the arrow keys to walk." tabIndex={0} onPointerDown={()=>setTour(false)}/>
    {!ready && <div className="loading-view"><img src="/photos/15.jpg" alt="The living room with beige sofas and gold curtains"/><div className="loading-card"><span className="eyebrow">THE JETS NEST</span><h1>{error ? "Explore the room photos" : "Opening the apartment"}</h1><p>{error || "Preparing materials, light, and the little details."}</p>{!error && <div className="load-line"/>}{error && <button onClick={openPhotos}>View original photos <Images size={18}/></button>}</div></div>}
    <header className="topbar">
      <div className="brand"><span className="brand-symbol"><Box size={23} strokeWidth={1.2}/></span><div><strong>CABANA</strong><span>The Jets Nest</span></div></div>
      <Tabs value={mode} onValueChange={changeMode} className="mode-tabs" aria-label="View mode">
        <TabsList className="mode-list">
          <TabsTrigger value="walk" className="mode-trigger"><Footprints size={17}/><span>Walk through</span></TabsTrigger>
          <TabsTrigger value="overview" className="mode-trigger"><Box size={17}/><span>Dollhouse</span></TabsTrigger>
          <TabsTrigger value="plan" className="mode-trigger"><Map size={17}/><span>Floor plan</span></TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="top-actions"><button className="icon-button" title={night?"Switch to daylight":"Switch to evening light"} aria-label={night?"Switch to daylight":"Switch to evening light"} onClick={changeLight}>{night?<Moon size={19}/>:<Sun size={19}/>}</button><button className="icon-button" title="About this reconstruction" aria-label="About this reconstruction" onClick={()=>setInfo(true)}><Info size={19}/></button><button className="icon-button fullscreen-button" title="Full screen" aria-label="Full screen" onClick={fullscreen}><Maximize size={19}/></button></div>
    </header>

    <div className="location-card"><span className="eyebrow"><span className="live-dot"/>{mode==="walk"?"YOU ARE HERE":"EXPLORE THE APARTMENT"}</span><h1>{mode==="walk"?selected.name:mode==="overview"?"A different perspective":"Every room, connected"}</h1><p>{mode==="walk"?selected.detail:mode==="overview"?"Drag to rotate · Scroll to get closer":"Select a room below to step inside"}</p></div>

    <aside className="map-card" aria-label="Apartment orientation">
      <div className="map-heading"><span><Compass size={14}/> YOUR POSITION</span><button aria-label="Show floor plan" onClick={()=>changeMode(mode==="plan"?"walk":"plan")}><Maximize size={13}/></button></div>
      <svg viewBox="-2.25 -6.5 6.4 12" role="img" aria-label="Approximate apartment floor plan, with bedroom beyond the hallway and bathroom opposite the hall basin">
        <g transform="translate(3.6 0) scale(-1 1)"><g stroke="#769187" strokeWidth=".08" strokeLinejoin="round">
          <rect x="0" y="0" width="3.6" height="5" fill={room==="living"?"#668873":"#304a40"}/>
          <rect x="3.6" y="0.1" width="1.85" height="1.9" fill={room==="kitchen"?"#668873":"#304a40"}/>
          <rect x="2.1" y="-2.5" width="1.5" height="2.5" fill={room==="hall"?"#668873":"#304a40"}/>
          <rect x="0" y="-2.5" width="2.1" height="2.5" fill={room==="bathroom"?"#668873":"#304a40"}/>
          <rect x="0" y="-6" width="3.6" height="3.5" fill={room==="bedroom"?"#668873":"#304a40"}/>
        </g>
        <g fill="#9cb2a4" opacity=".6"><rect x=".12" y="1.45" width=".82" height="2.65" rx=".12"/><rect x=".9" y="4.02" width="1.8" height=".83" rx=".12"/><rect x="1.2" y="-5.77" width="1.8" height="2.15" rx=".08"/><rect x="4.79" y=".25" width=".53" height="1.55"/><rect x=".35" y="-2.3" width=".5" height=".7" rx=".2"/></g>
        <g stroke="#d3e2d7" strokeWidth=".11"><path d="M2.15 0h1.35M2.3-2.5h1.05M2.1-1.9v.9M3.6.3v1"/></g>
        </g><circle cx={pose.x} cy={pose.z} r=".17" fill="#f4cc7b" stroke="#fff0cb" strokeWidth=".06"/>
        <path d="M0 -.28L-.16 -.04L.16 -.04Z" fill="#f4cc7b" transform={"translate("+pose.x+" "+pose.z+") rotate("+(-pose.yaw*180/Math.PI+180)+")"}/>
      </svg><span className="map-note">Approximate proportions</span>
    </aside>

    <div className="view-tools">
      <button onClick={openPhotos}><Images size={17}/> Room photos <span>{selected.photos.length}</span></button>
      <button onClick={()=>{setTour(!tour);setMode("walk");api.current?.setMode("walk")}} aria-pressed={tour}>{tour?<Pause size={17}/>:<Play size={17}/>}<span>{tour?"Pause tour":"Room tour"}</span></button>
      <button className="reset" onClick={()=>{setTour(false);setMode("walk");setRoom("living");api.current?.goRoom("living")}} aria-label="Return to the living room"><RotateCcw size={17}/></button>
    </div>
    {mode==="walk" && <div className="walk-pad" aria-label="Movement controls">
      <button {...pad(0,1)} aria-label="Walk forward"><ArrowUp size={19}/></button><button {...pad(-1,0)} aria-label="Move left"><ArrowLeft size={19}/></button><span><Footprints size={16}/></span><button {...pad(1,0)} aria-label="Move right"><ArrowRight size={19}/></button><button {...pad(0,-1)} aria-label="Walk backward"><ArrowDown size={19}/></button>
    </div>}
    <nav className="room-dock" aria-label="Go to a room">
      <div className="dock-label"><span className="eyebrow">STEP INSIDE</span><span>Choose a room</span></div>
      {rooms.map((r,i)=><button key={r.id} onClick={()=>chooseRoom(r.id)} className={"room-button "+(r.id===room&&mode==="walk"?"selected":"")} aria-current={r.id===room&&mode==="walk"?"location":undefined}><img src={"/photos/"+r.image+".jpg"} alt=""/><span><small>{"0"+(i+1)}</small>{r.name}</span><ArrowUp size={14}/></button>)}
    </nav>
    <footer className="viewer-footer"><span><MousePointer2 size={13}/>{mode==="walk"?"Drag to look · W A S D / arrows to walk":"Drag to rotate · Scroll to zoom"}</span><button onClick={()=>setInfo(true)}>Photo-based reconstruction · Estimated dimensions <Info size={12}/></button></footer>

    <Dialog open={gallery} onOpenChange={setGallery}><DialogContent className="photo-dialog"><DialogHeader><DialogTitle>{selected.name} · Original photos</DialogTitle><DialogDescription>Compare the reconstruction with the supplied apartment photographs.</DialogDescription></DialogHeader><div className="photo-stage"><img src={"/photos/"+photo+".jpg"} alt={selected.name+" original reference photo "+photo}/><button onClick={()=>stepPhoto(-1)} aria-label="Previous photo" className="photo-prev"><ChevronLeft/></button><button onClick={()=>stepPhoto(1)} aria-label="Next photo" className="photo-next"><ChevronRight/></button></div><div className="photo-thumbs">{selected.photos.map(p=><button key={p} onClick={()=>setPhoto(p)} aria-label={"Open reference photo "+p} aria-pressed={photo===p}><img src={"/photos/"+p+".jpg"} alt=""/></button>)}</div></DialogContent></Dialog>
    <Dialog open={info} onOpenChange={setInfo}><DialogContent className="info-dialog"><DialogHeader><span className="eyebrow">ABOUT THE MODEL</span><DialogTitle>A familiar place, in three dimensions.</DialogTitle><DialogDescription>Reconstructed from your 17 photos and your description of the room connections.</DialogDescription></DialogHeader><p>The furniture, colours, finishes and visible fixtures follow the photos: the two beige sofas, gold curtains, white coffee table, kitchenette, upholstered bed, timber wardrobe and combined bathroom.</p><p>The bedroom opens beside the hall basin. The bathroom is adjacent to the bedroom, opposite that basin. The kitchen sits next to the main entrance.</p><p className="model-note">This is an estimated 3D reconstruction, not a measured scan. Room dimensions, unseen surfaces and exact opening positions are approximate. A floor plan or measurements would allow these to be refined.</p><div className="help-grid"><div><strong>Walk</strong><span>Drag to look around. Use W A S D, arrow keys or the on-screen arrows to move.</span></div><div><strong>Look from above</strong><span>Switch to Dollhouse to rotate around the whole apartment, or Floor plan for a top view.</span></div></div></DialogContent></Dialog>
  </main>;
}
