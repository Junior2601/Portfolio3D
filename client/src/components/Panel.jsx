import { useMemo, useRef, useState } from 'react';
import { useStudio } from '../store.js';
import { goOverview, openContact, pickBook, pickCourse, snapshot, step } from '../controller.js';
import { bookMeeting } from '../reception.js';
import { hex, uiColor } from '../studio/utils.js';
import ReceptionChat from './ReceptionChat.jsx';

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

/* Recommandations de lecture : choisir un livre le sort de l'étagère */
function Books({ books }) {
  const active = useStudio((s) => s.book);
  return (
    <ul className="p-books">
      {books.map((b, i) => (
        <li key={b.title}>
          <button className={i === active ? 'on' : ''} aria-pressed={i === active} onClick={() => pickBook(i)}>
            <i style={{ '--b': hex(b.color) }} />
            <span><b>{b.title}</b><small>{b.author}</small><em>{b.why}</em></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* Formations : en choisir une la met en avant sur l'écran de la salle, et Paul la présente */
function Courses({ courses }) {
  const active = useStudio((s) => s.course);
  return (
    <ul className="p-books p-courses">
      {courses.map((c, i) => (
        <li key={c.title}>
          <button className={i === active ? 'on' : ''} aria-pressed={i === active} onClick={() => pickCourse(i)}>
            <i>{c.icon || '🎓'}</i>
            <span>
              <b>{c.title}</b>
              <small>{[c.school, c.place, c.period].filter(Boolean).join(' · ')}</small>
              {c.about && <em>{c.about}</em>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* Fiche du projet présenté : chat à l'accueil, parcours en salle de formation, livres à la bibliothèque */
export default function Panel() {
  const focus = useStudio((s) => s.focus);
  const stations = useStudio((s) => s.stations);
  const owner = useStudio((s) => s.profile?.owner);
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
  const p = st.project, about = st.type === 'training', chat = st.type === 'host';
  const dates = [p.stars > 0 && `⭐ ${p.stars} étoile${p.stars > 1 ? 's' : ''}`, p.updated && `Mis à jour le ${fmtDate(p.updated)}`].filter(Boolean);
  const desks = stations.filter((s) => s.type === 'desk').length;

  return (
    <aside id="panel" className={chat ? 'is-chat' : ''} aria-label={chat ? 'Chat de l’accueil' : 'Fiche projet'} style={{ '--c': uiColor(st.look) }}>
      <button className={'p-close' + (chat ? ' dark' : '')} aria-label="Fermer" onClick={goOverview}>✕</button>
      {chat ? <ReceptionChat look={st.look} owner={owner} /> : (
        <div className="p-scroll" key={st.idx}>
          {!p.books && <Visuals visuals={visuals} cover={p.cover} title={p.title} />}
          <div className="p-body">
            <div className="p-kicker">
              <span className="p-num">{st.num}</span>
              {about ? <span>À propos de <b>{st.look.name}</b></span> : <span>Présenté par <b>{st.look.name}</b> · {st.look.role}</span>}
            </div>
            <h2>{p.title}</h2>
            <p className="p-tagline">{p.tagline}</p>
            {p.status && <span className="p-status"><i />{p.status}</span>}
            <p className="p-desc">{p.description}</p>
            {p.courses?.length > 0 && (
              <>
                <h3 className="p-sub">Formations</h3>
                <Courses courses={p.courses} />
              </>
            )}
            {p.experience?.length > 0 && (
              <>
                <h3 className="p-sub">Expérience</h3>
                <ul className="p-exp">
                  {p.experience.map((e) => (
                    <li key={e.org + e.role}><b>{e.role}</b> · {e.org}<small>{e.start}{e.current ? ' · en cours' : e.end ? ` – ${e.end}` : ''}</small></li>
                  ))}
                </ul>
              </>
            )}
            {p.books && <Books books={p.books} />}
            {!p.books && <ul className="p-stack">{(p.stack || []).map((s) => <li key={s}>{s}</li>)}</ul>}
            {dates.length > 0 && <p className="p-stats">{dates.join(' · ')}</p>}
            {!p.books && (
              <div className="p-actions">
                {p.meeting && <button className="btn primary" onClick={bookMeeting}>📅 Prendre rendez-vous</button>}
                {p.contact && <button className="btn primary" onClick={openContact}>✉️ Me contacter</button>}
                {p.repo
                  ? <a className={'btn' + (p.contact || p.meeting ? '' : ' primary')} href={safeUrl(p.repo)} target="_blank" rel="noopener noreferrer">{about ? 'Mon GitHub' : 'Voir le code'} ↗</a>
                  : !p.contact && <span className="btn" aria-disabled="true">Dépôt bientôt public</span>}
                {p.demo && <a className="btn" href={safeUrl(p.demo)} target="_blank" rel="noopener noreferrer">Démo live ↗</a>}
              </div>
            )}
          </div>
        </div>
      )}
      <footer className="p-nav">
        <button onClick={() => step(-1)}>← Précédent</button>
        <span>{st.type === 'desk' ? `${st.num} / ${String(desks).padStart(2, '0')}` : p.short}</span>
        <button onClick={() => step(1)}>Suivant →</button>
      </footer>
    </aside>
  );
}
