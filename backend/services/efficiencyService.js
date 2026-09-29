import {
  aggregateEfficiency,
  createEfficiencyEntry,
  createTrace,
  findEfficiencyEntries,
  findEmployee,
  findOperation,
  findOperationStandard,
  getBasketByIdOrCode,
  incrementTrackingSheetProduced,
  updateBasketStatus,
  updateTrackingOperationProgress
} from '../repositories/mesRepository.js';
import { computeEfficiency, resolvePeriod, resolveWorkedMinutes } from '../utils/mesCalculations.js';
import { mapEfficiencyEntry } from '../dto/mesDto.js';

const resolveSamMinutes = async (payload) => {
  if (Number(payload.samMinutes) > 0) return Number(payload.samMinutes);
  const standard = await findOperationStandard(payload);
  if (standard) return Number(standard.samMinutes);
  const operation = payload.operationId ? await findOperation(payload.operationId) : null;
  if (operation?.tempsMinutes) return Number(operation.tempsMinutes);
  if (operation?.objectifHeure) return Number((60 / operation.objectifHeure).toFixed(2));
  throw new Error('SAM obligatoire pour calculer le rendement');
};

export const recordIndividualEfficiency = async (payload, user) => {
  let basket = null;
  if (payload.basketId) {
    basket = await getBasketByIdOrCode(payload.basketId);
    if (!basket) throw new Error('Panier invalide');
    payload.employeeId = payload.employeeId || basket.employeeId;
    payload.operationId = payload.operationId || basket.currentOperationId;
    payload.trackingSheetId = payload.trackingSheetId || basket.trackingSheetId;
    payload.workshopId = payload.workshopId || basket.workshopId;
    payload.lineId = payload.lineId || basket.lineId;
    payload.quantityProduced = payload.quantityProduced || basket.quantity;
    payload.operationName = payload.operationName || basket.currentOperationName;
    payload.basketId = basket.id;
  }

  const employee = await findEmployee(payload.employeeId);
  if (!employee || !employee.active) throw new Error('Ouvriere invalide ou inactive');
  if (payload.operationId) {
    const operation = await findOperation(payload.operationId);
    if (!operation) throw new Error('Operation invalide');
  }

  const samMinutes = await resolveSamMinutes(payload);
  const realWorkedMinutes = resolveWorkedMinutes({
    entryDate: payload.entryDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    realWorkedMinutes: payload.realWorkedMinutes
  });
  const efficiency = computeEfficiency({
    quantityProduced: payload.quantityProduced,
    samMinutes,
    realWorkedMinutes
  });

  const entry = await createEfficiencyEntry({
    ...payload,
    startTime: payload.startTime || null,
    endTime: payload.endTime || null,
    samMinutes,
    realWorkedMinutes,
    efficiency,
    createdBy: user?.id
  });

  if (basket) {
    const quantity = Number(payload.quantityProduced || 0);
    await incrementTrackingSheetProduced({ id: basket.trackingSheetId, quantity });
    await updateTrackingOperationProgress({
      trackingSheetId: basket.trackingSheetId,
      basketId: basket.id,
      operationId: payload.operationId,
      employeeId: payload.employeeId,
      quantity,
      status: quantity >= Number(basket.quantity || 0) ? 'termine' : 'en_cours'
    });
    await updateBasketStatus({
      id: basket.id,
      status: quantity >= Number(basket.quantity || 0) ? 'termine' : 'en_cours'
    });
  }

  await createTrace({
    basketId: payload.basketId,
    trackingSheetId: payload.trackingSheetId,
    productionEntryId: entry.id,
    employeeId: payload.employeeId,
    operationId: payload.operationId,
    operationName: payload.operationName,
    traceDate: payload.entryDate,
    quantity: payload.quantityProduced,
    status: 'production',
    note: `Rendement ${efficiency}%`
  });

  const [mapped] = (await findEfficiencyEntries({ startDate: payload.entryDate, endDate: payload.entryDate }))
    .filter((row) => row.id === entry.id)
    .map(mapEfficiencyEntry);
  return mapped || mapEfficiencyEntry(entry);
};

export const getIndividualHistory = async ({ employeeId, period = 'daily', date, startDate, endDate }) => {
  const range = startDate || endDate ? { startDate, endDate } : resolvePeriod(period, date);
  const rows = await findEfficiencyEntries({ employeeId, ...range });
  return rows.map(mapEfficiencyEntry);
};

export const getRankings = async ({ groupBy = 'employee', period = 'daily', date, startDate, endDate }) => {
  const range = startDate || endDate ? { startDate, endDate } : resolvePeriod(period, date);
  return aggregateEfficiency({ ...range, groupBy });
};

export const getCollectiveEfficiency = async ({ period = 'daily', date, startDate, endDate }) => {
  const range = startDate || endDate ? { startDate, endDate } : resolvePeriod(period, date);
  const [workshops, lines, operations, workers] = await Promise.all([
    aggregateEfficiency({ ...range, groupBy: 'workshop' }),
    aggregateEfficiency({ ...range, groupBy: 'line' }),
    aggregateEfficiency({ ...range, groupBy: 'operation' }),
    aggregateEfficiency({ ...range, groupBy: 'employee' })
  ]);

  const totals = workers.reduce(
    (acc, row) => {
      acc.totalPieces += Number(row.totalPieces || 0);
      acc.totalWorkedMinutes += Number(row.totalWorkedMinutes || 0);
      acc.workersCount += 1;
      return acc;
    },
    { totalPieces: 0, totalWorkedMinutes: 0, workersCount: 0 }
  );
  const weighted = workers.reduce((sum, row) => sum + Number(row.totalWorkedMinutes || 0) * Number(row.efficiency || 0), 0);
  totals.globalEfficiency = totals.totalWorkedMinutes > 0 ? Number((weighted / totals.totalWorkedMinutes).toFixed(2)) : 0;

  return { range, totals, workshops, lines, operations, workers };
};
