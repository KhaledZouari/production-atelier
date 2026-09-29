import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { daily } from '../controllers/reportController.js';
const router = Router();
router.get('/daily', auth(), daily);
export default router;
