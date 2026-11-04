// OpenAI devotional-chat proxy (streaming). Keeps OPENAI_API_KEY server-side.
// Env vars: OPENAI_API_KEY, ACCESS_CODE.
// Body: { accessCode, model, system, messages: [{ role, text }] }
// Response: text/plain stream of the assistant's reply.
// Mounted in index.js (Vercel) and server.js (local) as app.all('/api/tutor', handler).
const ALLOWED_MODELS = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'];

module.exports = async function tutorHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { accessCode, model, system, messages } = req.body || {};

  const validAccessCode = process.env.ACCESS_CODE;
  if (!accessCode) return res.status(400).json({ error: 'Access code required' });
  if (!validAccessCode || accessCode !== validAccessCode) return res.status(401).json({ error: 'Invalid access code' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });

  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Missing messages' });

  const chat = [];
  if (system) chat.push({ role: 'system', content: String(system).slice(0, 12000) });
  for (const m of messages.slice(-20)) {
    chat.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 6000) });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: ALLOWED_MODELS.includes(model) ? model : ALLOWED_MODELS[0],
        stream: true,
        max_completion_tokens: 1200,
        messages: chat,
      }),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: (errData.error && errData.error.message) || 'OpenAI request failed' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
          if (delta) res.write(delta);
        } catch (e) { /* partial JSON line, ignore */ }
      }
    }
    return res.end();
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ error: 'Tutor request failed: ' + err.message });
    return res.end();
  }
};
