import { useEffect, useRef } from 'react';
import { useStudio } from '../store.js';
import { advance, focusStation, goOverview, openContact, registerBubble, startTour, toast } from '../controller.js';
import { uiColor } from '../studio/utils.js';

function choicesFor(st, count) {
  if (st.type === 'host') {
    return [
      ['▶ Visite guidée', startTour],
      ['Explorer librement', () => { goOverview(); toast('Clique sur un agent ou un bureau pour découvrir un projet 👀'); }],
    ];
  }
  const list = [];
  if (st.project.contact) list.push(['✉️ Me contacter', openContact]);
  list.push(st.idx === count - 1 ? ["↺ Retour à l'accueil", () => focusStation(0)] : ['Bureau suivant →', () => focusStation(st.idx + 1)]);
  list.push(["Vue d'ensemble", goOverview]);
  return list;
}

/* Bulle de dialogue : le texte vient du store, la position est mise à jour par le moteur 3D */
export default function Bubble() {
  const ref = useRef(null);
  const bubble = useStudio((s) => s.bubble);
  const stations = useStudio((s) => s.stations);
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
          {choicesFor(st, stations.length).map(([label, fn]) => (
            <button key={label} onClick={(e) => { e.stopPropagation(); fn(); }}>{label}</button>
          ))}
        </div>
      )}
      <div className="b-hint">clic pour passer ▸</div>
    </div>
  );
}
