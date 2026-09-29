import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.js';
import opRoutes from './routes/operations.js';
import empRoutes from './routes/employees.js';
import prodRoutes from './routes/productions.js';
import jetonRoutes from './routes/jetons.js';
import reportRoutes from './routes/reports.js';
import attendanceRoutes from './routes/attendance.js';
import orderRoutes from './routes/orders.js';
import mesRoutes from './routes/mes.js';
import { errorHandler } from './middleware/errorHandler.js';
import buildSwaggerSpec from './swagger.js';
import { ensureMesSchema } from './database/mesSchema.js';
import { ensureOperationSchema } from './database/operationSchema.js';

// Charge les variables d'env depuis backend/.env (même si lancé depuis ailleurs)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 4000;
const swaggerSpec = buildSwaggerSpec(port);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/', (_req, res) => res.redirect('/api/docs'));
app.use('/api/auth', authRoutes);
app.use('/api/operations', opRoutes);
app.use('/api/employees', empRoutes);
app.use('/api/productions', prodRoutes);
app.use('/api/jetons', jetonRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/mes', mesRoutes);
app.use(errorHandler);
connectDB()
  .then(async () => {
    await ensureOperationSchema();
    await ensureMesSchema();
    app.listen(port, () => console.log(`API on ${port}`));
  })
  .catch((err) => {
    console.error('Unable to start server, database connection failed.', err);
    process.exit(1);
  });
