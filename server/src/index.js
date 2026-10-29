import { config } from './config.js';
import { createApp } from './app.js';

createApp().listen(config.port, () => {
  console.log(`✔ Studio prêt sur http://localhost:${config.port}`);
});
