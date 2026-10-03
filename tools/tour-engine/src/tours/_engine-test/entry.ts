/* Engine test page: no UI shell, just the engine and a status line, with
   the controller and every callback exposed on window for scripted checks. */
import def from './index';
import { createTour } from '../../engine';

type Logged = [string, ...unknown[]];
const root = document.getElementById('root')!;
root.innerHTML = '';
const host = document.createElement('div');
host.style.cssText = 'position:absolute;inset:0';
root.appendChild(host);
const status = document.createElement('div');
status.style.cssText = 'position:absolute;left:12px;bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.55);color:#fff;font:12px/1.4 system-ui;pointer-events:none';
root.appendChild(status);

const log: Logged[] = [];
const w = window as unknown as Record<string, unknown>;
w.__log = log;
w.__host = host;
const tour = createTour(host, def, {
  onLoad: (p, label) => { log.push(['load', p, label]); status.textContent = `${Math.round(p * 100)}% · ${label}`; },
  onReady: () => { log.push(['ready']); w.__ready = true; },
  onPose: pose => { log.push(['pose', pose]); w.__pose = pose; },
  onRoom: room => { log.push(['room', room]); status.textContent = `Room: ${room}`; },
  onMode: mode => log.push(['mode', mode]),
  onTour: state => { log.push(['tour', state]); w.__tourState = state; },
  onLight: state => { log.push(['light', state]); w.__light = state; },
  onQuality: state => { log.push(['quality', state]); w.__quality = state; },
  onHint: text => log.push(['hint', text]),
  onError: message => { log.push(['error', message]); status.textContent = message; w.__error = message; },
});
w.__tour = tour;
