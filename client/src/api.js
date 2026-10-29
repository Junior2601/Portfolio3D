async function readJson(res) {
  return res.json().catch(() => ({}));
}

export async function fetchPortfolio() {
  const res = await fetch('/api/portfolio');
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || `Le serveur a répondu ${res.status}`);
  return body;
}

export async function sendContact(data) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error || 'Envoi impossible pour le moment, réessaie plus tard.');
  return body;
}
