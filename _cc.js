// Helper bersama untuk api/convert.js dan api/options.js
const API = 'https://api.cloudconvert.com/v2';

async function cc(path, key, init) {
  const r = await fetch(API + path, {
    ...(init || {}),
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...((init && init.headers) || {}),
    },
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
  if (!r.ok) throw new Error('CloudConvert ' + r.status + ': ' + (json.message || text.slice(0, 200)));
  return json;
}

// Lindungi endpoint supaya kredit CloudConvert tidak dipakai orang lain.
// Kalau ACCESS_CODE diatur di Vercel, request harus mengirim header x-access-code yang sama.
function checkAccess(req, res) {
  const code = process.env.ACCESS_CODE;
  if (code && req.headers['x-access-code'] !== code) {
    res.status(401).json({ error: 'Kode akses salah atau belum diisi.' });
    return false;
  }
  return true;
}

module.exports = { cc, checkAccess };
