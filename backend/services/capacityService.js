import { pool } from '../config/db.js';
import { findOperation, findOperationStandard, getTrackingSheet } from '../repositories/mesRepository.js';
import { computeDailyArticleCapacity, getScheduledPresenceMinutes } from '../utils/mesCalculations.js';

const dayName = (dateStr) => {
  const date = new Date(`${String(dateStr).split('T')[0]}T00:00:00`);
  return ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
};

export const getCalendarPresence = (date = new Date().toISOString().split('T')[0]) => {
  const presenceMinutes = getScheduledPresenceMinutes(date);
  return {
    date,
    dayName: dayName(date),
    presenceMinutes,
    workedDay: presenceMinutes > 0
  };
};

const listActiveOperations = async () => {
  const result = await pool.request().query('SELECT * FROM Operations WHERE active=1 ORDER BY id ASC');
  return result.recordset;
};

const resolveCapacityOperations = async ({ trackingSheetId, defaultWorkers = 1 }) => {
  if (!trackingSheetId) {
    const operations = await listActiveOperations();
    return operations.map((operation) => ({
      operationId: operation.id,
      operationName: operation.nom,
      sequenceNo: null,
      samMinutes: Number(operation.tempsMinutes || (operation.objectifHeure ? 60 / operation.objectifHeure : 0)),
      workers: defaultWorkers
    }));
  }

  const tracking = await getTrackingSheet(trackingSheetId);
  if (!tracking) throw new Error('Fiche suiveuse introuvable');
  const { sheet, operations } = tracking;

  return Promise.all((operations || []).map(async (operation) => {
    const baseOperation = operation.operationId ? await findOperation(operation.operationId) : null;
    const standard = await findOperationStandard({
      operationId: operation.operationId,
      articleReference: sheet.articleReference,
      color: sheet.color,
      size: sheet.size
    });
    const samMinutes = Number(
      standard?.samMinutes ||
      baseOperation?.tempsMinutes ||
      (baseOperation?.objectifHeure ? 60 / baseOperation.objectifHeure : 0)
    );

    return {
      operationId: operation.operationId,
      operationName: operation.operationName || baseOperation?.nom,
      sequenceNo: operation.sequenceNo,
      samMinutes,
      workers: operation.employeeId ? 1 : defaultWorkers
    };
  }));
};

export const getArticleDailyCapacity = async ({ date, trackingSheetId, defaultWorkers = 1 }) => {
  const calendar = getCalendarPresence(date);
  const operations = await resolveCapacityOperations({ trackingSheetId, defaultWorkers });
  const capacity = computeDailyArticleCapacity({
    operations,
    presenceMinutes: calendar.presenceMinutes,
    defaultWorkers
  });

  return {
    ...calendar,
    trackingSheetId: trackingSheetId || null,
    finishedPiecesPerDay: capacity.bottleneckCapacity,
    totalResourceNeedForOnePiecePerDay: capacity.totalResourceNeedForOnePiecePerDay,
    operations: capacity.operations
  };
};
