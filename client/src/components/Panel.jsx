import { useMemo, useRef, useState } from 'react';
import { useStudio } from '../store.js';
import { goOverview, openContact, snapshot, step } from '../controller.js';
import { uiColor } from '../studio/utils.js';

const safeUrl = (u = '') => (/^(https?:|mailto:)/i.test(u) ? u : '#');
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function Visuals({ visuals, cover, title }) {
  const [active, setActive] = useState(0);
  const fallback = (e) => { if (e.currentTarget.src !== cover) e.currentTarget.src = cover; };
  return (
    <>
      <figure className="p-visual"><img alt={`Visuel : ${title}`} src={visuals[active]} onError={fallback} /></figure>
      {visuals.length > 1 && (
        <div className="p-thumbs">
          {visuals.map((v, i) => (
            <button key={i} className={i === active ? 'on' : ''} onClick={() => setActive(i)} aria-label={`Visuel ${i + 1}`}>
              <img alt="" src={v} onError={fallback} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* Fiche du projet présenté (ou « À propos » à l'accueil) */
export default function Panel() {
  const focus = useStudio((s) => s.focus);
  const stations = useStudio((s) => s.stations);
  const last = useRef(-1);
  if (focus >= 0) last.current = focus; // garde le contenu pendant que le panneau se referme
  const st = stations[last.current];

  const visuals = useMemo(() => {
    if (!st) return [];
    const list = st.project.images?.length ? [...st.project.images] : [st.project.cover];
    const shot = st.type === 'desk' && snapshot(st.idx);
    if (shot) list.push(shot);
    return list;
  }, [st]);

  if (!st) return <aside id="panel" aria-label="Fiche projet" />;
  const p = st.project, host = st.type === 'host';
  const dates = [p.stars > 0 && `⭐ ${p.stars} étoile${p.stars > 1 ? 's' : ''}`, p.updated && `Mis à jour le ${fmtDate(p.updated)}`].filter(Boolean);
  const desks = stations.length - 1;

  return (
    <aside id="panel" aria-label="Fiche projet" style={{ '--c': uiColor(st.look) }}>
      <button className="p-close" aria-label="Fermer" onClick={goOverview}>✕</button>
      <div className="p-scroll" key={st.idx}>
        <Visuals visuals={visuals} cover={p.cover} title={p.title} />
        <div className="p-body">
          <div className="p-kicker">
            <span className="p-num">{st.num}</span>
            {host ? <span>À propos</span> : <span>Présenté par <b>{st.look.name}</b> · {st.look.role}</span>}
          </div>
          <h2>{p.title}</h2>
          <p className="p-tagline">{p.tagline}</p>
          {p.status && <span className="p-status"><i />{p.status}</span>}
          <p className="p-desc">{p.description}</p>
          {p.experience?.length > 0 && (
            <>
              <h3 className="p-sub">Parcours</h3>
              <ul className="p-exp">
                {p.experience.map((e) => (
                  <li key={e.org + e.role}><b>{e.role}</b> · {e.org}<small>{e.start}{e.current ? ' · en cours' : e.end ? ` – ${e.end}` : ''}</small></li>
                ))}
              </ul>
            </>
          )}
          <ul className="p-stack">{(p.stack || []).map((s) => <li key={s}>{s}</li>)}</ul>
          {dates.length > 0 && <p className="p-stats">{dates.join(' · ')}</p>}
          <div className="p-actions">
            {p.contact && <button className="btn primary" onClick={openContact}>✉️ Me contacter</button>}
            {p.repo
              ? <a className={'btn' + (p.contact ? '' : ' primary')} href={safeUrl(p.repo)} target="_blank" rel="noopener noreferrer">{host ? 'Mon GitHub' : 'Voir le code'} ↗</a>
              : !p.contact && <span className="btn" aria-disabled="true">Dépôt bientôt public</span>}
            {p.demo && <a className="btn" href={safeUrl(p.demo)} target="_blank" rel="noopener noreferrer">Démo live ↗</a>}
          </div>
        </div>
      </div>
      <footer className="p-nav">
        <button onClick={() => step(-1)}>← Précédent</button>
        <span>{host ? 'Accueil' : `${st.num} / ${String(desks).padStart(2, '0')}`}</span>
        <button onClick={() => step(1)}>Suivant →</button>
      </footer>
    </aside>
  );
}
