import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const mapUser = (row) => ({
  _id: row.id,
  username: row.username,
  role: row.role,
  employeeId: row.employeeId,
  actif: row.actif
});

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await pool
      .request()
      .input('username', username)
      .query('SELECT TOP 1 * FROM Users WHERE username=@username AND actif=1');
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: 'Identifiants invalides' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Identifiants invalides' });
    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '12h' }
    );
    res.json({ token, ...mapUser(user) });
  } catch (e) {
    next(e);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, password, role = 'user', employeeId = null } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'username et password sont requis' });
    }

    const existing = await pool.request().input('username', username).query('SELECT 1 FROM Users WHERE username=@username');
    if (existing.recordset.length) {
      return res.status(409).json({ message: 'Ce username est déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, 10);
    const insert = await pool
      .request()
      .input('username', username)
      .input('password', hash)
      .input('role', role)
      .input('employeeId', employeeId)
      .query('INSERT INTO Users (username, password, role, employeeId, actif) OUTPUT INSERTED.* VALUES (@username,@password,@role,@employeeId,1)');

    const user = insert.recordset[0];
    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '12h' }
    );

    res.status(201).json({ token, ...mapUser(user) });
  } catch (e) {
    next(e);
  }
};

export const me = async (req, res) => {
  res.json(req.user);
};
