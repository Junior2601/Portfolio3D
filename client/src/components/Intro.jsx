import { useStudio } from '../store.js';
import { enter } from '../controller.js';

export default function Intro() {
  const status = useStudio((s) => s.status);
  const error = useStudio((s) => s.error);
  const started = useStudio((s) => s.started);
  const owner = useStudio((s) => s.profile?.owner);
  const host = useStudio((s) => s.profile?.reception?.agent?.name) ?? 'l’agent d’accueil';
  const name = owner ? `${owner.toLowerCase()}.studio` : 'studio';

  return (
    <section id="intro" className={started ? 'hide' : ''} aria-hidden={started}>
      <div className="intro-card">
        <div className="eyebrow">Portfolio · open-space 3D</div>
        <h1>Bienvenue au <span>{name}</span></h1>
        <p>Un open-space où chaque bureau est un projet. Les agents qui y travaillent t'attendent pour te le présenter.</p>
        <ul className="steps">
          <li><span>🖱️</span>Clique sur un agent ou sur son bureau</li>
          <li><span>🗣️</span>Il te présente son projet, à voix haute</li>
          <li><span>🧭</span>Ou laisse-toi guider bureau par bureau</li>
          <li><span>📅</span>À l'accueil, {host} prend tes rendez-vous et tes questions</li>
        </ul>
        {status === 'error' ? (
          <>
            <p className="intro-error">Le studio n'a pas pu se charger : {error}</p>
            <button id="enter" onClick={() => location.reload()}>Réessayer</button>
          </>
        ) : (
          <button id="enter" disabled={status !== 'ready'} onClick={enter}>
            {status === 'ready' ? 'Entrer dans le studio →' : 'Préparation du studio…'}
          </button>
        )}
        <div className="intro-foot">
          Son recommandé · <kbd>←</kbd> <kbd>→</kbd> changer de bureau · <kbd>Espace</kbd> phrase suivante · <kbd>Échap</kbd> vue d'ensemble
        </div>
      </div>
    </section>
  );
}
