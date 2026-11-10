import { useEffect, useRef, useState } from 'react';
import { askFor, choose, openChat, reply, useChat } from '../reception.js';

/* Boîte de chat de l'accueil, affichée dans le panneau quand on clique sur l'agent Bienvenue */
export default function ReceptionChat({ look, owner }) {
  const { messages, quick, step, typing } = useChat();
  const [text, setText] = useState('');
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const ask = askFor(step);

  useEffect(() => { openChat(); }, []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing, quick]);
  // Une fois la conversation lancée, le curseur revient dans le champ (pas sur mobile : le clavier cacherait la scène)
  useEffect(() => {
    if (ask && step !== 'menu' && !typing && matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, [step, typing]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(e) {
    e.preventDefault();
    if (!text.trim() || typing || !ask) return;
    reply(text);
    setText('');
  }

  return (
    <div className="chat">
      <header className="chat-head">
        <span className="chat-av" aria-hidden="true">{look.name[0]}</span>
        <div><b>{look.name}</b><small>{look.role} · en ligne</small></div>
      </header>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label={`Conversation avec ${look.name}`}>
        {messages.map((m) => (
          <div key={m.id} className={'msg ' + m.from}>
            {m.text}
            {m.recap && (
              <dl>{m.recap.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            )}
          </div>
        ))}
        {typing && <div className="msg bot dots" aria-label={`${look.name} écrit…`}><span /><span /><span /></div>}
      </div>
      {quick.length > 0 && (
        <div className="chat-quick">
          {quick.map((q) => <button key={q.label} onClick={() => choose(q)}>{q.label}</button>)}
        </div>
      )}
      <form className="chat-input" onSubmit={submit}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur(); }}
          type={ask?.type ?? 'text'}
          autoComplete={ask?.autoComplete ?? 'off'}
          placeholder={ask ? ask.placeholder : `${look.name} écrit…`}
          disabled={!ask || typing}
          maxLength={1000}
          aria-label="Ton message"
        />
        <button disabled={!ask || typing || !text.trim()} aria-label="Envoyer">➤</button>
      </form>
      <p className="chat-note">Ta demande est transmise à {owner} par e-mail.</p>
    </div>
  );
}
