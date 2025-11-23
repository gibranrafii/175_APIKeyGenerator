const express = require('express');
const path = require('path');
const crypto = require('crypto');
const sequelize = require('./db/connection');
const ApiKey = require('./db/ApiKey');
const User = require('./db/user'); // <-- tambahan
const Admin = require('./db/Admin'); // <-- Tambahkan ini
const bcrypt = require('bcrypt'); // <-- Tambahkan ini


const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Sync database
sequelize.sync().then(() => {
  console.log("Database ready");
});

// ==================== MIDDLEWARE CEK API KEY ====================
const checkApiKey = require('./middleware/checkApiKey');

// ==================== ENDPOINT UTAMA ====================

app.get('/test', (req, res) => {
  res.send('Hello World!');
});

app.get('/secret', checkApiKey, (req, res) => {
  res.send('Akses diterima. API Key valid dan masih aktif.');
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== CRUD API KEY ====================

// ==========================================
// CRUD API KEY (UPDATE: Include User)
// ==========================================
app.get('/api/keys', async (req, res) => {
  try {
    // Ambil data Key BESERTA data User pemiliknya
    const keys = await ApiKey.findAll({ 
      include: User, // <--- PENTING: Join ke tabel User
      order: [['id', 'DESC']] 
    });

    // Cek status expired (logika lama tetap dipakai)
    for (let key of keys) {
      if (key.isExpired && !key.outOfDate) {
        key.outOfDate = true;
        await key.save();
      }
    }

    res.json(keys);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Gagal mengambil data keys" });
  }
});

// Get API Key by ID
app.get('/api/keys/:id', async (req, res) => {
  const key = await ApiKey.findByPk(req.params.id);
  if (!key) return res.status(404).json({ error: "API Key tidak ditemukan." });
  res.json(key);
});

// Create New API Key
app.post('/api/keys', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nama harus diisi." });

  const newKey = `API-${crypto.randomBytes(32).toString('hex')}`;

  const created = await ApiKey.create({
    name,
    key: newKey
  });

  res.json(created);
});

// Reset API Key
app.put('/api/keys/:id', async (req, res) => {
  const key = await ApiKey.findByPk(req.params.id);
  if (!key) return res.status(404).json({ error: "API Key tidak ditemukan." });

  const newKey = `API-${crypto.randomBytes(32).toString('hex')}`;
  key.key = newKey;
  await key.save();

  res.json({ message: "API Key berhasil diperbarui.", key });
});

// Delete API Key
app.delete('/api/keys/:id', async (req, res) => {
  const deleted = await ApiKey.destroy({ where: { id: req.params.id } });
  if (!deleted) return res.status(404).json({ error: "API Key tidak ditemukan." });

  res.json({ message: "API Key berhasil dihapus." });
});

// ==================== CEK VALIDITAS API KEY ====================
app.post('/api/check', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ valid: false, reason: "apiKey harus dikirim di body JSON." });
  }

  const keyExist = await ApiKey.findOne({ where: { key: apiKey } });

  if (!keyExist) {
    return res.status(403).json({ valid: false, reason: "API Key tidak valid." });
  }

  res.json({ valid: true, message: "API Key valid.", data: keyExist });
});

// ==================== CRUD USER (+ FK API KEY) ====================

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.findAll({ include: ApiKey });
  res.json(users);
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  const u = await User.findByPk(req.params.id, { include: ApiKey });
  if (!u) return res.status(404).json({ error: "User tidak ditemukan." });
  res.json(u);
});

// Create user (with FK ApiKey)
app.post('/api/users', async (req, res) => {
  const { firstname, lastname, email, apiKeyId } = req.body;

  if (!firstname || !lastname || !email || !apiKeyId) {
    return res.status(400).json({ error: "Semua field harus diisi." });
  }

  const apiKey = await ApiKey.findByPk(apiKeyId);
  if (!apiKey) {
    return res.status(404).json({ error: "API Key tidak ditemukan untuk FK." });
  }

  const created = await User.create({
    firstname,
    lastname,
    email,
    apiKeyId
  });

  res.json({
    message: "User berhasil disimpan.",
    data: created
  });
});

// ==========================================
// ROUTE HALAMAN LOGIN ADMIN
// ==========================================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==========================================
// API: REGISTER ADMIN BARU
// ==========================================
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan Password wajib diisi." });
  }

  try {
    // Cek email duplikat
    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email sudah terdaftar!" });
    }

    // ==========================================
    // 1. PROSES HASHING PASSWORD
    // ==========================================
    const saltRounds = 10; // Standar keamanan
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 2. SIMPAN KE DB (Yang disimpan hasil hash-nya)
    await Admin.create({ 
        email, 
        password: hashedPassword 
    });

    res.json({ message: "Registrasi berhasil! Silahkan login." });

  } catch (err) {
    res.status(500).json({ error: "Gagal register: " + err.message });
  }
});

// ==========================================
// API: LOGIN ADMIN
// ==========================================
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Cari admin berdasarkan email
    const admin = await Admin.findOne({ where: { email } });

    // Jika user tidak ditemukan
    if (!admin) {
      return res.status(401).json({ error: "Email atau Password salah!" });
    }

    // ==========================================
    // 2. CEK PASSWORD (BANDINGKAN HASH)
    // ==========================================
    // Kita bandingkan password inputan user vs password hash di DB
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Email atau Password salah!" });
    }

    // 3. JIKA COCOK, LOGIN SUKSES
    res.json({ 
      message: "Login Berhasil!", 
      adminId: admin.id,
      email: admin.email
    });

  } catch (err) {
    console.error(err); // Print error biar gampang debug
    res.status(500).json({ error: "Server Error." });
  }
});

// ==================== RUN SERVER ====================
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
