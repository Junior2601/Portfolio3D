import { useEffect, useRef } from 'react';
import { useStudio } from '../store.js';
import { focusStation } from '../controller.js';
import { uiColor } from '../studio/utils.js';

export default function Dock() {
  const stations = useStudio((s) => s.stations);
  const focus = useStudio((s) => s.focus);
  const visited = useStudio((s) => s.visited);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[focus]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [focus]);

  return (
    <div className="ui glass" id="dock" role="toolbar" aria-label="Bureaux">
      {stations.map((st) => (
        <button
          key={st.idx}
          ref={(el) => { refs.current[st.idx] = el; }}
          className={['chip', st.idx === focus && 'active', st.type === 'desk' && visited.has(st.idx) && 'seen'].filter(Boolean).join(' ')}
          style={{ '--c': uiColor(st.look) }}
          onClick={() => focusStation(st.idx)}
        >
          <i />{st.type === 'desk' && <em>{st.num}</em>}{st.project.short}
        </button>
      ))}
    </div>
  );
}
