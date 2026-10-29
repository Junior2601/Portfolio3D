import { create } from 'zustand';

// État de l'interface. Le moteur 3D le lit, les composants React l'affichent,
// et les actions de controller.js le modifient.
export const useStudio = create(() => ({
  status: 'loading', // loading | ready | error
  error: '',
  profile: null,
  stations: [], // [accueil, ...bureaux] : { idx, type, num, project, look }
  started: false,
  focus: -1,
  visited: new Set(),
  night: false,
  sound: typeof window !== 'undefined' && 'speechSynthesis' in window ? 'voice' : 'blips',
  tour: false,
  contactOpen: false,
  toast: null, // { msg, id }
  bubble: { idx: -1, text: '', typing: false, last: false },
}));
