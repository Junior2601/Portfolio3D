import { config } from '../config.js';

const SUBJECTS = { message: 'nouveau message', rdv: 'demande de rendez-vous', info: 'demande d’information' };

// Optionnel : prévient par e-mail (via Resend) à chaque message reçu, du formulaire comme du chat de l'accueil.
// Sans RESEND_API_KEY ni CONTACT_TO, les messages restent simplement enregistrés en base.
export async function notifyContact({ kind = 'message', name, email, message, details }) {
  if (!config.resendApiKey || !config.contactTo) return;
  const body = kind === 'rdv'
    ? [`Objet : ${message}`, `Disponibilités : ${details.when}`, details.mode && `Format : ${details.mode}`, details.phone && `Téléphone : ${details.phone}`]
    : [message];
  const intro = kind === 'message' ? "t'a écrit depuis le portfolio" : "a laissé une demande à l'accueil du portfolio";
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.mailFrom,
      to: [config.contactTo],
      reply_to: email,
      subject: `Portfolio : ${SUBJECTS[kind]} de ${name}`,
      text: `${name} <${email}> ${intro} :\n\n${body.filter(Boolean).join('\n')}\n\nRéponds simplement à cet e-mail pour lui écrire.`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend a répondu ${res.status}`);
}
