import { pool } from '../config/db.js';

const toIsoDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return typeof d === 'string' ? d : null;
};

const mapEmp = (row) => {
  const active = row.active === undefined ? true : !!row.active;
  return {
    _id: row.id,
    matricule: row.matricule,
    nom: row.nom,
    prenom: row.prenom,
    photo: row.photo,
    chaine: row.chaine,
    dateEmbauche: toIsoDate(row.dateEmbauche),
    active,
    status: active ? 'active' : 'resigned'
  };
};

const resolveActiveFlag = (body, fallback = true) => {
  if (body.status) return body.status === 'active';
  if (body.active === 0 || body.active === false) return false;
  if (body.active === 1 || body.active === true) return true;
  return fallback;
};

export const list = async (req, res, next) => {
  try {
    const status = (req.query.status || 'active').toLowerCase();
    let where = 'WHERE active=1';
    if (status === 'all') where = '';
    else if (status === 'inactive' || status === 'resigned') where = 'WHERE active=0';

    const result = await pool.request().query(`SELECT * FROM Employees ${where}`);
    res.json(result.recordset.map(mapEmp));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const result = await pool.request().input('id', req.params.id).query('SELECT * FROM Employees WHERE id=@id');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Employée non trouvée' });
    res.json(mapEmp(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const { matricule, nom, prenom, photo, chaine } = req.body;
    const dateEmbauche = req.body.dateEmbauche || null;
    const active = resolveActiveFlag(req.body) ? 1 : 0;
    const result = await pool
      .request()
      .input('matricule', matricule)
      .input('nom', nom)
      .input('prenom', prenom)
      .input('photo', photo || null)
      .input('chaine', chaine || null)
      .input('dateEmbauche', dateEmbauche || null)
      .input('active', active)
      .query(
        'INSERT INTO Employees (matricule, nom, prenom, photo, chaine, dateEmbauche, active) OUTPUT INSERTED.* VALUES (@matricule,@nom,@prenom,@photo,@chaine,@dateEmbauche,@active)'
      );
    res.status(201).json(mapEmp(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const current = await pool.request().input('id', req.params.id).query('SELECT * FROM Employees WHERE id=@id');
    const existing = current.recordset[0];
    if (!existing) return res.status(404).json({ message: 'Employée non trouvée' });

    const {
      matricule = existing.matricule,
      nom = existing.nom,
      prenom = existing.prenom,
      photo = existing.photo,
      chaine = existing.chaine
    } = req.body;
    const dateEmbauche = req.body.dateEmbauche !== undefined ? req.body.dateEmbauche : existing.dateEmbauche;
    const active = resolveActiveFlag(req.body, existing.active) ? 1 : 0;
    const result = await pool
      .request()
      .input('id', req.params.id)
      .input('matricule', matricule)
      .input('nom', nom)
      .input('prenom', prenom)
      .input('photo', photo || null)
      .input('chaine', chaine || null)
      .input('dateEmbauche', dateEmbauche || null)
      .input('active', active)
      .query(
        'UPDATE Employees SET matricule=@matricule, nom=@nom, prenom=@prenom, photo=@photo, chaine=@chaine, dateEmbauche=@dateEmbauche, active=@active WHERE id=@id; SELECT * FROM Employees WHERE id=@id'
      );
    res.json(mapEmp(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await pool
      .request()
      .input('id', req.params.id)
      .query('UPDATE Employees SET active=0 WHERE id=@id; SELECT * FROM Employees WHERE id=@id');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Employée non trouvée' });
    res.json(mapEmp(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const stats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const parts = [];
    if (startDate) parts.push('date >= @startDate');
    if (endDate) parts.push('date <= @endDate');
    let where = 'WHERE employeeId=@id';
    if (parts.length) where += ' AND ' + parts.join(' AND ');
    const request = pool.request().input('id', req.params.id);
    if (startDate) request.input('startDate', startDate);
    if (endDate) request.input('endDate', endDate);
    const prods = await request.query(`SELECT * FROM Productions ${where}`);
    const rows = prods.recordset;
    const totalPieces = rows.reduce((s, p) => s + (p.totalPieces || 0), 0);
    const heuresTravail = rows.reduce((s, p) => s + (p.heuresTravail || 0), 0);
    const rendement = rows.length ? rows.reduce((s, p) => s + (p.rendement || 0), 0) / rows.length : 0;
    res.json({ totalPieces, heuresTravail, rendementMoyen: rendement, nbProductions: rows.length });
  } catch (e) {
    next(e);
  }
};
