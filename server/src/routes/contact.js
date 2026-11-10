import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { waitUntil } from '@vercel/functions';
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
const KINDS = new Set(['message', 'rdv', 'info']); // formulaire de contact, ou chat de l'accueil
const clip = (v, max) => String(v ?? '').trim().slice(0, max);

contact.post('/contact', limiter, async (req, res, next) => {
  const body = req.body || {};
  // Champ invisible pour les humains : s'il est rempli, c'est un robot (on fait semblant d'accepter)
  if (body.website) return res.status(201).json({ ok: true });

  const kind = KINDS.has(body.kind) ? body.kind : 'message';
  const data = {
    kind,
    name: clip(body.name, 120),
    email: clip(body.email, 200),
    message: clip(body.message, 4000), // pour un rendez-vous : son objet
    details: kind === 'rdv' ? { when: clip(body.when, 300), mode: clip(body.mode, 60), phone: clip(body.phone, 40) } : null,
  };
  if (data.name.length < 2 || !EMAIL_RE.test(data.email)) {
    return res.status(400).json({ error: 'Indique ton nom et une adresse e-mail valide.' });
  }
  if (kind === 'rdv' ? data.message.length < 2 || data.details.when.length < 2 : data.message.length < 10) {
    return res.status(400).json({
      error: kind === 'rdv' ? 'Précise l’objet du rendez-vous et tes disponibilités.' : 'Ton message doit faire au moins 10 caractères.',
    });
  }
  try {
    await query(
      'INSERT INTO contact_messages (kind, name, email, message, details, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [kind, data.name, data.email, data.message, data.details, req.ip, String(req.get('user-agent') || '').slice(0, 300)],
    );
    waitUntil(notifyContact(data).catch((err) => console.warn('Notification e-mail :', err.message)));
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
