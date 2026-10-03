/* The UI shell on the stand-in engine. ?theme=forest swaps in a deep green
   signature colour to check the shell against a darker accent. */
import def from './index';
import { createFakeTour } from '../../ui/dev/fake';
import { mountTourUI } from '../../ui';

if (new URLSearchParams(location.search).get('theme') === 'forest') {
  def.theme = { accent: '#2f5d46', accentInk: '#ffffff', night: '#0f1c17', paper: '#f3f1ea', collection: 'THE JETS NEST COLLECTION' };
}
mountTourUI(document.getElementById('root')!, def, createFakeTour);
