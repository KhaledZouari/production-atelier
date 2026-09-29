import { body } from 'express-validator';
export const productionValidators = [
  body('employeeId').isInt({ min: 1 }),
  body('operationId').isInt({ min: 1 }),
  body('chaine').notEmpty(),
  body('date').isISO8601(),
  body('heureDebut').matches(/^\d{2}:\d{2}$/),
  body('heureFin').matches(/^\d{2}:\d{2}$/),
  body('nbLots').isInt({ min: 1 })
];
