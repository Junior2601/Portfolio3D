import { useStudio } from '../store.js';
import { focusStation, registerTag } from '../controller.js';
import { uiColor } from '../studio/utils.js';

/* Étiquettes au-dessus des agents : le moteur 3D les déplace à chaque image */
export default function Tags() {
  const stations = useStudio((s) => s.stations);
  const visited = useStudio((s) => s.visited);

  return (
    <div id="labels">
      {stations.map((st) => {
        const seen = visited.has(st.idx);
        return (
          <button
            key={st.idx}
            ref={(el) => registerTag(st.idx, el)}
            className={'tag glass' + (seen ? ' seen' : '')}
            style={{ '--c': uiColor(st.look) }}
            onClick={() => focusStation(st.idx)}
          >
            {/* Compact : numéro + projet ; le nom de l'agent apparaît au survol */}
            {st.type === 'desk'
              ? <><i>{st.num}</i><b>{st.project.short}</b><span>avec {st.look.name}</span><u>{seen ? '✓' : '💬'}</u></>
              : <><i>{st.num}</i><b>{st.project.short}</b><span>{st.look.name}</span></>}
          </button>
        );
      })}
    </div>
  );
}
