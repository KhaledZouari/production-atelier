import { pool } from '../config/db.js';
import { makeBasketCode } from '../utils/mesCalculations.js';

const applyDateRange = (request, { startDate, endDate }, column = 'entryDate') => {
  const filters = [];
  if (startDate) {
    request.input('startDate', startDate);
    filters.push(`${column} >= @startDate`);
  }
  if (endDate) {
    request.input('endDate', endDate);
    filters.push(`${column} <= @endDate`);
  }
  return filters;
};

export const nextBasketCode = async () => {
  const year = new Date().getFullYear();
  const result = await pool.request().input('year', year).query(`
    MERGE MesBarcodeSequences WITH (HOLDLOCK) AS target
    USING (SELECT @year AS year) AS src
    ON target.year = src.year
    WHEN MATCHED THEN UPDATE SET lastNumber = target.lastNumber + 1
    WHEN NOT MATCHED THEN INSERT (year, lastNumber) VALUES (@year, 1)
    OUTPUT INSERTED.lastNumber;
  `);
  return makeBasketCode(year, result.recordset[0].lastNumber);
};

export const findEmployee = async (id) => {
  const result = await pool.request().input('id', id).query('SELECT * FROM Employees WHERE id=@id');
  return result.recordset?.[0] || null;
};

export const findOperation = async (id) => {
  const result = await pool.request().input('id', id).query('SELECT * FROM Operations WHERE id=@id');
  return result.recordset[0] || null;
};

export const findOperationStandard = async ({ operationId, articleReference, color, size }) => {
  const request = pool.request();
  const filters = ['active=1'];
  if (operationId) {
    request.input('operationId', operationId);
    filters.push('(operationId=@operationId OR operationId IS NULL)');
  }
  if (articleReference) {
    request.input('articleReference', articleReference);
    filters.push('(articleReference=@articleReference OR articleReference IS NULL)');
  }
  if (color) {
    request.input('color', color);
    filters.push('(color=@color OR color IS NULL)');
  }
  if (size) {
    request.input('size', size);
    filters.push('(size=@size OR size IS NULL)');
  }
  const result = await request.query(`
    SELECT TOP 1 *
    FROM MesOperationStandards
    WHERE ${filters.join(' AND ')}
    ORDER BY
      CASE WHEN operationId IS NULL THEN 1 ELSE 0 END,
      CASE WHEN articleReference IS NULL THEN 1 ELSE 0 END,
      CASE WHEN color IS NULL THEN 1 ELSE 0 END,
      CASE WHEN size IS NULL THEN 1 ELSE 0 END
  `);
  return result.recordset[0] || null;
};

export const createEfficiencyEntry = async (data) => {
  const result = await pool
    .request()
    .input('employeeId', data.employeeId)
    .input('operationId', data.operationId || null)
    .input('workshopId', data.workshopId || null)
    .input('lineId', data.lineId || null)
    .input('workstationId', data.workstationId || null)
    .input('trackingSheetId', data.trackingSheetId || null)
    .input('basketId', data.basketId || null)
    .input('entryDate', data.entryDate)
    .input('startTime', data.startTime)
    .input('endTime', data.endTime)
    .input('samMinutes', data.samMinutes)
    .input('quantityProduced', data.quantityProduced)
    .input('realWorkedMinutes', data.realWorkedMinutes)
    .input('efficiency', data.efficiency)
    .input('createdBy', data.createdBy || null)
    .query(`
      INSERT INTO MesProductionEntries
      (employeeId, operationId, workshopId, lineId, workstationId, trackingSheetId, basketId, entryDate, startTime, endTime,
       samMinutes, quantityProduced, realWorkedMinutes, efficiency, createdBy)
      OUTPUT INSERTED.*
      VALUES (@employeeId,@operationId,@workshopId,@lineId,@workstationId,@trackingSheetId,@basketId,@entryDate,@startTime,@endTime,
       @samMinutes,@quantityProduced,@realWorkedMinutes,@efficiency,@createdBy)
    `);
  return result.recordset[0];
};

export const findEfficiencyEntries = async (query = {}) => {
  const request = pool.request();
  const filters = applyDateRange(request, query, 'm.entryDate');
  if (query.employeeId) {
    request.input('employeeId', query.employeeId);
    filters.push('m.employeeId = @employeeId');
  }
  if (query.operationId) {
    request.input('operationId', query.operationId);
    filters.push('m.operationId = @operationId');
  }
  if (query.workshopId) {
    request.input('workshopId', query.workshopId);
    filters.push('m.workshopId = @workshopId');
  }
  if (query.lineId) {
    request.input('lineId', query.lineId);
    filters.push('m.lineId = @lineId');
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT m.*,
           e.matricule AS employeeCode,
           CONCAT(e.prenom, ' ', e.nom) AS employeeName,
           o.code AS operationCode,
           o.nom AS operationName,
           w.name AS workshopName,
           l.name AS lineName
    FROM MesProductionEntries m
    LEFT JOIN Employees e ON m.employeeId = e.id
    LEFT JOIN Operations o ON m.operationId = o.id
    LEFT JOIN MesWorkshops w ON m.workshopId = w.id
    LEFT JOIN MesProductionLines l ON m.lineId = l.id
    ${where}
    ORDER BY m.entryDate DESC, m.createdAt DESC
  `);
  return result.recordset;
};

export const aggregateEfficiency = async ({ startDate, endDate, groupBy = 'employee' }) => {
  const groupMap = {
    employee: {
      select: "m.employeeId AS id, CONCAT(e.prenom, ' ', e.nom) AS label, e.matricule AS code",
      join: 'LEFT JOIN Employees e ON m.employeeId = e.id',
      group: "m.employeeId, e.prenom, e.nom, e.matricule"
    },
    workshop: {
      select: "m.workshopId AS id, ISNULL(w.name, 'Non affecte') AS label, w.code AS code",
      join: 'LEFT JOIN MesWorkshops w ON m.workshopId = w.id',
      group: "m.workshopId, w.name, w.code"
    },
    line: {
      select: "m.lineId AS id, ISNULL(l.name, 'Non affectee') AS label, l.code AS code",
      join: 'LEFT JOIN MesProductionLines l ON m.lineId = l.id',
      group: "m.lineId, l.name, l.code"
    },
    operation: {
      select: "m.operationId AS id, ISNULL(o.nom, 'Operation libre') AS label, o.code AS code",
      join: 'LEFT JOIN Operations o ON m.operationId = o.id',
      group: "m.operationId, o.nom, o.code"
    }
  };
  const spec = groupMap[groupBy] || groupMap.employee;
  const request = pool.request();
  const filters = applyDateRange(request, { startDate, endDate }, 'm.entryDate');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT ${spec.select},
           SUM(m.quantityProduced) AS totalPieces,
           COUNT(DISTINCT m.employeeId) AS workersCount,
           SUM(m.realWorkedMinutes) AS totalWorkedMinutes,
           SUM(m.quantityProduced * m.samMinutes) AS theoreticalMinutes,
           SUM(CASE
             WHEN m.realWorkedMinutes - (m.quantityProduced * m.samMinutes) > 0
               THEN m.realWorkedMinutes - (m.quantityProduced * m.samMinutes)
             ELSE 0 END) AS lostMinutes,
           SUM(CASE
             WHEN m.quantityProduced * m.samMinutes > m.realWorkedMinutes THEN m.realWorkedMinutes
             ELSE m.quantityProduced * m.samMinutes END) AS productiveMinutes,
           SUM(CASE WHEN m.samMinutes > 0 THEN m.realWorkedMinutes / m.samMinutes ELSE 0 END) AS targetPieces,
           SUM(m.quantityProduced) - SUM(CASE WHEN m.samMinutes > 0 THEN m.realWorkedMinutes / m.samMinutes ELSE 0 END) AS variancePieces,
           CASE WHEN SUM(m.realWorkedMinutes) > 0
             THEN ROUND((SUM(m.quantityProduced * m.samMinutes) / SUM(m.realWorkedMinutes)) * 100, 2)
             ELSE 0 END AS efficiency
    FROM MesProductionEntries m
    ${spec.join}
    ${where}
    GROUP BY ${spec.group}
    ORDER BY efficiency DESC
  `);
  return result.recordset;
};

export const createTrackingSheet = async (data) => {
  const result = await pool
    .request()
    .input('sheetNumber', data.sheetNumber)
    .input('sheetDate', data.sheetDate)
    .input('orderId', data.orderId || null)
    .input('articleReference', data.articleReference || null)
    .input('articleDesignation', data.articleDesignation || null)
    .input('client', data.client || null)
    .input('color', data.color || null)
    .input('size', data.size || null)
    .input('orderQuantity', data.orderQuantity || 0)
    .input('status', data.status || 'en_attente')
    .query(`
      INSERT INTO MesTrackingSheets
      (sheetNumber, sheetDate, orderId, articleReference, articleDesignation, client, color, size, orderQuantity, status)
      OUTPUT INSERTED.*
      VALUES (@sheetNumber,@sheetDate,@orderId,@articleReference,@articleDesignation,@client,@color,@size,@orderQuantity,@status)
    `);
  return result.recordset[0];
};

export const listTrackingSheets = async () => {
  const result = await pool.request().query('SELECT * FROM MesTrackingSheets ORDER BY createdAt DESC');
  return result.recordset;
};

export const listOpenTrackingSheets = async () => {
  const result = await pool
    .request()
    .query("SELECT * FROM MesTrackingSheets WHERE status <> 'termine' AND producedQuantity < orderQuantity ORDER BY createdAt DESC");
  return result.recordset;
};

export const getTrackingSheet = async (id) => {
  const sheet = await pool.request().input('id', id).query('SELECT * FROM MesTrackingSheets WHERE id=@id');
  if (!sheet.recordset[0]) return null;
  const operations = await pool
    .request()
    .input('id', id)
    .query('SELECT * FROM MesTrackingSheetOperations WHERE trackingSheetId=@id ORDER BY sequenceNo ASC, id ASC');
  return { sheet: sheet.recordset[0], operations: operations.recordset };
};

export const addTrackingOperation = async (data) => {
  const result = await pool
    .request()
    .input('trackingSheetId', data.trackingSheetId)
    .input('operationId', data.operationId || null)
    .input('operationName', data.operationName)
    .input('sequenceNo', data.sequenceNo || 1)
    .input('basketId', data.basketId || null)
    .input('employeeId', data.employeeId || null)
    .input('workstationName', data.workstationName || null)
    .input('quantity', data.quantity || 0)
    .input('entryTime', data.entryTime || null)
    .input('exitTime', data.exitTime || null)
    .input('status', data.status || 'en_attente')
    .query(`
      INSERT INTO MesTrackingSheetOperations
      (trackingSheetId, operationId, operationName, sequenceNo, basketId, employeeId, workstationName, quantity, entryTime, exitTime, status)
      OUTPUT INSERTED.*
      VALUES (@trackingSheetId,@operationId,@operationName,@sequenceNo,@basketId,@employeeId,@workstationName,@quantity,@entryTime,@exitTime,@status)
    `);
  return result.recordset[0];
};

export const createBasket = async (data) => {
  const result = await pool
    .request()
    .input('basketCode', data.basketCode)
    .input('barcodeValue', data.barcodeValue)
    .input('qrPayload', data.qrPayload)
    .input('trackingSheetId', data.trackingSheetId || null)
    .input('orderId', data.orderId || null)
    .input('articleReference', data.articleReference || null)
    .input('articleDesignation', data.articleDesignation || null)
    .input('color', data.color || null)
    .input('size', data.size || null)
    .input('quantity', data.quantity || 0)
    .input('currentOperationId', data.currentOperationId || null)
    .input('currentOperationName', data.currentOperationName || null)
    .input('nextOperationId', data.nextOperationId || null)
    .input('nextOperationName', data.nextOperationName || null)
    .input('employeeId', data.employeeId || null)
    .input('workshopId', data.workshopId || null)
    .input('lineId', data.lineId || null)
    .input('workshopName', data.workshopName || null)
    .input('lineName', data.lineName || null)
    .input('status', data.status || 'en_attente')
    .query(`
      INSERT INTO MesProductionBaskets
      (basketCode, barcodeValue, qrPayload, trackingSheetId, orderId, articleReference, articleDesignation, color, size, quantity,
       currentOperationId, currentOperationName, nextOperationId, nextOperationName, employeeId, workshopId, lineId,
       workshopName, lineName, status)
      OUTPUT INSERTED.*
      VALUES (@basketCode,@barcodeValue,@qrPayload,@trackingSheetId,@orderId,@articleReference,@articleDesignation,@color,@size,@quantity,
       @currentOperationId,@currentOperationName,@nextOperationId,@nextOperationName,@employeeId,@workshopId,@lineId,
       @workshopName,@lineName,@status)
    `);
  return result.recordset[0];
};

export const listBaskets = async (query = {}) => {
  const request = pool.request();
  const filters = [];
  if (query.status) {
    request.input('status', query.status);
    filters.push('b.status = @status');
  }
  if (query.search) {
    request.input('search', `%${query.search}%`);
    filters.push('(b.basketCode LIKE @search OR b.articleReference LIKE @search OR b.articleDesignation LIKE @search)');
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT b.*, CONCAT(e.prenom, ' ', e.nom) AS employeeName
    FROM MesProductionBaskets b
    LEFT JOIN Employees e ON b.employeeId = e.id
    ${where}
    ORDER BY b.createdAt DESC
  `);
  return result.recordset;
};

export const getBasketByIdOrCode = async (value) => {
  const numericId = Number(value);
  const result = await pool
    .request()
    .input('id', Number.isFinite(numericId) ? numericId : 0)
    .input('code', String(value))
    .query(`
      SELECT b.*, CONCAT(e.prenom, ' ', e.nom) AS employeeName
      FROM MesProductionBaskets b
      LEFT JOIN Employees e ON b.employeeId = e.id
      WHERE b.id=@id OR b.basketCode=@code OR b.barcodeValue=@code
    `);
  return result.recordset[0] || null;
};

export const updateBasketStatus = async ({ id, status, blockedReason = null }) => {
  const result = await pool
    .request()
    .input('id', id)
    .input('status', status)
    .input('blockedReason', blockedReason)
    .query(`
      UPDATE MesProductionBaskets
      SET status=@status, blockedReason=@blockedReason
      WHERE id=@id;
      SELECT * FROM MesProductionBaskets WHERE id=@id
    `);
  return result.recordset[0] || null;
};

export const incrementTrackingSheetProduced = async ({ id, quantity }) => {
  if (!id || !quantity) return null;
  const result = await pool
    .request()
    .input('id', id)
    .input('quantity', quantity)
    .query(`
      UPDATE MesTrackingSheets
      SET producedQuantity = producedQuantity + @quantity,
          status = CASE
            WHEN producedQuantity + @quantity >= orderQuantity THEN 'termine'
            ELSE 'en_cours'
          END
      WHERE id=@id;
      SELECT * FROM MesTrackingSheets WHERE id=@id
    `);
  return result.recordset[0] || null;
};

export const updateTrackingOperationProgress = async ({ trackingSheetId, basketId, operationId, employeeId, quantity, status = 'termine' }) => {
  if (!trackingSheetId) return null;
  const request = pool
    .request()
    .input('trackingSheetId', trackingSheetId)
    .input('basketId', basketId || null)
    .input('operationId', operationId || null)
    .input('employeeId', employeeId || null)
    .input('quantity', quantity || 0)
    .input('status', status);

  const result = await request.query(`
    UPDATE TOP (1) MesTrackingSheetOperations
    SET basketId = ISNULL(@basketId, basketId),
        employeeId = ISNULL(@employeeId, employeeId),
        quantity = quantity + @quantity,
        exitTime = GETDATE(),
        status = @status
    WHERE trackingSheetId=@trackingSheetId
      AND (@operationId IS NULL OR operationId=@operationId)
      AND status <> 'termine';

    SELECT TOP 1 * FROM MesTrackingSheetOperations
    WHERE trackingSheetId=@trackingSheetId
      AND (@operationId IS NULL OR operationId=@operationId)
    ORDER BY sequenceNo ASC, id ASC
  `);
  return result.recordset[0] || null;
};

export const moveBasket = async (data) => {
  const result = await pool
    .request()
    .input('id', data.id)
    .input('currentOperationId', data.currentOperationId || null)
    .input('currentOperationName', data.currentOperationName || null)
    .input('nextOperationId', data.nextOperationId || null)
    .input('nextOperationName', data.nextOperationName || null)
    .input('employeeId', data.employeeId || null)
    .input('status', data.status || 'en_cours')
    .query(`
      UPDATE MesProductionBaskets
      SET currentOperationId=@currentOperationId,
          currentOperationName=@currentOperationName,
          nextOperationId=@nextOperationId,
          nextOperationName=@nextOperationName,
          employeeId=@employeeId,
          status=@status
      WHERE id=@id;
      SELECT * FROM MesProductionBaskets WHERE id=@id
    `);
  return result.recordset[0] || null;
};

export const createTrace = async (data) => {
  const result = await pool
    .request()
    .input('basketId', data.basketId || null)
    .input('trackingSheetId', data.trackingSheetId || null)
    .input('productionEntryId', data.productionEntryId || null)
    .input('employeeId', data.employeeId || null)
    .input('operationId', data.operationId || null)
    .input('operationName', data.operationName || null)
    .input('traceDate', data.traceDate || new Date().toISOString().split('T')[0])
    .input('quantity', data.quantity || 0)
    .input('status', data.status || null)
    .input('note', data.note || null)
    .query(`
      INSERT INTO MesProductionTraces
      (basketId, trackingSheetId, productionEntryId, employeeId, operationId, operationName, traceDate, quantity, status, note)
      OUTPUT INSERTED.*
      VALUES (@basketId,@trackingSheetId,@productionEntryId,@employeeId,@operationId,@operationName,@traceDate,@quantity,@status,@note)
    `);
  return result.recordset[0];
};

export const listTraces = async (query = {}) => {
  const request = pool.request();
  const filters = applyDateRange(request, { startDate: query.startDate, endDate: query.endDate }, 't.traceDate');
  if (query.basketId) {
    request.input('basketId', query.basketId);
    filters.push('t.basketId = @basketId');
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT t.*, CONCAT(e.prenom, ' ', e.nom) AS employeeName
    FROM MesProductionTraces t
    LEFT JOIN Employees e ON t.employeeId = e.id
    ${where}
    ORDER BY t.traceTime DESC
  `);
  return result.recordset;
};

export const insertAlertIfNew = async (data) => {
  const result = await pool
    .request()
    .input('alertType', data.alertType)
    .input('severity', data.severity || 'warning')
    .input('title', data.title)
    .input('message', data.message || null)
    .input('entityType', data.entityType || null)
    .input('entityId', data.entityId || null)
    .input('thresholdValue', data.thresholdValue ?? null)
    .input('actualValue', data.actualValue ?? null)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM MesAlerts
        WHERE alertType=@alertType AND ISNULL(entityType,'')=ISNULL(@entityType,'') AND ISNULL(entityId,0)=ISNULL(@entityId,0) AND status='open'
      )
      INSERT INTO MesAlerts
      (alertType, severity, title, message, entityType, entityId, thresholdValue, actualValue)
      OUTPUT INSERTED.*
      VALUES (@alertType,@severity,@title,@message,@entityType,@entityId,@thresholdValue,@actualValue)
    `);
  return result.recordset?.[0] || null;
};

export const listAlerts = async (status = 'open') => {
  const request = pool.request();
  let where = '';
  if (status !== 'all') {
    request.input('status', status);
    where = 'WHERE status=@status';
  }
  const result = await request.query(`SELECT * FROM MesAlerts ${where} ORDER BY createdAt DESC`);
  return result.recordset;
};

export const acknowledgeAlert = async ({ id, userId }) => {
  const result = await pool
    .request()
    .input('id', id)
    .input('userId', userId || null)
    .query(`
      UPDATE MesAlerts SET status='acknowledged', acknowledgedAt=GETDATE(), acknowledgedBy=@userId WHERE id=@id;
      SELECT * FROM MesAlerts WHERE id=@id
    `);
  return result.recordset[0] || null;
};

export const dashboardKpis = async ({ startDate, endDate }) => {
  const request = pool.request();
  const filters = applyDateRange(request, { startDate, endDate }, 'entryDate');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT
      SUM(quantityProduced) AS totalPieces,
      COUNT(DISTINCT employeeId) AS workersCount,
      SUM(realWorkedMinutes) AS totalWorkedMinutes,
      SUM(quantityProduced * samMinutes) AS theoreticalMinutes,
      SUM(CASE
        WHEN realWorkedMinutes - (quantityProduced * samMinutes) > 0
          THEN realWorkedMinutes - (quantityProduced * samMinutes)
        ELSE 0 END) AS lostMinutes,
      SUM(CASE
        WHEN quantityProduced * samMinutes > realWorkedMinutes THEN realWorkedMinutes
        ELSE quantityProduced * samMinutes END) AS productiveMinutes,
      SUM(CASE WHEN samMinutes > 0 THEN realWorkedMinutes / samMinutes ELSE 0 END) AS targetPieces,
      SUM(quantityProduced) - SUM(CASE WHEN samMinutes > 0 THEN realWorkedMinutes / samMinutes ELSE 0 END) AS variancePieces,
      CASE WHEN SUM(realWorkedMinutes) > 0
        THEN ROUND((SUM(quantityProduced * samMinutes) / SUM(realWorkedMinutes)) * 100, 2)
        ELSE 0 END AS averageEfficiency
    FROM MesProductionEntries
    ${where}
  `);
  const blocked = await pool.request().query("SELECT COUNT(*) AS blocked FROM MesProductionBaskets WHERE status='bloque'");
  const inProgress = await pool.request().query("SELECT COUNT(*) AS inProgress FROM MesProductionBaskets WHERE status IN ('en_attente','en_cours')");
  return {
    ...(result.recordset[0] || {}),
    blockedBaskets: blocked.recordset[0]?.blocked || 0,
    inProgressBaskets: inProgress.recordset[0]?.inProgress || 0
  };
};

export const chartProductionByDay = async ({ startDate, endDate }) => {
  const request = pool.request();
  const filters = applyDateRange(request, { startDate, endDate }, 'entryDate');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT entryDate AS label,
           SUM(quantityProduced) AS pieces,
           CASE WHEN SUM(realWorkedMinutes) > 0
             THEN ROUND((SUM(quantityProduced * samMinutes) / SUM(realWorkedMinutes)) * 100, 2)
             ELSE 0 END AS efficiency
    FROM MesProductionEntries
    ${where}
    GROUP BY entryDate
    ORDER BY entryDate ASC
  `);
  return result.recordset;
};

export const basketStatusSummary = async () => {
  const result = await pool.request().query(`
    SELECT status,
           COUNT(*) AS basketsCount,
           SUM(quantity) AS pieces
    FROM MesProductionBaskets
    GROUP BY status
  `);
  return result.recordset;
};

export const wipByOperation = async () => {
  const result = await pool.request().query(`
    SELECT ISNULL(currentOperationName, 'Operation non affectee') AS operationName,
           currentOperationId AS operationId,
           status,
           COUNT(*) AS basketsCount,
           SUM(quantity) AS pieces
    FROM MesProductionBaskets
    WHERE status IN ('en_attente', 'en_cours', 'bloque')
    GROUP BY currentOperationId, currentOperationName, status
    ORDER BY pieces DESC
  `);
  return result.recordset;
};

export const lossCauses = async ({ startDate, endDate }) => {
  const request = pool.request();
  const filters = applyDateRange(request, { startDate, endDate }, 'm.entryDate');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT
      CASE
        WHEN m.efficiency < 80 THEN 'Sous-performance'
        WHEN m.realWorkedMinutes - (m.quantityProduced * m.samMinutes) > 15 THEN 'Temps perdu operation'
        WHEN m.quantityProduced = 0 THEN 'Sans production saisie'
        ELSE 'Ecart mineur'
      END AS cause,
      COUNT(*) AS entriesCount,
      SUM(CASE
        WHEN m.realWorkedMinutes - (m.quantityProduced * m.samMinutes) > 0
          THEN m.realWorkedMinutes - (m.quantityProduced * m.samMinutes)
        ELSE 0 END) AS lostMinutes,
      SUM(m.quantityProduced) AS pieces
    FROM MesProductionEntries m
    ${where}
    GROUP BY
      CASE
        WHEN m.efficiency < 80 THEN 'Sous-performance'
        WHEN m.realWorkedMinutes - (m.quantityProduced * m.samMinutes) > 15 THEN 'Temps perdu operation'
        WHEN m.quantityProduced = 0 THEN 'Sans production saisie'
        ELSE 'Ecart mineur'
      END
    ORDER BY lostMinutes DESC
  `);
  return result.recordset;
};
