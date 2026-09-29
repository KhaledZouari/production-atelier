import assert from 'assert';
import { validateTimeRange, computeProductionMetrics, computeResourceNeed } from '../utils/calculations.js';
import {
  computeDailyArticleCapacity,
  computeEfficiency,
  computeOperationMetrics,
  getScheduledPresenceMinutes,
  parseWorkedMinutes,
  resolveWorkedMinutes
} from '../utils/mesCalculations.js';
import { normalizeBasketScanValue } from '../services/basketService.js';

const hours = validateTimeRange('22:00', '02:00', '2024-01-01');
assert(hours === 4, 'Expected 4 hours for overnight shift');

const { totalPieces, piecesParHeure, rendement } = computeProductionMetrics({
  tailleLot: 20,
  nbLots: 2,
  objectifHeure: 50,
  heuresTravail: 4
});

assert(totalPieces === 40, 'totalPieces should be 40');
assert(Math.abs(piecesParHeure - 10) < 1e-6, 'piecesParHeure should be 10');
assert(Math.abs(rendement - 20) < 1e-6, 'rendement should be 20%');

const resourceNeed = computeResourceNeed({
  tempsMinutes: 0.23,
  productionJour: 250,
  tempsPresenceMinutes: 510
});
assert(Math.abs(resourceNeed.besoinRessource - 0.1127) < 1e-4, 'Resource need should match the TES28026 spreadsheet formula');
assert(resourceNeed.objectifHeure === 260.87, 'Hourly target should be derived from standard minutes');

const workedMinutes = parseWorkedMinutes('2026-01-01', '08:00', '10:00');
assert(workedMinutes === 120, 'MES worked minutes should be 120');
assert(getScheduledPresenceMinutes('2026-06-12') === 510, 'Normal Friday presence should be 510 minutes');
assert(getScheduledPresenceMinutes('2026-06-13') === 300, 'Saturday presence should be 300 minutes');
assert(getScheduledPresenceMinutes('2026-07-01') === 420, 'July weekday presence should be 420 minutes');
assert(getScheduledPresenceMinutes('2026-06-14') === 0, 'Sunday presence should be 0 minutes');
assert(resolveWorkedMinutes({ entryDate: '2026-06-12' }) === 510, 'Missing time range should use scheduled presence');

const mesEfficiency = computeEfficiency({
  quantityProduced: 100,
  samMinutes: 1.2,
  realWorkedMinutes: 120
});
assert(mesEfficiency === 100, 'MES efficiency should be 100%');

const hourlyMetrics = computeOperationMetrics({
  quantityProduced: 54,
  samMinutes: 1,
  realWorkedMinutes: 60
});
assert(hourlyMetrics.hourlyTarget === 60, 'Hourly target should be 60 pieces');
assert(hourlyMetrics.targetPieces === 60, 'Target pieces should be 60');
assert(hourlyMetrics.variancePieces === -6, 'Variance should be -6 pieces');
assert(hourlyMetrics.efficiency === 90, 'Efficiency should be 90%');
assert(hourlyMetrics.lostMinutes === 6, 'Lost minutes should be 6');

const articleCapacity = computeDailyArticleCapacity({
  presenceMinutes: 510,
  operations: [
    { operationId: 1, operationName: 'A', samMinutes: 1 },
    { operationId: 2, operationName: 'B', samMinutes: 2 }
  ]
});
assert(articleCapacity.bottleneckCapacity === 255, 'Finished capacity should be the bottleneck operation');

assert(normalizeBasketScanValue('PAN-2026-00001') === 'PAN-2026-00001', 'Plain basket code scan should stay unchanged');
assert(normalizeBasketScanValue('{"type":"production_basket","code":"PAN-2026-00002"}') === 'PAN-2026-00002', 'Legacy QR code payload should resolve to code');
assert(normalizeBasketScanValue('{"type":"production_basket","basketCode":"PAN-2026-00003"}') === 'PAN-2026-00003', 'Rich QR payload should resolve to basketCode');

console.log('calculations OK');
