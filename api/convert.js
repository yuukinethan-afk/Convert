const { cc, checkAccess } = require('./_cc');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  if (!checkAccess(req, res)) return;
  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) return res.status(500).json({ error: 'CLOUDCONVERT_API_KEY belum diatur di Vercel.' });

  try {
    const body = req.body || {};
    const image = body.image;
    if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Field image (base64 PNG) wajib.' });

    // Opsi tracing dari klien, dicampur ke task convert. Field inti tidak boleh ditimpa.
    const opts = body.options && typeof body.options === 'object' && !Array.isArray(body.options) ? { ...body.options } : {};
    for (const k of ['operation', 'input', 'input_format', 'output_format']) delete opts[k];

    const created = await cc('/jobs', key, {
      method: 'POST',
      body: JSON.stringify({
        tag: 'image-vectorizer',
        tasks: {
          imp: { operation: 'import/base64', file: image, filename: 'input.png' },
          conv: { ...opts, operation: 'convert', input: 'imp', input_format: 'png', output_format: 'svg' },
          exp: { operation: 'export/url', input: 'conv' },
        },
      }),
    });

    const id = created.data.id;
    const deadline = Date.now() + 55000;
    let job = created.data;
    while (job.status !== 'finished' && job.status !== 'error') {
      if (Date.now() > deadline) throw new Error('Timeout menunggu CloudConvert.');
      await new Promise((r) => setTimeout(r, 1000));
      job = (await cc('/jobs/' + id, key, { method: 'GET' })).data;
    }

    if (job.status === 'error') {
      const failed = (job.tasks || []).find((t) => t.status === 'error');
      throw new Error('Konversi gagal: ' + ((failed && failed.message) || 'tidak diketahui'));
    }

    const exp = (job.tasks || []).find((t) => t.operation === 'export/url' && t.status === 'finished');
    const url = exp && exp.result && exp.result.files && exp.result.files[0] && exp.result.files[0].url;
    if (!url) throw new Error('URL hasil tidak ditemukan.');

    const f = await fetch(url);
    if (!f.ok) throw new Error('Gagal mengunduh hasil (' + f.status + ').');
    const svg = await f.text();
    return res.status(200).json({ svg });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
