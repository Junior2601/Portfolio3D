import { create } from 'zustand';

// État de l'interface. Le moteur 3D le lit, les composants React l'affichent,
// et les actions de controller.js le modifient.
export const useStudio = create(() => ({
  status: 'loading', // loading | ready | error
  error: '',
  profile: null,
  stations: [], // [accueil, ...bureaux, bibliothèque, salle de formation] : { idx, type, num, project, look }
  started: false,
  view: 'fp', // 'fp' : première personne (on marche dans le studio) | 'orbit' : vue d'ensemble
  focus: -1,
  book: -1, // livre sorti de l'étagère
  course: -1, // formation mise en avant dans la salle de formation
  visited: new Set(),
  night: false,
  sound: typeof window !== 'undefined' && 'speechSynthesis' in window ? 'voice' : 'blips',
  tour: false,
  contactOpen: false,
  toast: null, // { msg, id }
  bubble: { idx: -1, text: '', typing: false, last: false },
}));
