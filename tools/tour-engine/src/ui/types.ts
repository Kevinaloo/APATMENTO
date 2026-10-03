import type { LightState, Mode, Pose, QualityState, TourController, TourDefinition } from '../contract';
import type { Store } from './store';

export type Panel = 'light' | 'share' | 'settings' | 'more' | 'map';
export type Dialog = 'photos' | 'about';
export type Phase = 'welcome' | 'tour' | 'fallback';

export type UIState = {
  phase: Phase;
  ready: boolean;
  load: { progress: number; label: string };
  /** Set once the 3D view cannot run; the shell is photo-first from then on. */
  error: string | null;
  mode: Mode;
  room: string;
  pose: Pose | null;
  /** progress is the whole tour, 0..1 (as the previous viewers reported it). */
  tour: { playing: boolean; index: number; progress: number };
  light: LightState | null;
  quality: QualityState | null;
  ambience: boolean;
  gyro: boolean;
  pointerLock: boolean;
  fullscreen: boolean;
  eye: number;
  fov: number;
  /** The last pointer the guest used. Touch shows the joystick, mouse the key hints. */
  input: 'touch' | 'mouse';
  /** Phones: the room strip is open (true) or folded into a pill. */
  dockOpen: boolean;
  panel: Panel | null;
  dialog: Dialog | null;
};

export type PanelSpec = { el: HTMLElement; onOpen?(): void; onClose?(): void; keepOnScene?: boolean; cssOnly?: boolean };

/** Everything a widget may use. Widgets talk to the engine only through `api`. */
export type Ctx = {
  def: TourDefinition;
  el: HTMLElement;
  scene: HTMLElement;
  store: Store<UIState>;
  api(): TourController | null;
  listingUrl: string;
  roomName(id: string): string;
  toast(text: string, tone?: 'ok' | 'warn'): void;
  announce(text: string): void;
  registerPanel(name: Panel, spec: PanelSpec): void;
  togglePanel(name: Panel, trigger?: HTMLElement | null): void;
  closePanel(): void;
  openDialog(name: Dialog): void;
  closeDialog(): void;
  openPhotos(room?: string): void;
  chooseRoom(id: string): void;
  setMode(mode: Mode): void;
  toggleTour(): void;
  toggleAmbience(): void;
  toggleFullscreen(): void;
  toggleMouseLook(): void;
  requestClose(): void;
};
