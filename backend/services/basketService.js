import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import {
  createBasket,
  createTrace,
  findEmployee,
  findOperation,
  findOperationStandard,
  getBasketByIdOrCode,
  getTrackingSheet,
  listBaskets,
  moveBasket,
  nextBasketCode,
  updateBasketStatus
} from '../repositories/mesRepository.js';
import { mapBasket, mapTrace } from '../dto/mesDto.js';
import { listTraces } from '../repositories/mesRepository.js';

const validStatuses = new Set(['en_attente', 'en_cours', 'termine', 'bloque']);

export const normalizeBasketScanValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return raw;

  try {
    const parsed = JSON.parse(raw);
    return String(parsed.basketCode || parsed.code || parsed.barcodeValue || parsed.value || raw).trim();
  } catch {
    // Not a JSON QR payload.
  }

  try {
    const url = new URL(raw);
    return String(
      url.searchParams.get('basketCode') ||
      url.searchParams.get('code') ||
      url.searchParams.get('barcode') ||
      url.pathname.split('/').filter(Boolean).pop() ||
      raw
    ).trim();
  } catch {
    return raw;
  }
};

const employeeFullName = (employee) => {
  if (!employee) return null;
  return [employee.prenom, employee.nom].filter(Boolean).join(' ') || employee.nom || employee.prenom || null;
};

const resolveHourlyTarget = async ({ operationId, articleReference, color, size }) => {
  if (!operationId && !articleReference) return 0;
  const operation = operationId ? await findOperation(operationId) : null;
  const standard = await findOperationStandard({ operationId, articleReference, color, size });
  const samMinutes = Number(standard?.samMinutes || operation?.tempsMinutes || 0);
  if (samMinutes > 0) return Number((60 / samMinutes).toFixed(2));
  if (Number(operation?.objectifHeure) > 0) return Number(operation.objectifHeure);
  return 0;
};

export const createProductionBasket = async (payload) => {
  const basketCode = await nextBasketCode();
  const tracking = payload.trackingSheetId ? await getTrackingSheet(payload.trackingSheetId) : null;
  const sheet = tracking?.sheet || null;
  const employee = payload.employeeId ? await findEmployee(payload.employeeId) : null;
  const currentOperation = payload.currentOperationId ? await findOperation(payload.currentOperationId) : null;
  const nextOperation = payload.nextOperationId ? await findOperation(payload.nextOperationId) : null;

  const basketData = {
    ...payload,
    orderId: payload.orderId || sheet?.orderId || null,
    articleReference: payload.articleReference || sheet?.articleReference || null,
    articleDesignation: payload.articleDesignation || sheet?.articleDesignation || null,
    color: payload.color || sheet?.color || null,
    size: payload.size || sheet?.size || null,
    currentOperationName: payload.currentOperationName || currentOperation?.nom || null,
    nextOperationName: payload.nextOperationName || nextOperation?.nom || null
  };

  const desiredHourlyQuantity = await resolveHourlyTarget({
    operationId: basketData.currentOperationId,
    articleReference: basketData.articleReference,
    color: basketData.color,
    size: basketData.size
  });

  const qrPayload = JSON.stringify({
    type: 'production_basket',
    basketCode,
    trackingSheetId: basketData.trackingSheetId || null,
    orderId: basketData.orderId || null,
    articleReference: basketData.articleReference,
    articleDesignation: basketData.articleDesignation,
    size: basketData.size,
    color: basketData.color,
    currentOperation: basketData.currentOperationName,
    nextOperation: basketData.nextOperationName,
    quantity: Number(basketData.quantity || 0),
    employeeId: basketData.employeeId || null,
    employeeName: employeeFullName(employee),
    desiredHourlyQuantity
  });
  const basket = await createBasket({
    ...basketData,
    basketCode,
    barcodeValue: basketCode,
    qrPayload,
    status: payload.status || 'en_attente'
  });
  await createTrace({
    basketId: basket.id,
    trackingSheetId: basket.trackingSheetId,
    employeeId: basket.employeeId,
    operationId: basket.currentOperationId,
    operationName: basket.currentOperationName,
    quantity: basket.quantity,
    status: basket.status,
    note: 'Creation panier'
  });
  return mapBasket(basket);
};

export const getProductionBaskets = async (query) => {
  const rows = await listBaskets(query);
  return rows.map(mapBasket);
};

export const getBasketScan = async (code) => {
  const basket = await getBasketByIdOrCode(normalizeBasketScanValue(code));
  if (!basket) return null;
  const traces = await listTraces({ basketId: basket.id });
  return {
    basket: mapBasket(basket),
    history: traces.map(mapTrace)
  };
};

export const setBasketStatus = async ({ id, status, blockedReason, user }) => {
  if (!validStatuses.has(status)) throw new Error('Statut panier invalide');
  const basket = await updateBasketStatus({ id, status, blockedReason });
  if (!basket) return null;
  await createTrace({
    basketId: basket.id,
    trackingSheetId: basket.trackingSheetId,
    employeeId: basket.employeeId || user?.employeeId,
    operationId: basket.currentOperationId,
    operationName: basket.currentOperationName,
    quantity: basket.quantity,
    status,
    note: blockedReason || `Statut ${status}`
  });
  return mapBasket(basket);
};

export const moveProductionBasket = async ({ id, payload, user }) => {
  const basket = await moveBasket({ id, ...payload });
  if (!basket) return null;
  await createTrace({
    basketId: basket.id,
    trackingSheetId: basket.trackingSheetId,
    employeeId: basket.employeeId || user?.employeeId,
    operationId: basket.currentOperationId,
    operationName: basket.currentOperationName,
    quantity: payload.quantity || basket.quantity,
    status: basket.status,
    note: 'Mouvement panier'
  });
  return mapBasket(basket);
};

export const makeQrCode = async (code) => {
  const scan = await getBasketScan(code);
  if (!scan) return null;
  return QRCode.toDataURL(scan.basket.qrPayload || scan.basket.basketCode);
};

export const makeBarcodePng = async (code) => {
  const scan = await getBasketScan(code);
  if (!scan) return null;
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: scan.basket.barcodeValue || scan.basket.basketCode,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: 'center'
  });
};
