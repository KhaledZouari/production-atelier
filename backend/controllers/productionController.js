import { pool } from '../config/db.js';
import { validationResult } from 'express-validator';
import { validateTimeRange, computeProductionMetrics } from '../utils/calculations.js';

const mapProd = (row) => ({
  _id: row.id,
  employeeId: row.employeeId,
  operationId: row.operationId,
  chaine: row.chaine,
  date: row.date,
  heureDebut: row.heureDebut,
  heureFin: row.heureFin,
  nbLots: row.nbLots,
  totalPieces: row.totalPieces,
  heuresTravail: row.heuresTravail,
  piecesParHeure: row.piecesParHeure,
  rendement: row.rendement,
  valide: row.valide,
  validePar: row.validePar
});

const mapWithJoins = (row) => ({
  _id: row.id,
  chaine: row.chaine,
  date: row.date,
  heureDebut: row.heureDebut,
  heureFin: row.heureFin,
  nbLots: row.nbLots,
  totalPieces: row.totalPieces,
  heuresTravail: row.heuresTravail,
  piecesParHeure: row.piecesParHeure,
  rendement: row.rendement,
  valide: row.valide,
  validePar: row.validePar,
  employeeId: row.empId
    ? { _id: row.empId, prenom: row.empPrenom, nom: row.empNom, chaine: row.empChaine }
    : null,
  operationId: row.opId
    ? {
        _id: row.opId,
        code: row.opCode,
        nom: row.opNom,
        tailleLot: row.opTailleLot,
        objectifHeure: row.opObjectifHeure
      }
    : null
});

export const list = async (req, res, next) => {
  try {
    const { date, employeeId, chaine, operationId } = req.query;
    const filters = [];
    if (date) filters.push('p.date = @date');
    if (employeeId) filters.push('p.employeeId = @employeeId');
    if (chaine) filters.push('p.chaine = @chaine');
    if (operationId) filters.push('p.operationId = @operationId');
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const request = pool.request();
    if (date) request.input('date', date);
    if (employeeId) request.input('employeeId', employeeId);
    if (chaine) request.input('chaine', chaine);
    if (operationId) request.input('operationId', operationId);
    const result = await request.query(`
      SELECT 
        p.*, 
        e.id as empId, e.prenom as empPrenom, e.nom as empNom, e.chaine as empChaine,
        o.id as opId, o.code as opCode, o.nom as opNom, o.tailleLot as opTailleLot, o.objectifHeure as opObjectifHeure
      FROM Productions p
      LEFT JOIN Employees e ON p.employeeId = e.id
      LEFT JOIN Operations o ON p.operationId = o.id
      ${where}
    `);
    res.json(result.recordset.map(mapWithJoins));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const result = await pool
      .request()
      .input('id', req.params.id)
      .query(
        `SELECT 
          p.*, 
          e.id as empId, e.prenom as empPrenom, e.nom as empNom, e.chaine as empChaine,
          o.id as opId, o.code as opCode, o.nom as opNom, o.tailleLot as opTailleLot, o.objectifHeure as opObjectifHeure
        FROM Productions p
        LEFT JOIN Employees e ON p.employeeId = e.id
        LEFT JOIN Operations o ON p.operationId = o.id
        WHERE p.id=@id`
      );
    if (!result.recordset[0]) return res.status(404).json({ message: 'Production non trouvée' });
    res.json(mapWithJoins(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const empRes = await pool.request().input('id', req.body.employeeId).query('SELECT * FROM Employees WHERE id=@id');
    const emp = empRes.recordset[0];
    if (!emp) return res.status(400).json({ message: 'Employée invalide' });
    if (!emp.active) return res.status(400).json({ message: 'Employée inactive' });

    const opRes = await pool.request().input('id', req.body.operationId).query('SELECT * FROM Operations WHERE id=@id');
    const op = opRes.recordset[0];
    if (!op) return res.status(400).json({ message: 'Opération invalide' });

    const heuresTravail = validateTimeRange(req.body.heureDebut, req.body.heureFin, req.body.date);
    const { totalPieces, piecesParHeure, rendement } = computeProductionMetrics({
      tailleLot: op.tailleLot,
      nbLots: req.body.nbLots,
      objectifHeure: op.objectifHeure,
      heuresTravail
    });

    const result = await pool
      .request()
      .input('employeeId', req.body.employeeId)
      .input('operationId', req.body.operationId)
      .input('chaine', req.body.chaine)
      .input('date', req.body.date)
      .input('heureDebut', req.body.heureDebut)
      .input('heureFin', req.body.heureFin)
      .input('nbLots', Math.max(1, req.body.nbLots))
      .input('totalPieces', totalPieces)
      .input('heuresTravail', heuresTravail)
      .input('piecesParHeure', piecesParHeure)
      .input('rendement', rendement)
      .query(
        `INSERT INTO Productions
        (employeeId, operationId, chaine, date, heureDebut, heureFin, nbLots, totalPieces, heuresTravail, piecesParHeure, rendement, valide)
        OUTPUT INSERTED.*
        VALUES (@employeeId,@operationId,@chaine,@date,@heureDebut,@heureFin,@nbLots,@totalPieces,@heuresTravail,@piecesParHeure,@rendement,0)`
      );
    res.status(201).json(mapProd(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const prodRes = await pool.request().input('id', req.params.id).query('SELECT * FROM Productions WHERE id=@id');
    const prod = prodRes.recordset[0];
    if (!prod) return res.status(404).json({ message: 'Production non trouvée' });

    const empId = req.body.employeeId || prod.employeeId;
    const empRes = await pool.request().input('id', empId).query('SELECT * FROM Employees WHERE id=@id');
    const emp = empRes.recordset[0];
    if (!emp) return res.status(400).json({ message: 'Employée invalide' });
    if (!emp.active) return res.status(400).json({ message: 'Employée inactive' });

    const opId = req.body.operationId || prod.operationId;
    const opRes = await pool.request().input('id', opId).query('SELECT * FROM Operations WHERE id=@id');
    const op = opRes.recordset[0];
    if (!op) return res.status(400).json({ message: 'Opération invalide' });

    const heuresTravail = validateTimeRange(req.body.heureDebut || prod.heureDebut, req.body.heureFin || prod.heureFin, req.body.date || prod.date);
    const { totalPieces, piecesParHeure, rendement } = computeProductionMetrics({
      tailleLot: op.tailleLot,
      nbLots: req.body.nbLots || prod.nbLots,
      objectifHeure: op.objectifHeure,
      heuresTravail
    });

    const result = await pool
      .request()
      .input('id', req.params.id)
      .input('employeeId', empId)
      .input('operationId', opId)
      .input('chaine', req.body.chaine || prod.chaine)
      .input('date', req.body.date || prod.date)
      .input('heureDebut', req.body.heureDebut || prod.heureDebut)
      .input('heureFin', req.body.heureFin || prod.heureFin)
      .input('nbLots', Math.max(1, req.body.nbLots || prod.nbLots))
      .input('totalPieces', totalPieces)
      .input('heuresTravail', heuresTravail)
      .input('piecesParHeure', piecesParHeure)
      .input('rendement', rendement)
      .query(
        `UPDATE Productions SET
          employeeId=@employeeId,
          operationId=@operationId,
          chaine=@chaine,
          date=@date,
          heureDebut=@heureDebut,
          heureFin=@heureFin,
          nbLots=@nbLots,
          totalPieces=@totalPieces,
          heuresTravail=@heuresTravail,
          piecesParHeure=@piecesParHeure,
          rendement=@rendement
        WHERE id=@id;
        SELECT * FROM Productions WHERE id=@id`
      );
    res.json(mapProd(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await pool.request().input('id', req.params.id).query('DELETE FROM Productions WHERE id=@id');
    if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Production non trouvée' });
    res.json({ message: 'Supprimée' });
  } catch (e) {
    next(e);
  }
};

export const validateProd = async (req, res, next) => {
  try {
    const result = await pool
      .request()
      .input('id', req.params.id)
      .input('validePar', req.user.id)
      .query('UPDATE Productions SET valide=1, validePar=@validePar WHERE id=@id; SELECT * FROM Productions WHERE id=@id');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Production non trouvée' });
    res.json(mapProd(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const statsDaily = async (req, res, next) => {
  try {
    const date = req.query.date ? req.query.date : new Date().toISOString().split('T')[0];
    const resProds = await pool.request().input('date', date).query('SELECT * FROM Productions WHERE date=@date');
    const prods = resProds.recordset;
    const totalPieces = prods.reduce((s, p) => s + (p.totalPieces || 0), 0);
    const heuresTravail = prods.reduce((s, p) => s + (p.heuresTravail || 0), 0);
    const rendement = prods.length ? prods.reduce((s, p) => s + (p.rendement || 0), 0) / prods.length : 0;
    const ouv = new Set(prods.map((p) => p.employeeId)).size;
    res.json({ totalPieces, heuresTravail, rendementMoyen: rendement, nbOuvrieres: ouv });
  } catch (e) {
    next(e);
  }
};
