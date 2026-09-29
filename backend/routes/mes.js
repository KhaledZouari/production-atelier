import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/mesController.js';

const router = Router();

router.get('/dashboard/kpis', auth(), ctrl.dashboardKpis);
router.get('/dashboard/charts', auth(), ctrl.dashboardCharts);
router.get('/dashboard/daily-summary', auth(), ctrl.dashboardDailySummary);

router.post('/efficiency/individual', auth(['admin', 'chef_chaine']), ctrl.createEfficiency);
router.get('/efficiency/individual', auth(), ctrl.individualEfficiency);
router.get('/efficiency/individual/:employeeId/history', auth(), ctrl.individualEfficiency);
router.get('/efficiency/collective', auth(), ctrl.collectiveEfficiency);
router.get('/efficiency/ranking/:groupBy', auth(), ctrl.efficiencyRanking);
router.get('/calendar/presence', auth(), ctrl.calendarPresence);
router.get('/capacity/article', auth(), ctrl.articleCapacity);

router.post('/tracking-sheets', auth(['admin', 'chef_chaine']), ctrl.createTrackingSheet);
router.get('/tracking-sheets', auth(), ctrl.listTrackingSheets);
router.get('/tracking-sheets/:id', auth(), ctrl.getTrackingSheet);
router.post('/tracking-sheets/:id/operations', auth(['admin', 'chef_chaine']), ctrl.addTrackingSheetOperation);

router.post('/baskets', auth(['admin', 'chef_chaine']), ctrl.createBasket);
router.get('/baskets', auth(), ctrl.listBaskets);
router.get('/baskets/scan/:code', auth(), ctrl.scanBasket);
router.get('/baskets/:id', auth(), ctrl.getBasket);
router.patch('/baskets/:id/status', auth(['admin', 'chef_chaine']), ctrl.updateBasketStatus);
router.post('/baskets/:id/move', auth(['admin', 'chef_chaine']), ctrl.moveBasket);
router.get('/baskets/:code/qr', auth(), ctrl.basketQr);
router.get('/baskets/:code/barcode', auth(), ctrl.basketBarcode);

router.get('/traces', auth(), ctrl.traces);
router.get('/traces/basket/:basketId', auth(), ctrl.basketTraces);

router.get('/alerts', auth(), ctrl.listAlerts);
router.post('/alerts/evaluate', auth(['admin', 'chef_chaine']), ctrl.evaluateAlerts);
router.patch('/alerts/:id/ack', auth(['admin', 'chef_chaine']), ctrl.acknowledgeAlert);

export default router;
