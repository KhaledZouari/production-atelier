import { pool } from '../config/db.js';
import { computeResourceNeed, computeStandardOperationMetrics } from '../utils/calculations.js';

const mapOp = (row, capacity = {}) => {
  const standard = computeResourceNeed({
    tempsMinutes: row.tempsMinutes,
    objectifHeure: row.objectifHeure,
    productionJour: capacity.productionJour,
    tempsPresenceMinutes: capacity.tempsPresenceMinutes
  });

  return {
    _id: row.id,
    code: row.code,
    nom: row.nom,
    tailleLot: row.tailleLot,
    objectifHeure: standard.objectifHeure,
    tempsMinutes: standard.tempsMinutes,
    besoinRessource: standard.besoinRessource,
    active: row.active
  };
};

export const list = async (_req, res, next) => {
  try {
    const capacity = {
      productionJour: _req.query.productionJour,
      tempsPresenceMinutes: _req.query.tempsPresenceMinutes
    };
    const result = await pool.request().query('SELECT * FROM Operations WHERE active=1');
    res.json(result.recordset.map((row) => mapOp(row, capacity)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const { code, nom, tailleLot, objectifHeure, tempsMinutes = null, active = 1 } = req.body;
    const standard = computeStandardOperationMetrics({ tempsMinutes, objectifHeure });
    const result = await pool
      .request()
      .input('code', code)
      .input('nom', nom)
      .input('tailleLot', tailleLot)
      .input('objectifHeure', standard.objectifHeure)
      .input('tempsMinutes', standard.tempsMinutes || null)
      .input('active', active)
      .query(
        'INSERT INTO Operations (code, nom, tailleLot, objectifHeure, tempsMinutes, active) OUTPUT INSERTED.* VALUES (@code,@nom,@tailleLot,@objectifHeure,@tempsMinutes,@active)'
      );
    res.status(201).json(mapOp(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const { code, nom, tailleLot, objectifHeure, tempsMinutes = null, active = 1 } = req.body;
    const standard = computeStandardOperationMetrics({ tempsMinutes, objectifHeure });
    const result = await pool
      .request()
      .input('id', req.params.id)
      .input('code', code)
      .input('nom', nom)
      .input('tailleLot', tailleLot)
      .input('objectifHeure', standard.objectifHeure)
      .input('tempsMinutes', standard.tempsMinutes || null)
      .input('active', active)
      .query(
        'UPDATE Operations SET code=@code, nom=@nom, tailleLot=@tailleLot, objectifHeure=@objectifHeure, tempsMinutes=@tempsMinutes, active=@active WHERE id=@id; SELECT * FROM Operations WHERE id=@id'
      );
    if (!result.recordset[0]) return res.status(404).json({ message: 'Opération non trouvée' });
    res.json(mapOp(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await pool.request().input('id', req.params.id).query('DELETE FROM Operations WHERE id=@id');
    if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Opération non trouvée' });
    res.json({ message: 'Supprimée' });
  } catch (e) {
    next(e);
  }
};
