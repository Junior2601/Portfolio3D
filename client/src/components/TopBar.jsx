import { useStudio } from '../store.js';
import { cycleSound, openContact, startTour, stopTour, toggleNight, toggleView } from '../controller.js';

const SOUND = { voice: ['🗣️', 'Voix'], blips: ['🎵', 'Bips'], mute: ['🔇', 'Muet'] };

export default function TopBar() {
  const profile = useStudio((s) => s.profile);
  const visited = useStudio((s) => s.visited);
  const stations = useStudio((s) => s.stations);
  const night = useStudio((s) => s.night);
  const tour = useStudio((s) => s.tour);
  const sound = useStudio((s) => s.sound);
  const view = useStudio((s) => s.view);
  const desks = stations.filter((s) => s.type === 'desk');
  const seen = desks.filter((s) => visited.has(s.idx)).length;

  return (
    <>
      <header className="ui glass brand">
        <div className="logo">{profile.owner[0].toUpperCase()}</div>
        <div><b>{profile.owner.toLowerCase()}.studio</b><small>{profile.role}</small></div>
      </header>
      <div className="ui glass" id="progress">🧭 <b>{seen}</b>/{desks.length} bureaux visités</div>
      <nav className="ui toolbar" aria-label="Contrôles">
        <button className="tbtn glass" onClick={cycleSound} title="Son des agents"><b>{SOUND[sound][0]}</b><span>{SOUND[sound][1]}</span></button>
        <button className="tbtn glass" onClick={toggleNight} title="Jour / nuit (N)">{night ? <><b>☀️</b><span>Jour</span></> : <><b>🌙</b><span>Nuit</span></>}</button>
        <button className={'tbtn glass' + (tour ? ' on' : '')} onClick={tour ? stopTour : startTour} title="Visite guidée (T)">
          {tour ? <><b>⏸</b><span>Stop visite</span></> : <><b>▶</b><span>Visite guidée</span></>}
        </button>
        <button className="tbtn glass" onClick={toggleView} title={view === 'fp' ? "Voir tout le studio d'en haut (V)" : 'Marcher dans le studio (V)'}>
          {view === 'fp' ? <><b>🗺️</b><span>Vue d'ensemble</span></> : <><b>🚶</b><span>Visite à pied</span></>}
        </button>
        <button className="tbtn glass accent" onClick={openContact} title="Me contacter"><b>✉️</b><span>Contact</span></button>
      </nav>
    </>
  );
}
