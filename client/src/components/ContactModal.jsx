import { useEffect, useRef, useState } from 'react';
import { useStudio } from '../store.js';
import { closeContact } from '../controller.js';
import { sendContact } from '../api.js';

const EMPTY = { name: '', email: '', message: '', website: '' };

/* Fenêtre de contact : WhatsApp, e-mail, ou message enregistré en base via l'API */
export default function ContactModal() {
  const open = useStudio((s) => s.contactOpen);
  const profile = useStudio((s) => s.profile);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ status: 'idle', error: '' }); // idle | sending | sent | error
  const firstField = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => firstField.current?.focus(), 50);
    else if (state.status === 'sent') { setForm(EMPTY); setState({ status: 'idle', error: '' }); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;
  const { email, whatsapp, whatsappLabel } = profile.contact || {};
  const waText = encodeURIComponent(`Bonjour ${profile.owner}, je viens de visiter ton portfolio 3D et j'aimerais échanger avec toi.`);
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState({ status: 'sending', error: '' });
    try {
      await sendContact(form);
      setState({ status: 'sent', error: '' });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }

  return (
    <div id="contact" className={open ? 'open' : ''} aria-hidden={!open} onClick={(e) => { if (e.target.id === 'contact') closeContact(); }}>
      <div className="contact-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="p-close dark" aria-label="Fermer" onClick={closeContact}>✕</button>
        <div className="eyebrow">Contact</div>
        <h2 id="contact-title">Travaillons ensemble</h2>
        <p className="contact-lead">Une mission, un stage, une idée de projet ? Le plus rapide, c'est WhatsApp.</p>

        <div className="contact-links">
          {whatsapp && (
            <a className="contact-link wa" href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer">
              <span>💬</span><div><b>WhatsApp</b><small>{whatsappLabel}</small></div>
            </a>
          )}
          {email && (
            <a className="contact-link mail" href={`mailto:${email}?subject=${encodeURIComponent('Contact depuis ton portfolio')}`}>
              <span>✉️</span><div><b>E-mail</b><small>{email}</small></div>
            </a>
          )}
        </div>

        {state.status === 'sent' ? (
          <p className="contact-ok">✅ Message bien reçu, merci ! Je te réponds au plus vite.</p>
        ) : (
          <form className="contact-form" onSubmit={submit}>
            <div className="contact-or"><span>ou laisse un message ici</span></div>
            <div className="row">
              <label>Nom<input ref={firstField} required minLength={2} maxLength={120} value={form.name} onChange={update('name')} autoComplete="name" /></label>
              <label>E-mail<input required type="email" maxLength={200} value={form.email} onChange={update('email')} autoComplete="email" /></label>
            </div>
            <label>Message<textarea required minLength={10} maxLength={4000} rows={4} value={form.message} onChange={update('message')} /></label>
            {/* Champ piège invisible : les robots le remplissent, pas les humains */}
            <input className="hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} aria-hidden="true" />
            {state.status === 'error' && <p className="contact-err">{state.error}</p>}
            <button className="btn primary" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Envoi…' : 'Envoyer le message'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
