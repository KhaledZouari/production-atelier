import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, pool } from '../config/db.js';
import { ensureMesSchema } from '../database/mesSchema.js';
import { createProductionTrackingSheet } from '../services/trackingService.js';
import { createProductionBasket } from '../services/basketService.js';
import { recordIndividualEfficiency } from '../services/efficiencyService.js';
import { evaluateMesAlerts } from '../services/alertService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const today = new Date('2026-06-09T08:00:00');
const isoDate = (offset) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offset);
  return date.toISOString().split('T')[0];
};

const pick = (items, index) => items[index % items.length];

const upsertWorkshop = async ({ code, name }) => {
  const result = await pool
    .request()
    .input('code', code)
    .input('name', name)
    .query(`
      MERGE MesWorkshops AS target
      USING (SELECT @code AS code, @name AS name) AS src
      ON target.code = src.code
      WHEN MATCHED THEN UPDATE SET name=src.name, active=1
      WHEN NOT MATCHED THEN INSERT (code, name, active) VALUES (src.code, src.name, 1);
      SELECT * FROM MesWorkshops WHERE code=@code
    `);
  return result.recordset[0];
};

const upsertLine = async ({ workshopId, code, name, teamName }) => {
  const result = await pool
    .request()
    .input('workshopId', workshopId)
    .input('code', code)
    .input('name', name)
    .input('teamName', teamName)
    .query(`
      MERGE MesProductionLines AS target
      USING (SELECT @code AS code, @name AS name) AS src
      ON target.code = src.code
      WHEN MATCHED THEN UPDATE SET workshopId=@workshopId, name=@name, teamName=@teamName, active=1
      WHEN NOT MATCHED THEN INSERT (workshopId, code, name, teamName, active) VALUES (@workshopId, @code, @name, @teamName, 1);
      SELECT * FROM MesProductionLines WHERE code=@code
    `);
  return result.recordset[0];
};

const cleanPreviousDemo = async () => {
  await pool.query(`
    DELETE FROM MesAlerts WHERE entityType IN ('basket','tracking_sheet','employee') AND (message LIKE '%DEMO-MES-%' OR title LIKE '%DEMO%');
    DELETE FROM MesProductionTraces WHERE trackingSheetId IN (SELECT id FROM MesTrackingSheets WHERE articleReference LIKE 'DEMO-MES-%')
       OR basketId IN (SELECT id FROM MesProductionBaskets WHERE articleReference LIKE 'DEMO-MES-%');
    DELETE FROM MesProductionEntries WHERE trackingSheetId IN (SELECT id FROM MesTrackingSheets WHERE articleReference LIKE 'DEMO-MES-%')
       OR basketId IN (SELECT id FROM MesProductionBaskets WHERE articleReference LIKE 'DEMO-MES-%');
    DELETE FROM MesTrackingSheetOperations WHERE trackingSheetId IN (SELECT id FROM MesTrackingSheets WHERE articleReference LIKE 'DEMO-MES-%');
    DELETE FROM MesProductionBaskets WHERE articleReference LIKE 'DEMO-MES-%';
    DELETE FROM MesTrackingSheets WHERE articleReference LIKE 'DEMO-MES-%';
    DELETE FROM MesOperationStandards WHERE articleReference LIKE 'DEMO-MES-%';
  `);
};

const seedStandards = async (operations) => {
  const samByCode = {
    OP01: 1.2,
    OP02: 1.0,
    OP03: 2.1,
    OP04: 1.7,
    OP05: 1.3,
    OP06: 0.9
  };
  for (const operation of operations) {
    await pool
      .request()
      .input('operationId', operation.id)
      .input('articleReference', 'DEMO-MES-TSHIRT')
      .input('articleDesignation', 'T-Shirt demo export')
      .input('samMinutes', samByCode[operation.code] || 1.2)
      .query(`
        INSERT INTO MesOperationStandards (operationId, articleReference, articleDesignation, samMinutes, active)
        VALUES (@operationId, @articleReference, @articleDesignation, @samMinutes, 1)
      `);
  }
};

const main = async () => {
  await connectDB();
  await ensureMesSchema();
  await cleanPreviousDemo();

  const employees = (await pool.request().query('SELECT TOP 12 * FROM Employees WHERE active=1 ORDER BY id ASC')).recordset;
  const operations = (await pool.request().query('SELECT TOP 6 * FROM Operations WHERE active=1 ORDER BY id ASC')).recordset;
  if (employees.length < 4 || operations.length < 3) {
    throw new Error('Demo MES impossible: il faut au moins 4 ouvrieres actives et 3 operations actives');
  }

  const assembly = await upsertWorkshop({ code: 'DEMO-AT-ASM', name: 'Atelier Assemblage Demo' });
  const finishing = await upsertWorkshop({ code: 'DEMO-AT-FIN', name: 'Atelier Finition Demo' });
  const lines = [
    await upsertLine({ workshopId: assembly.id, code: 'DEMO-LIG-A', name: 'Ligne A Demo', teamName: 'Equipe Matin' }),
    await upsertLine({ workshopId: assembly.id, code: 'DEMO-LIG-B', name: 'Ligne B Demo', teamName: 'Equipe Matin' }),
    await upsertLine({ workshopId: finishing.id, code: 'DEMO-LIG-C', name: 'Ligne C Finition Demo', teamName: 'Equipe Apres-midi' })
  ];

  await seedStandards(operations);

  const orders = [
    { ref: 'DEMO-MES-TSHIRT', designation: 'T-Shirt demo export', client: 'Client Nord', color: 'Bleu', size: 'M', qty: 420 },
    { ref: 'DEMO-MES-POLO', designation: 'Polo demo premium', client: 'Client Sud', color: 'Noir', size: 'L', qty: 360 },
    { ref: 'DEMO-MES-SWEAT', designation: 'Sweat demo hiver', client: 'Client Est', color: 'Gris', size: 'XL', qty: 300 }
  ];

  const created = { sheets: 0, baskets: 0, entries: 0, blocked: 0 };

  for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
    const order = orders[orderIndex];
    const sheet = await createProductionTrackingSheet({
      sheetNumber: `DEMO-MES-FS-${orderIndex + 1}`,
      sheetDate: isoDate(-orderIndex),
      articleReference: order.ref,
      articleDesignation: order.designation,
      client: order.client,
      color: order.color,
      size: order.size,
      orderQuantity: order.qty,
      operations: operations.slice(0, 5).map((operation, index) => ({
        operationId: operation.id,
        operationName: operation.nom,
        sequenceNo: index + 1
      }))
    });
    created.sheets += 1;

    for (let dayOffset = -5; dayOffset <= 0; dayOffset++) {
      for (let opIndex = 0; opIndex < Math.min(operations.length, 5); opIndex++) {
        const operation = operations[opIndex];
        const employee = pick(employees, orderIndex * 3 + opIndex + dayOffset + 12);
        const line = pick(lines, opIndex + orderIndex);
        const workshop = line.workshopId === assembly.id ? assembly : finishing;
        const plannedQty = 18 + ((orderIndex + opIndex + Math.abs(dayOffset)) % 5) * 4;
        const sam = Number((operation.tempsMinutes || (60 / operation.objectifHeure)).toFixed(2));
        const efficiencyTarget = [52, 68, 82, 95, 108, 122][(orderIndex + opIndex + Math.abs(dayOffset)) % 6];
        const workedMinutes = Math.round((plannedQty * sam * 100) / efficiencyTarget);
        const startHour = 8 + (opIndex % 3);
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const end = new Date(`2026-06-09T${startTime}:00`);
        end.setMinutes(end.getMinutes() + workedMinutes);
        const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

        const basket = await createProductionBasket({
          trackingSheetId: sheet._id,
          articleReference: order.ref,
          articleDesignation: order.designation,
          quantity: plannedQty,
          currentOperationId: operation.id,
          currentOperationName: operation.nom,
          nextOperationId: operations[opIndex + 1]?.id || null,
          nextOperationName: operations[opIndex + 1]?.nom || null,
          employeeId: employee.id,
          workshopId: workshop.id,
          lineId: line.id,
          workshopName: workshop.name,
          lineName: line.name,
          status: 'en_attente'
        });
        created.baskets += 1;

        await recordIndividualEfficiency(
          {
            entryDate: isoDate(dayOffset),
            basketId: basket._id,
            startTime,
            endTime,
            samMinutes: sam,
            quantityProduced: plannedQty
          },
          { id: 1 }
        );
        created.entries += 1;
      }
    }
  }

  const blockedBasket = await createProductionBasket({
    trackingSheetId: null,
    articleReference: 'DEMO-MES-BLOCK',
    articleDesignation: 'Panier demo bloque',
    quantity: 24,
    currentOperationId: operations[0].id,
    currentOperationName: operations[0].nom,
    employeeId: employees[0].id,
    workshopId: assembly.id,
    lineId: lines[0].id,
    workshopName: assembly.name,
    lineName: lines[0].name,
    status: 'bloque'
  });
  await pool.request().input('id', blockedBasket._id).query("UPDATE MesProductionBaskets SET blockedReason='Demo: attente pieces coupe' WHERE id=@id");
  created.blocked += 1;

  const alerts = await evaluateMesAlerts({ efficiencyThreshold: 70, waitingHours: 1, date: today });
  const kpis = (await pool.request().query(`
    SELECT
      SUM(quantityProduced) AS totalPieces,
      COUNT(DISTINCT employeeId) AS workersCount,
      ROUND((SUM(quantityProduced * samMinutes) / NULLIF(SUM(realWorkedMinutes), 0)) * 100, 2) AS efficiency
    FROM MesProductionEntries
    WHERE entryDate = '2026-06-09'
  `)).recordset[0];

  console.log('MES demo seed done:', {
    ...created,
    alerts: alerts.length,
    todayPieces: kpis.totalPieces,
    todayWorkers: kpis.workersCount,
    todayEfficiency: kpis.efficiency
  });
  process.exit(0);
};

main().catch((err) => {
  console.error('MES demo seed failed', err);
  process.exit(1);
});
