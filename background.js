importScripts('lib/core.js');
const pending = new Map();
async function loadProfessor(name, refresh) {
  const key = `prof:${AisisCore.nameKey(name)}`;
  if (!refresh) {
    const stored = (await chrome.storage.session.get(key))[key];
    if (stored && Date.now() - stored.time < 15 * 60 * 1000) return stored.data;
  }
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    let lastError;
    for (const slug of AisisCore.professorSlugs(name)) {
      try {
        const response = await fetch(`https://profstopick.com/professor/${encodeURIComponent(slug)}`, {
          credentials: 'omit', signal: AbortSignal.timeout(20000), headers: { Accept: 'text/html' }
        });
        if (!response.ok) throw new Error(`Profs to Pick returned HTTP ${response.status}. Try again later.`);
        const data = AisisCore.parseProfessor(await response.text(), name);
        data.fetchedAt = Date.now();
        await chrome.storage.session.set({ [key]: { time: Date.now(), data } });
        return data;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('No named instructor is available for this section.');
  })();
  pending.set(key, job);
  try { return await job; } finally { pending.delete(key); }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://aisis.ateneo.edu/')) return;
  if (message?.type !== 'professor' || typeof message.name !== 'string' || message.name.length > 160) return;
  loadProfessor(message.name, message.refresh === true).then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.name === 'TimeoutError' ? 'Profs to Pick timed out. Please retry.' : error.message }));
  return true;
});
