import { useEffect, useRef } from 'react';
import { useStudio } from '../store.js';
import { advance, focusStation, goOverview, openContact, registerBubble, startTour, toast } from '../controller.js';
import { bookMeeting } from '../reception.js';
import { uiColor } from '../studio/utils.js';

/* fp : à la première personne, « quitter » une station laisse le visiteur sur place, libre de marcher */
function choicesFor(st, count, fp) {
  if (st.type === 'host') {
    return [
      ['▶ Visite guidée', startTour],
      ['📅 Prendre rendez-vous', bookMeeting],
      ['Explorer librement', () => {
        goOverview();
        toast(fp ? 'Promène-toi : clique au sol pour marcher, ou sur un agent pour découvrir son projet 👀' : 'Clique sur un agent ou un bureau pour découvrir un projet 👀');
      }],
    ];
  }
  const list = [];
  if (st.project.meeting) list.push(['📅 Prendre rendez-vous', bookMeeting]);
  if (st.project.contact) list.push(['✉️ Me contacter', openContact]);
  list.push(st.idx === count - 1 ? ["↺ Retour à l'accueil", () => focusStation(0)] : ['Bureau suivant →', () => focusStation(st.idx + 1)]);
  list.push([fp ? 'Continuer à pied' : "Vue d'ensemble", goOverview]);
  return list;
}

/* Bulle de dialogue : le texte vient du store, la position est mise à jour par le moteur 3D */
export default function Bubble() {
  const ref = useRef(null);
  const bubble = useStudio((s) => s.bubble);
  const stations = useStudio((s) => s.stations);
  const fp = useStudio((s) => s.view === 'fp');
  const st = stations[bubble.idx];

  useEffect(() => { registerBubble(ref.current); }, []);

  const cls = ['', bubble.idx >= 0 && 'show', bubble.typing && 'typing', bubble.last && 'last'].filter(Boolean).join(' ');
  return (
    <div
      id="bubble"
      ref={ref}
      className={cls}
      style={st ? { '--c': uiColor(st.look) } : undefined}
      role="status"
      aria-live="polite"
      onClick={(e) => { if (!e.target.closest('button')) advance(); }}
    >
      <div className="b-who"><i /><b>{st?.look.name}</b><small>{st?.look.role}</small></div>
      <p className="b-text">{bubble.text}</p>
      {st && bubble.last && !bubble.typing && (
        <div className="b-choices">
          {choicesFor(st, stations.length, fp).map(([label, fn]) => (
            <button key={label} onClick={(e) => { e.stopPropagation(); fn(); }}>{label}</button>
          ))}
        </div>
      )}
      <div className="b-hint">clic pour passer ▸</div>
    </div>
  );
}
