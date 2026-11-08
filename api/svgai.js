const { checkAccess } = require('./_cc');

// Vectorize lewat SVG AI. Key dibaca dari environment variable SVGAI_API_KEY (jangan ditulis di kode).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  if (!checkAccess(req, res)) return;
  const key = process.env.SVGAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'SVGAI_API_KEY belum diatur di Vercel.' });
  try {
    const body = req.body || {};
    if (!body.image || typeof body.image !== 'string') return res.status(400).json({ error: 'Field image (base64 PNG) wajib.' });
    const r = await fetch('https://www.svgai.org/api/v1/vectorize', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: body.image, remove_background: !!body.remove_background }),
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch (e) { j = { raw: text }; }
    if (!r.ok) {
      const m = (j.error && j.error.message) || j.message || text.slice(0, 200);
      return res.status(r.status === 401 || r.status === 402 || r.status === 429 ? r.status : 502).json({ error: 'SVG AI ' + r.status + ': ' + m });
    }
    if (!j.svg) return res.status(502).json({ error: 'SVG AI tidak mengembalikan svg.' });
    res.status(200).json({ svg: j.svg, credits_remaining: j.credits_remaining });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
