import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { getByProduction, printJetons } from '../controllers/jetonController.js';
const router = Router();
router.get('/:productionId', auth(), getByProduction);
router.post('/print', auth(), printJetons);
export default router;
