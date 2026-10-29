import { config } from '../config.js';

// Optionnel : prévient par e-mail (via Resend) à chaque message reçu.
// Sans RESEND_API_KEY ni CONTACT_TO, les messages restent simplement enregistrés en base.
export async function notifyContact({ name, email, message }) {
  if (!config.resendApiKey || !config.contactTo) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.mailFrom,
      to: [config.contactTo],
      reply_to: email,
      subject: `Portfolio : nouveau message de ${name}`,
      text: `${name} <${email}> t'a écrit depuis le portfolio :\n\n${message}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend a répondu ${res.status}`);
}
