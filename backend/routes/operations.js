import { Router } from 'express';
import * as ctrl from '../controllers/operationController.js';
import { auth } from '../middleware/auth.js';
const router = Router();
router.get('/', auth(), ctrl.list);
router.post('/', auth(['admin']), ctrl.create);
router.put('/:id', auth(['admin']), ctrl.update);
router.delete('/:id', auth(['admin']), ctrl.remove);
export default router;
