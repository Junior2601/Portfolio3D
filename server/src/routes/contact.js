import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { notifyContact } from '../services/notify.js';

export const contact = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de messages envoyés. Réessaie dans quelques minutes.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

contact.post('/contact', limiter, async (req, res, next) => {
  const { name = '', email = '', message = '', website = '' } = req.body || {};
  // Champ invisible pour les humains : s'il est rempli, c'est un robot (on fait semblant d'accepter)
  if (website) return res.status(201).json({ ok: true });

  const data = {
    name: String(name).trim().slice(0, 120),
    email: String(email).trim().slice(0, 200),
    message: String(message).trim().slice(0, 4000),
  };
  if (data.name.length < 2 || !EMAIL_RE.test(data.email) || data.message.length < 10) {
    return res.status(400).json({ error: 'Indique ton nom, un e-mail valide et un message d’au moins 10 caractères.' });
  }
  try {
    await query(
      'INSERT INTO contact_messages (name, email, message, ip, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [data.name, data.email, data.message, req.ip, String(req.get('user-agent') || '').slice(0, 300)],
    );
    notifyContact(data).catch((err) => console.warn('Notification e-mail :', err.message));
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
