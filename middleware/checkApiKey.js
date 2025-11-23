const ApiKey = require('../db/ApiKey');

module.exports = async function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: "API Key tidak ada." });
  }

  // cari API key
  const keyData = await ApiKey.findOne({ where: { key: apiKey } });

  if (!keyData) {
    return res.status(403).json({ error: "API Key tidak valid." });
  }

  // Cek apakah API key sudah lebih dari 30 hari
  const created = new Date(keyData.createdAt);
  const now = new Date();

  const diffMs = now - created;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const isExpired = diffDays >= 30;

  // Jika expired → update kolom outOfDate
  if (isExpired && !keyData.outOfDate) {
    keyData.outOfDate = true;
    await keyData.save();
  }

  // Jika expired → tolak akses
  if (isExpired) {
    return res.status(403).json({
      error: "API Key kadaluarsa.",
      expired: true,
      createdAt: keyData.createdAt,
      daysSinceCreated: Math.floor(diffDays)
    });
  }

  // Jika belum expired → lanjut
  next();
};
