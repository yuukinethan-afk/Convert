const { cc, checkAccess } = require('./_cc');

// Menampilkan opsi tracing yang benar-benar tersedia untuk PNG -> SVG di akun kamu.
module.exports = async (req, res) => {
  if (!checkAccess(req, res)) return;
  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) return res.status(500).json({ error: 'CLOUDCONVERT_API_KEY belum diatur di Vercel.' });
  try {
    const q = new URLSearchParams({
      'filter[operation]': 'convert',
      'filter[input_format]': 'png',
      'filter[output_format]': 'svg',
      include: 'options',
    });
    const r = await cc('/operations?' + q.toString(), key, { method: 'GET' });
    return res.status(200).json(r);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
