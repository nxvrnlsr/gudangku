const bcrypt = require('bcryptjs');
const db = require('../../config/database');

/**
 * GET /api/users — list semua user (admin only)
 */
const getUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id, u.name, u.email, u.is_active,
        u.created_at, u.last_login_at,
        COALESCE(
          json_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
          '[]'
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat data pengguna.' });
  }
};

/**
 * GET /api/users/roles — list semua role yang tersedia (auto-seed jika kosong)
 */
const getRoles = async (req, res) => {
  try {
    let result = await db.query('SELECT id, name FROM roles ORDER BY name');

    // Auto-seed default roles jika tabel kosong
    if (result.rows.length === 0) {
      const defaults = ['admin', 'manager', 'staff', 'warehouse', 'viewer'];
      for (const name of defaults) {
        await db.query(
          `INSERT INTO roles (name, permissions) VALUES ($1, '{}') ON CONFLICT (name) DO NOTHING`,
          [name]
        );
      }
      result = await db.query('SELECT id, name FROM roles ORDER BY name');
    }

    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('getRoles error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat roles.' });
  }
};

/**
 * POST /api/users — buat user baru (admin only)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role_ids } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Nama, email, dan password wajib diisi.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Password minimal 8 karakter.' });
    }

    // Cek email duplikat
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Email sudah digunakan.' });
    }

    const hash = await bcrypt.hash(password, 12);

    // Insert user
    const userRes = await db.query(
      `INSERT INTO users (name, email, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    const userId = userRes.rows[0].id;

    // Assign roles
    if (Array.isArray(role_ids) && role_ids.length > 0) {
      for (const roleId of role_ids) {
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, roleId]
        );
      }
    }

    return res.status(201).json({ status: 'success', message: 'Pengguna berhasil dibuat.', data: { id: userId } });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal membuat pengguna.' });
  }
};

/**
 * PUT /api/users/:id — update user (nama, status, role)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active, role_ids } = req.body;

    if (name !== undefined) {
      await db.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name, id]);
    }
    if (is_active !== undefined) {
      await db.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [is_active, id]);
    }

    // Update roles: hapus lama, insert baru
    if (Array.isArray(role_ids)) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      for (const roleId of role_ids) {
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, roleId]
        );
      }
    }

    return res.json({ status: 'success', message: 'Pengguna berhasil diperbarui.' });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui pengguna.' });
  }
};

/**
 * PUT /api/users/:id/reset-password — reset password user (admin only)
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Password minimal 8 karakter.' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, id]);

    return res.json({ status: 'success', message: 'Password berhasil direset.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Gagal reset password.' });
  }
};

module.exports = { getUsers, getRoles, createUser, updateUser, resetPassword };
