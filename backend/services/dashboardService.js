import {
  aggregateEfficiency,
  basketStatusSummary,
  chartProductionByDay,
  dashboardKpis,
  lossCauses,
  wipByOperation
} from '../repositories/mesRepository.js';
import { resolvePeriod } from '../utils/mesCalculations.js';

const number = (value) => Number(Number(value || 0).toFixed(2));

export const getMesDashboardKpis = async ({ period = 'daily', date, startDate, endDate }) => {
  const range = startDate || endDate ? { startDate, endDate } : resolvePeriod(period, date);
  const kpis = await dashboardKpis(range);
  const workers = await aggregateEfficiency({ ...range, groupBy: 'employee' });
  const bestWorker = workers[0] || null;
  return {
    range,
    production: Number(kpis.totalPieces || 0),
    workersCount: Number(kpis.workersCount || 0),
    totalWorkedMinutes: Number(kpis.totalWorkedMinutes || 0),
    theoreticalMinutes: number(kpis.theoreticalMinutes),
    productiveMinutes: number(kpis.productiveMinutes),
    lostMinutes: number(kpis.lostMinutes),
    targetPieces: number(kpis.targetPieces),
    variancePieces: number(kpis.variancePieces),
    averageEfficiency: Number(kpis.averageEfficiency || 0),
    oee: Number(kpis.averageEfficiency || 0),
    blockedBaskets: Number(kpis.blockedBaskets || 0),
    inProgressBaskets: Number(kpis.inProgressBaskets || 0),
    bestWorker
  };
};

export const getMesDashboardCharts = async ({ period = 'weekly', date, startDate, endDate }) => {
  const range = startDate || endDate ? { startDate, endDate } : resolvePeriod(period, date);
  const [productionCurve, workshops, lines, workers, operations] = await Promise.all([
    chartProductionByDay(range),
    aggregateEfficiency({ ...range, groupBy: 'workshop' }),
    aggregateEfficiency({ ...range, groupBy: 'line' }),
    aggregateEfficiency({ ...range, groupBy: 'employee' }),
    aggregateEfficiency({ ...range, groupBy: 'operation' })
  ]);
  return { range, productionCurve, workshops, lines, workers, operations };
};

export const getMesDailySummary = async ({ period = 'daily', date, startDate, endDate }) => {
  const range = startDate || endDate ? { startDate, endDate } : resolvePeriod(period, date);
  const [kpis, statusRows, wipRows, workers, operations, losses] = await Promise.all([
    dashboardKpis(range),
    basketStatusSummary(),
    wipByOperation(),
    aggregateEfficiency({ ...range, groupBy: 'employee' }),
    aggregateEfficiency({ ...range, groupBy: 'operation' }),
    lossCauses(range)
  ]);

  const status = statusRows.reduce((acc, row) => {
    acc[row.status] = {
      basketsCount: Number(row.basketsCount || 0),
      pieces: Number(row.pieces || 0)
    };
    return acc;
  }, {});

  return {
    range,
    finishedPieces: status.termine?.pieces || 0,
    semiFinishedPieces: (status.en_attente?.pieces || 0) + (status.en_cours?.pieces || 0),
    blockedPieces: status.bloque?.pieces || 0,
    totalPieces: Number(kpis.totalPieces || 0),
    targetPieces: number(kpis.targetPieces),
    variancePieces: number(kpis.variancePieces),
    totalWorkedMinutes: number(kpis.totalWorkedMinutes),
    productiveMinutes: number(kpis.productiveMinutes),
    lostMinutes: number(kpis.lostMinutes),
    atelierEfficiency: number(kpis.averageEfficiency),
    trs: number(kpis.averageEfficiency),
    topWorkers: workers.slice(0, 5),
    criticalOperations: operations
      .slice()
      .sort((a, b) => Number(a.efficiency || 0) - Number(b.efficiency || 0))
      .slice(0, 5),
    wipByOperation: wipRows.map((row) => ({
      operationId: row.operationId,
      operationName: row.operationName,
      status: row.status,
      basketsCount: Number(row.basketsCount || 0),
      pieces: Number(row.pieces || 0)
    })),
    lossCauses: losses.map((row) => ({
      cause: row.cause,
      entriesCount: Number(row.entriesCount || 0),
      lostMinutes: number(row.lostMinutes),
      pieces: Number(row.pieces || 0)
    }))
  };
};
