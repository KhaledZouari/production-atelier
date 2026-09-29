import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { list, getOne, create, update, addFlow, addShipment, dailyFlows } from '../controllers/ordersController.js';

const router = Router();

router.get('/', auth(), list);
router.get('/flows/daily', auth(), dailyFlows);
router.get('/:id', auth(), getOne);
router.post('/', auth(['admin']), create);
router.put('/:id', auth(['admin']), update);
router.post('/:id/flows', auth(['admin','chef_chaine']), addFlow);
router.post('/:id/shipments', auth(['admin']), addShipment);
router.get('/flows/daily', auth(), dailyFlows);

export default router;
