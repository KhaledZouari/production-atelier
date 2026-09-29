import {
  getCollectiveEfficiency,
  getIndividualHistory,
  getRankings,
  recordIndividualEfficiency
} from '../services/efficiencyService.js';
import {
  createProductionBasket,
  getBasketScan,
  getProductionBaskets,
  makeBarcodePng,
  makeQrCode,
  moveProductionBasket,
  setBasketStatus
} from '../services/basketService.js';
import {
  addProductionTrackingOperation,
  createProductionTrackingSheet,
  getProductionTrackingSheet,
  getProductionTrackingSheets
} from '../services/trackingService.js';
import { listTraces } from '../repositories/mesRepository.js';
import { mapTrace } from '../dto/mesDto.js';
import { ackMesAlert, evaluateMesAlerts, getMesAlerts } from '../services/alertService.js';
import { getMesDailySummary, getMesDashboardCharts, getMesDashboardKpis } from '../services/dashboardService.js';
import { getArticleDailyCapacity, getCalendarPresence } from '../services/capacityService.js';

const handleNotFound = (res, message) => res.status(404).json({ message });

export const createEfficiency = async (req, res, next) => {
  try {
    const entry = await recordIndividualEfficiency(req.body, req.user);
    res.status(201).json(entry);
  } catch (e) {
    next(e);
  }
};

export const individualEfficiency = async (req, res, next) => {
  try {
    const rows = await getIndividualHistory({ ...req.query, employeeId: req.query.employeeId || req.params.employeeId });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const efficiencyRanking = async (req, res, next) => {
  try {
    const rows = await getRankings({ ...req.query, groupBy: req.params.groupBy || req.query.groupBy || 'employee' });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const collectiveEfficiency = async (req, res, next) => {
  try {
    res.json(await getCollectiveEfficiency(req.query));
  } catch (e) {
    next(e);
  }
};

export const calendarPresence = async (req, res, next) => {
  try {
    res.json(getCalendarPresence(req.query.date));
  } catch (e) {
    next(e);
  }
};

export const articleCapacity = async (req, res, next) => {
  try {
    res.json(await getArticleDailyCapacity({
      date: req.query.date,
      trackingSheetId: req.query.trackingSheetId,
      defaultWorkers: req.query.defaultWorkers
    }));
  } catch (e) {
    next(e);
  }
};

export const dashboardKpis = async (req, res, next) => {
  try {
    res.json(await getMesDashboardKpis(req.query));
  } catch (e) {
    next(e);
  }
};

export const dashboardCharts = async (req, res, next) => {
  try {
    res.json(await getMesDashboardCharts(req.query));
  } catch (e) {
    next(e);
  }
};

export const dashboardDailySummary = async (req, res, next) => {
  try {
    res.json(await getMesDailySummary(req.query));
  } catch (e) {
    next(e);
  }
};

export const createTrackingSheet = async (req, res, next) => {
  try {
    res.status(201).json(await createProductionTrackingSheet(req.body));
  } catch (e) {
    next(e);
  }
};

export const listTrackingSheets = async (_req, res, next) => {
  try {
    res.json(await getProductionTrackingSheets());
  } catch (e) {
    next(e);
  }
};

export const getTrackingSheet = async (req, res, next) => {
  try {
    const sheet = await getProductionTrackingSheet(req.params.id);
    if (!sheet) return handleNotFound(res, 'Fiche suiveuse non trouvee');
    res.json(sheet);
  } catch (e) {
    next(e);
  }
};

export const addTrackingSheetOperation = async (req, res, next) => {
  try {
    res.status(201).json(await addProductionTrackingOperation({ trackingSheetId: req.params.id, payload: req.body }));
  } catch (e) {
    next(e);
  }
};

export const createBasket = async (req, res, next) => {
  try {
    res.status(201).json(await createProductionBasket(req.body));
  } catch (e) {
    next(e);
  }
};

export const listBaskets = async (req, res, next) => {
  try {
    res.json(await getProductionBaskets(req.query));
  } catch (e) {
    next(e);
  }
};

export const getBasket = async (req, res, next) => {
  try {
    const scan = await getBasketScan(req.params.id);
    if (!scan) return handleNotFound(res, 'Panier non trouve');
    res.json(scan.basket);
  } catch (e) {
    next(e);
  }
};

export const scanBasket = async (req, res, next) => {
  try {
    const scan = await getBasketScan(req.params.code);
    if (!scan) return handleNotFound(res, 'Panier non trouve');
    res.json(scan);
  } catch (e) {
    next(e);
  }
};

export const updateBasketStatus = async (req, res, next) => {
  try {
    const basket = await setBasketStatus({ id: req.params.id, status: req.body.status, blockedReason: req.body.blockedReason, user: req.user });
    if (!basket) return handleNotFound(res, 'Panier non trouve');
    res.json(basket);
  } catch (e) {
    next(e);
  }
};

export const moveBasket = async (req, res, next) => {
  try {
    const basket = await moveProductionBasket({ id: req.params.id, payload: req.body, user: req.user });
    if (!basket) return handleNotFound(res, 'Panier non trouve');
    res.json(basket);
  } catch (e) {
    next(e);
  }
};

export const basketQr = async (req, res, next) => {
  try {
    const qr = await makeQrCode(req.params.code);
    if (!qr) return handleNotFound(res, 'Panier non trouve');
    res.json({ qr });
  } catch (e) {
    next(e);
  }
};

export const basketBarcode = async (req, res, next) => {
  try {
    const png = await makeBarcodePng(req.params.code);
    if (!png) return handleNotFound(res, 'Panier non trouve');
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    next(e);
  }
};

export const traces = async (req, res, next) => {
  try {
    const rows = await listTraces(req.query);
    res.json(rows.map(mapTrace));
  } catch (e) {
    next(e);
  }
};

export const basketTraces = async (req, res, next) => {
  try {
    const rows = await listTraces({ basketId: req.params.basketId });
    res.json(rows.map(mapTrace));
  } catch (e) {
    next(e);
  }
};

export const listAlerts = async (req, res, next) => {
  try {
    res.json(await getMesAlerts(req.query.status || 'open'));
  } catch (e) {
    next(e);
  }
};

export const evaluateAlerts = async (req, res, next) => {
  try {
    res.json(await evaluateMesAlerts(req.body || {}));
  } catch (e) {
    next(e);
  }
};

export const acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await ackMesAlert({ id: req.params.id, userId: req.user?.id });
    if (!alert) return handleNotFound(res, 'Alerte non trouvee');
    res.json(alert);
  } catch (e) {
    next(e);
  }
};
