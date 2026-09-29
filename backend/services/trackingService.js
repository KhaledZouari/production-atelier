import {
  addTrackingOperation,
  createTrackingSheet,
  createTrace,
  getTrackingSheet,
  listTrackingSheets
} from '../repositories/mesRepository.js';
import { mapTrackingSheet } from '../dto/mesDto.js';

const defaultFlow = ['Coupe', 'Assemblage', 'Surjet', 'Repassage', 'Controle', 'Emballage'];

export const createProductionTrackingSheet = async (payload) => {
  const sheetNumber = payload.sheetNumber || `FS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const sheet = await createTrackingSheet({
    ...payload,
    sheetNumber,
    sheetDate: payload.sheetDate || new Date().toISOString().split('T')[0]
  });

  const operations = payload.operations?.length ? payload.operations : defaultFlow.map((operationName, index) => ({ operationName, sequenceNo: index + 1 }));
  for (const op of operations) {
    await addTrackingOperation({
      trackingSheetId: sheet.id,
      operationId: op.operationId,
      operationName: op.operationName,
      sequenceNo: op.sequenceNo,
      quantity: op.quantity || 0,
      status: op.status || 'en_attente'
    });
  }

  await createTrace({
    trackingSheetId: sheet.id,
    quantity: sheet.orderQuantity,
    status: sheet.status,
    note: 'Creation fiche suiveuse'
  });

  return getProductionTrackingSheet(sheet.id);
};

export const getProductionTrackingSheets = async () => {
  const rows = await listTrackingSheets();
  return rows.map(mapTrackingSheet);
};

export const getProductionTrackingSheet = async (id) => {
  const data = await getTrackingSheet(id);
  if (!data) return null;
  return {
    ...mapTrackingSheet(data.sheet),
    operations: data.operations
  };
};

export const addProductionTrackingOperation = async ({ trackingSheetId, payload }) => {
  const op = await addTrackingOperation({ trackingSheetId, ...payload });
  await createTrace({
    trackingSheetId,
    basketId: payload.basketId,
    employeeId: payload.employeeId,
    operationId: payload.operationId,
    operationName: payload.operationName,
    quantity: payload.quantity,
    status: payload.status || 'en_cours',
    note: 'Operation fiche suiveuse'
  });
  return op;
};
