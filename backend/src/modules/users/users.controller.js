const bcrypt = require('bcryptjs');
const db = require('../../config/database');

// ─── Canonical role definitions (must match frontend permissions.ts) ───────────
const CANONICAL_ROLES = [
  { name: 'admin',            description: 'Akses penuh ke semua fitur & manajemen user' },
  { name: 'regional_manager', description: 'Semua modul, tanpa delete & manajemen user' },
  { name: 'kepala_gudang',    description: 'Semua operasional gudang, tidak edit master barang' },
  { name: 'staff_gudang',     description: 'Operasional gudang saja, tidak lihat harga/nilai' },
  { name: 'viewer',           description: 'Hanya lihat laporan dan stok (read-only)' },
];

// Old → New role name migrations
const ROLE_RENAMES = {
  manager:   'regional_manager',
  staff:     'staff_gudang',
  warehouse: 'kepala_gudang',
};

/** Auto-migrate old role names to canonical names (runs once, idempotent) */
async function migrateRoleNames() {
  for (const [oldName, newName] of Object.entries(ROLE_RENAMES)) {
    const newExists = await db.query('SELECT id FROM roles WHERE name = $1', [newName]);
    if (newExists.rows.length === 0) {
      // New name doesn't exist yet — safe to rename old
      await db.query('UPDATE roles SET name = $1 WHERE name = $2', [newName, oldName]);
    } else {
      // New name exists — merge user_roles from old → new, then delete old
      const oldRole = await db.query('SELECT id FROM roles WHERE name = $1', [oldName]);
      if (oldRole.rows.length > 0) {
        const oldId = oldRole.rows[0].id;
        const newId = newExists.rows[0].id;
        // Move user assignments
        await db.query(
          `UPDATE user_roles SET role_id = $1 WHERE role_id = $2
           AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_roles.user_id AND role_id = $1)`,
          [newId, oldId]
        );
        await db.query('DELETE FROM user_roles WHERE role_id = $1', [oldId]);
        await db.query('DELETE FROM roles WHERE id = $1', [oldId]);
      }
    }
  }
}

const getUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.last_login_at,
        COALESCE(json_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ status: 'error', message: req.t('users.loadError') });
  }
};

const getRoles = async (req, res) => {
  try {
    // Step 1: Auto-migrate old role names
    await migrateRoleNames();

    // Step 2: Ensure all canonical roles exist
    for (const role of CANONICAL_ROLES) {
      await db.query(
        `INSERT INTO roles (name, permissions, description)
         VALUES ($1, '{}', $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
        [role.name, role.description]
      ).catch(async () => {
        // If description column doesn't exist, just insert without it
        await db.query(
          `INSERT INTO roles (name, permissions) VALUES ($1, '{}') ON CONFLICT (name) DO NOTHING`,
          [role.name]
        );
      });
    }

    const result = await db.query('SELECT id, name FROM roles ORDER BY name');
    return res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('getRoles error:', err);
    return res.status(500).json({ status: 'error', message: req.t('users.rolesError') });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role_ids } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: req.t('users.nameEmailPasswordRequired') });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: req.t('users.passwordMinLength') });
    }
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: 'error', message: req.t('users.emailTaken') });
    }
    const hash = await bcrypt.hash(password, 12);
    const userRes = await db.query(
      `INSERT INTO users (name, email, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    const userId = userRes.rows[0].id;
    if (Array.isArray(role_ids) && role_ids.length > 0) {
      for (const roleId of role_ids) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId]);
      }
    }
    return res.status(201).json({ status: 'success', message: req.t('users.created'), data: { id: userId } });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ status: 'error', message: req.t('users.createError') });
  }
};

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
    if (Array.isArray(role_ids)) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      for (const roleId of role_ids) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, roleId]);

      }
    }
    return res.json({ status: 'success', message: req.t('users.updated') });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ status: 'error', message: req.t('users.updateError') });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ status: 'error', message: req.t('users.passwordMinLengthReset') });
    }
    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, id]);
    return res.json({ status: 'success', message: req.t('users.passwordReset') });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('users.resetError') });
  }
};

module.exports = { getUsers, getRoles, createUser, updateUser, resetPassword };
