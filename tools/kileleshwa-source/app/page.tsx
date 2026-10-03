"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Box, Check, ChevronLeft, ChevronRight, Compass, Footprints, Images, Info, Map, Maximize, Moon, MousePointer2, Pause, Play, RotateCcw, Sparkles, Sun, Sunset, X } from "lucide-react";
import type { ApartmentController, ViewMode } from "../lib/apartment";
import { amenityPhotos, listing, photoUrl, planBounds, planRooms, rooms } from "../lib/data";

type Light = "day" | "golden" | "evening";
type Pose = { x: number; z: number; yaw: number; room: string };
type ModalName = "photos" | "about" | null;
const firstRoom = rooms[0];
const photoGroups = [...rooms, { id: "amenities", name: "Shared amenities", detail: "Beyond your front door.", image: 18, photos: amenityPhotos.map(item => item.id) }];
const lights = [{ id: "day", name: "Daylight", Icon: Sun }, { id: "golden", name: "Golden hour", Icon: Sunset }, { id: "evening", name: "Evening", Icon: Moon }] as const;
const views = [{ id: "walk", name: "Walk through", Icon: Footprints }, { id: "overview", name: "Dollhouse", Icon: Box }, { id: "plan", name: "Floor plan", Icon: Map }] as const;

function Modal({ open, onClose, title, description, className = "", children }: { open: boolean; onClose: () => void; title: string; description?: string; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = className === "photo-dialog" ? "photos-title" : "about-title";
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className={`modal ${className}`} aria-labelledby={titleId} aria-describedby={description ? `${titleId}-description` : undefined} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-content">
      <header className="modal-heading"><div><span className="eyebrow">CABANA RESIDENCES</span><h2 id={titleId}>{title}</h2>{description && <p id={`${titleId}-description`}>{description}</p>}</div><button className="icon-button close-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>
      {children}
    </div>
  </dialog>;
}

// The plan shares the scene's world coordinates. These proportions are estimated.
const mapLabels: Record<string, string> = { living: "LIVING", dining: "DINING", kitchen: "KITCHEN", utility: "LAUNDRY", bedroom: "BEDROOM", bathroom: "BATH", hall: "HALL" };

function MiniMap({ pose, active, onRoom, mode, onExpand }: { pose: Pose; active: string; onRoom: (id: string) => void; mode: ViewMode; onExpand: () => void }) {
  return <aside className="map-card" aria-label="Apartment navigation map">
    <div className="map-heading"><span><Compass size={14} /> THE RESIDENCE</span><button className="map-expand" onClick={onExpand} aria-label={mode === "plan" ? "Return to walking view" : "Explore the floor plan"}><ArrowUpRight size={16} /></button></div>
    <svg className="mini-plan" viewBox={`${planBounds.minX - .45} ${planBounds.minZ - .45} ${planBounds.maxX - planBounds.minX + .9} ${planBounds.maxZ - planBounds.minZ + .9}`} aria-label="Approximate apartment layout. Select a room to enter it.">
      {planRooms.map(r => <g key={r.id} role={r.id === "hall" ? undefined : "button"} tabIndex={r.id === "hall" ? undefined : 0} aria-label={r.id === "hall" ? "Hallway" : `Go to ${rooms.find(room => room.id === r.id)?.name}`} onClick={() => { if (r.id !== "hall") onRoom(r.id); }} onKeyDown={event => { if (r.id !== "hall" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRoom(r.id); } }} className={`${active === r.id ? "map-room active" : "map-room"}${r.id === "hall" ? " map-hall" : ""}`}>
        <rect x={r.x} y={r.z} width={r.w} height={r.d} rx=".05" />
        <text x={r.x + r.w / 2} y={r.z + r.d / 2 + .1} textAnchor="middle" transform={r.id === "hall" ? `rotate(-90 ${r.x + r.w / 2} ${r.z + r.d / 2 + .1})` : undefined}>{mapLabels[r.id]}</text>
      </g>)}
      <g className="map-furniture" transform="translate(8.5 0) scale(-1 1)" aria-hidden="true"><rect x="2.61" y="3.25" width=".98" height="3.04" rx=".1" /><rect x="1.79" y="5.23" width="1.72" height=".96" rx=".1" /><rect x="1.34" y="3.83" width=".72" height="1.35" rx=".08" /><rect x=".12" y="3.46" width=".45" height="2.28" /><rect x="5.92" y="1.36" width="1.96" height="2.25" rx=".1" /><rect x=".04" y="-2.55" width="2.78" height=".7" /><rect x="2.21" y="-2.22" width=".66" height="1.26" /><rect x="6.4" y="-2.45" width=".8" height="2.3" rx=".05" /><circle cx="1.84" cy="1.2" r=".5" /></g>
      <g className="map-position" transform={`translate(${pose.x} ${pose.z})`} aria-hidden="true"><path d="M0 0L-.65 -.95Q0-1.35 .65-.95Z" transform={`rotate(${180 - pose.yaw * 180 / Math.PI})`} /><circle r=".17" /></g>
    </svg>
    <div className="map-foot"><span><i /> You are here</span><small>Illustrative plan</small></div>
  </aside>;
}

export default function Home() {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<ApartmentController | null>(null);
  const poseTick = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [intro, setIntro] = useState(true);
  const [mode, setMode] = useState<ViewMode>("walk");
  const [room, setRoom] = useState(firstRoom.id);
  const [lighting, setLighting] = useState<Light>("day");
  const [modal, setModal] = useState<ModalName>(null);
  const [galleryRoom, setGalleryRoom] = useState(firstRoom.id);
  const [photo, setPhoto] = useState(firstRoom.image);
  const [tour, setTour] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [pose, setPose] = useState<Pose>({ x: 7.6, z: 2.25, yaw: -.46, room: firstRoom.id });
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const selected = rooms.find(r => r.id === room) || firstRoom;
  const gallery = photoGroups.find(r => r.id === galleryRoom) || firstRoom;
  const photoCaption = galleryRoom === "amenities" ? amenityPhotos.find(item => item.id === photo)?.name || gallery.name : gallery.name;
  const currentPhotoIndex = Math.max(0, gallery.photos.indexOf(photo));
  const activeRoomIndex = Math.max(0, rooms.findIndex(r => r.id === room));

  useEffect(() => {
    let alive = true;
    import("../lib/apartment").then(({ createApartment }) => {
      if (!alive || !mount.current) return;
      const controller = createApartment(mount.current, {
        onReady: () => { if (alive) setReady(true); },
        onPose: (next: Pose) => {
          if (!alive) return;
          const now = performance.now();
          if (now - poseTick.current > 80) { poseTick.current = now; setPose(next); setRoom(next.room); }
        },
        onError: (message: string) => { if (alive) { setError(message); setTour(false); } },
        onTourChange: (playing: boolean) => { if (alive) setTour(playing); },
        onModeChange: (next: ViewMode) => { if (alive) setMode(next); },
        onProgress: (value: number) => { if (alive) setProgress(Math.max(0, Math.min(1, value))); },
      });
      if (alive) { api.current = controller; controller.setPaused(true); }
      else controller.dispose();
    }).catch(() => { if (alive) setError("The 3D view is unavailable on this device. Explore the apartment through its original photographs."); });
    return () => { alive = false; api.current?.dispose(); api.current = null; };
  }, []);

  useEffect(() => {
    const updatePause = () => api.current?.setPaused(intro || modal !== null || document.hidden);
    updatePause();
    document.addEventListener("visibilitychange", updatePause);
    return () => document.removeEventListener("visibilitychange", updatePause);
  }, [intro, modal, ready]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReducedMotion(media.matches);
    const onFullscreen = () => setFullScreen(Boolean(document.fullscreenElement));
    media.addEventListener("change", changed);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { media.removeEventListener("change", changed); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);

  useEffect(() => {
    if (modal !== "photos") return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); event.stopImmediatePropagation(); const step = event.key === "ArrowLeft" ? -1 : 1; setPhoto(p => gallery.photos[(Math.max(0, gallery.photos.indexOf(p)) + step + gallery.photos.length) % gallery.photos.length]); }
    };
    document.addEventListener("keydown", keys, true);
    return () => document.removeEventListener("keydown", keys, true);
  }, [modal, gallery]);

  function stopTour() { setTour(false); api.current?.setTour(false); }
  function enter() { setIntro(false); requestAnimationFrame(() => mount.current?.focus({ preventScroll: true })); }
  function openPhotos(id = room) { const next = rooms.find(r => r.id === id) || firstRoom; setGalleryRoom(next.id); setPhoto(next.image); setModal("photos"); }
  function chooseRoom(id: string) {
    stopTour(); setRoom(id);
    if (error) { openPhotos(id); return; }
    setMode("walk"); api.current?.goRoom(id);
  }
  function changeMode(next: ViewMode) { stopTour(); setMode(next); api.current?.setMode(next); }
  function changeLight(next: Light) { setLighting(next); api.current?.setLighting(next); }
  function toggleTour() { const next = !tour; setMode("walk"); api.current?.setMode("walk"); setTour(next); api.current?.setTour(next); }
  function reset() { stopTour(); setMode("walk"); setRoom(firstRoom.id); api.current?.reset(); }
  function stepPhoto(step: number) { setPhoto(gallery.photos[(currentPhotoIndex + step + gallery.photos.length) % gallery.photos.length]); }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen?.(); } catch { /* The host may manage fullscreen for embedded tours. */ }
  }
  const pad = (x: number, z: number) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); stopTour(); api.current?.move(x, z); },
    onPointerUp: () => api.current?.move(0, 0),
    onPointerCancel: () => api.current?.move(0, 0),
    onLostPointerCapture: () => api.current?.move(0, 0),
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); stopTour(); api.current?.move(x, z); } },
    onKeyUp: () => api.current?.move(0, 0),
    onBlur: () => api.current?.move(0, 0),
  });

  return <main className={`apartment-app${intro ? " is-intro" : ""}${error ? " has-error" : ""}`} data-mode={mode} data-light={lighting}>
    <div ref={mount} className="scene" tabIndex={intro || modal ? -1 : 0} aria-label="Interactive 3D apartment. Drag to look around; use W A S D or the arrow keys to move." onPointerDown={stopTour} />
    {(!ready || error) && <div className="scene-placeholder"><img src={photoUrl(firstRoom.image)} alt="Original photograph of the Kileleshwa apartment living room" /><div /></div>}
    <div className="scene-vignette" aria-hidden="true" />

    <header className="topbar">
      <div className="brand"><span className="brand-symbol" aria-hidden="true"><svg viewBox="0 0 32 38"><path d="M25 10C22 3 9 3 6 11C1 24 12 36 25 28M9 24L24 9M14 21C11 13 16 8 24 9C25 16 22 21 14 21Z" /></svg></span><div><strong>CABANA<span>RESIDENCES</span></strong><small>Kileleshwa, Nairobi</small></div></div>
      <nav className="mode-tabs" aria-label="Apartment view">
        {views.map(({ id, name, Icon }) => <button key={id} disabled={!ready || Boolean(error)} onClick={() => changeMode(id)} aria-pressed={mode === id} className={mode === id ? "active" : ""}><Icon size={16} strokeWidth={1.7} /><span>{name}</span></button>)}
      </nav>
      <div className="top-actions"><button className="icon-button" title="About this residence" aria-label="About this residence and how to explore" onClick={() => setModal("about")}><Info size={19} strokeWidth={1.5} /></button><button className="icon-button fullscreen-button" aria-label={fullScreen ? "Exit full screen" : "Enter full screen"} title="Full screen" onClick={fullscreen}><Maximize size={19} strokeWidth={1.5} /></button><a className="listing-link" href={`/apartments.html?open=${encodeURIComponent(String(listing.id))}`} target="_top">View listing <ArrowUpRight size={16} /></a></div>
    </header>

    {intro ? <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-topline"><span className="eyebrow">THE KILELESHWA COLLECTION</span><span className="welcome-edition">01 / RESIDENCE</span></div>
      <span className="welcome-rule" />
      <h1 id="welcome-title">An elegant stay.<br /><em>A closer look.</em></h1>
      <p className="welcome-description">Step inside this fully furnished one-bedroom apartment in Kileleshwa. Discover every room, every texture, every considered detail.</p>
      <div className="welcome-features"><span><Box size={15} /> Immersive 3D</span><span><Sunset size={15} /> Three moods</span><span><Images size={15} /> Real photographs</span></div>
      {error ? <p className="fallback-note" role="status">{error}</p> : !ready ? <div className="loading-status" role="status"><span className="loading-orbit" /><span>Preparing your private viewing<span className="loading-dots">…</span></span></div> : <p className="ready-status"><span><Check size={12} /></span> Your residence is ready to explore</p>}
      <button className="primary-button enter-button" disabled={!ready && !error} onClick={() => { if (error) { setIntro(false); openPhotos(); } else enter(); }}><span>{error ? "Explore the photographs" : "Enter the apartment"}</span><ArrowRight size={19} /></button>
      <button className="welcome-secondary" onClick={() => openPhotos()}>Take a look at the original photographs <ArrowUpRight size={14} /></button>
      <div className="welcome-foot"><span>NAIROBI, KENYA</span><span>PHOTO-BASED RECONSTRUCTION</span></div>
    </section> : <>
      <section className="location-card" aria-live="polite"><div className="location-overline"><span className="live-dot" /><span>{error ? "THE RESIDENCE IN PHOTOGRAPHS" : tour ? "YOUR GUIDED EXPERIENCE" : mode === "walk" ? room === "hall" ? "BETWEEN THE ROOMS" : `ROOM ${String(activeRoomIndex + 1).padStart(2, "0")} OF ${String(rooms.length).padStart(2, "0")}` : "A NEW PERSPECTIVE"}</span></div><h1>{mode === "walk" ? room === "hall" ? "Hallway" : selected.name : mode === "overview" ? "The whole picture." : "Room to explore."}</h1><p>{mode === "walk" ? room === "hall" ? "A quiet connection between the rooms." : selected.detail : mode === "overview" ? "Rotate the residence. Discover how it all connects." : "A view from above. Choose a room to step inside."}</p></section>
      {!error && <MiniMap pose={pose} active={room} onRoom={chooseRoom} mode={mode} onExpand={() => changeMode(mode === "plan" ? "walk" : "plan")} />}
      <div className="scene-actions"><button className="photo-button" onClick={() => openPhotos()}><Images size={17} strokeWidth={1.6} /><span>Original photos</span><small>{selected.photos.length}</small></button>{!error && <><button className={`tour-button${tour ? " playing" : ""}`} onClick={toggleTour} aria-pressed={tour}>{tour ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}<span>{tour ? "Pause tour" : "Guided tour"}</span>{tour && <span className="tour-progress" style={{ transform: `scaleX(${progress})` }} />}</button><button className="icon-button reset-button" aria-label="Return to the opening view" title="Reset view" onClick={reset}><RotateCcw size={17} /></button></>}</div>
      {!error && <div className="lighting-panel"><span className="eyebrow">SET THE MOOD</span><div className="lighting-options" role="group" aria-label="Lighting mood">{lights.map(({ id, name, Icon }) => <button key={id} onClick={() => changeLight(id)} aria-pressed={lighting === id} className={lighting === id ? "active" : ""} title={name}><Icon size={17} strokeWidth={1.5} /><span>{name}</span></button>)}</div></div>}
      {!error && mode === "walk" && <div className="walk-pad" role="group" aria-label="Movement controls"><button {...pad(0, 1)} aria-label="Walk forward"><ArrowUp size={19} /></button><button {...pad(-1, 0)} aria-label="Move left"><ArrowLeft size={19} /></button><span aria-hidden="true"><Footprints size={15} /></span><button {...pad(1, 0)} aria-label="Move right"><ArrowRight size={19} /></button><button {...pad(0, -1)} aria-label="Walk backward"><ArrowDown size={19} /></button></div>}
      <nav className="room-dock" aria-label="Explore apartment rooms"><div className="dock-heading"><span className="eyebrow">YOUR PRIVATE VIEWING</span><strong>Find your favourite corner.</strong></div><div className="room-list">{rooms.map((r, index) => <button className={`room-button${room === r.id && mode === "walk" ? " selected" : ""}`} key={r.id} onClick={() => chooseRoom(r.id)} aria-current={room === r.id && mode === "walk" ? "location" : undefined}><span className="room-image"><img src={photoUrl(r.image)} alt="" loading="lazy" /><span className="room-number">{String(index + 1).padStart(2, "0")}</span></span><span className="room-name">{r.name}<ArrowUpRight size={13} /></span></button>)}</div></nav>
      <footer className="viewer-footer"><span><MousePointer2 size={12} /><span className="desktop-help">{mode === "walk" ? "Drag to look · WASD or arrows to move" : "Drag to rotate · Scroll to zoom"}</span><span className="touch-help">{mode === "walk" ? "Swipe to look · Use arrows to walk" : "Drag to rotate · Pinch to zoom"}</span></span><button onClick={() => setModal("about")}>Photo-based 3D · Estimated layout <Info size={12} /></button></footer>
      {tour && <div className="tour-status" role="status"><span className="live-dot" /> GUIDED TOUR <span>Drag anywhere to explore at your own pace</span></div>}
      {reducedMotion && <span className="sr-only">Reduced motion is enabled by your device preferences.</span>}
    </>}

    <Modal open={modal === "photos"} onClose={() => setModal(null)} className="photo-dialog" title="The real residence." description="Original listing photographs. Every detail, as photographed.">
      <div className="gallery-room-tabs" role="group" aria-label="Photograph room">{photoGroups.map(r => <button key={r.id} aria-pressed={galleryRoom === r.id} onClick={() => { setGalleryRoom(r.id); setPhoto(r.image); }}>{r.name}</button>)}</div>
      <div className="photo-stage"><img src={photoUrl(photo)} alt={`${photoCaption}, original apartment photograph ${currentPhotoIndex + 1} of ${gallery.photos.length}`} /><button className="photo-arrow previous" onClick={() => stepPhoto(-1)} aria-label="Previous photograph"><ChevronLeft size={24} /></button><button className="photo-arrow next" onClick={() => stepPhoto(1)} aria-label="Next photograph"><ChevronRight size={24} /></button><span className="photo-count">{String(currentPhotoIndex + 1).padStart(2, "0")} <i /> {String(gallery.photos.length).padStart(2, "0")}</span></div>
      <div className="gallery-bottom"><div className="photo-caption"><strong>{photoCaption}</strong><span>{gallery.detail}</span></div><div className="photo-thumbs" aria-label="Choose a photograph">{gallery.photos.map((p, index) => <button key={p} aria-label={`Photograph ${index + 1}`} aria-pressed={photo === p} onClick={() => setPhoto(p)}><img src={photoUrl(p)} alt="" loading="lazy" /></button>)}</div></div>
    </Modal>
    <Modal open={modal === "about"} onClose={() => setModal(null)} className="about-dialog" title="A home. A new perspective." description="Fully furnished elegant 1 Bedroom in Kileleshwa.">
      <div className="about-image"><img src={photoUrl(firstRoom.image)} alt="The living area in the original apartment listing" /><span><Sparkles size={14} /> THE KILELESHWA COLLECTION</span></div>
      <p className="about-intro">An interactive interpretation of this residence, brought to life from the original listing photographs. Explore its rooms freely, step back into a dollhouse view, or let the guided tour show you around.</p>
      <div className="help-grid"><div><Footprints size={20} /><strong>Make yourself at home</strong><p>Drag to look around. Walk using WASD, arrow keys, or the on-screen controls. Select any room to move there.</p></div><div><Sunset size={20} /><strong>See it in a different light</strong><p>Choose daylight, golden hour or evening. Switch to Dollhouse and Floor plan to understand the space.</p></div></div>
      <p className="model-note"><Info size={17} /><span>This is a photo-based 3D reconstruction, not a measured scan. Dimensions, room connections and unseen details are estimates. The original photographs show the actual property.</span></p>
      <a className="primary-button about-link" href={`/apartments.html?open=${encodeURIComponent(String(listing.id))}`} target="_top">See the complete apartment listing <ArrowUpRight size={17} /></a>
    </Modal>
  </main>;
}
