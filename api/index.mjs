// Point d'entrée Vercel : toute l'API Express (/api/*) tourne dans une seule fonction serverless.
// Le site React compilé (client/dist) est servi directement par le CDN de Vercel, pas par Express.
import { createApp } from '../server/src/app.js';

export default createApp();
