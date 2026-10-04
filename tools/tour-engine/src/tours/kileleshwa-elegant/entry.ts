import def from './index';
import { createTour } from '../../engine';
import { mountTourUI } from '../../ui';
mountTourUI(document.getElementById('root')!, def, createTour);
