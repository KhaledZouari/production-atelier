const toIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value;
};

const roundNumber = (value) => Number(Number(value || 0).toFixed(2));

const productionMetrics = (row) => {
  const samMinutes = Number(row.samMinutes || 0);
  const quantityProduced = Number(row.quantityProduced || 0);
  const realWorkedMinutes = Number(row.realWorkedMinutes || 0);
  if (samMinutes <= 0 || realWorkedMinutes <= 0) {
    return {
      hourlyTarget: 0,
      targetPieces: 0,
      theoreticalMinutes: 0,
      productiveMinutes: 0,
      lostMinutes: 0,
      variancePieces: 0
    };
  }
  const theoreticalMinutes = quantityProduced * samMinutes;
  const targetPieces = realWorkedMinutes / samMinutes;
  return {
    hourlyTarget: roundNumber(60 / samMinutes),
    targetPieces: roundNumber(targetPieces),
    theoreticalMinutes: roundNumber(theoreticalMinutes),
    productiveMinutes: roundNumber(Math.min(theoreticalMinutes, realWorkedMinutes)),
    lostMinutes: roundNumber(Math.max(realWorkedMinutes - theoreticalMinutes, 0)),
    variancePieces: roundNumber(quantityProduced - targetPieces)
  };
};

export const mapEfficiencyEntry = (row) => ({
  _id: row.id,
  employeeId: row.employeeId,
  employeeCode: row.employeeCode,
  employeeName: row.employeeName,
  operationId: row.operationId,
  operationCode: row.operationCode,
  operationName: row.operationName,
  workshopId: row.workshopId,
  workshopName: row.workshopName,
  lineId: row.lineId,
  lineName: row.lineName,
  entryDate: toIsoDate(row.entryDate),
  startTime: row.startTime,
  endTime: row.endTime,
  samMinutes: Number(row.samMinutes || 0),
  quantityProduced: Number(row.quantityProduced || 0),
  realWorkedMinutes: Number(row.realWorkedMinutes || 0),
  efficiency: Number(row.efficiency || 0),
  ...productionMetrics(row),
  createdAt: row.createdAt
});

export const mapBasket = (row) => ({
  _id: row.id,
  basketCode: row.basketCode,
  barcodeValue: row.barcodeValue,
  qrPayload: row.qrPayload,
  trackingSheetId: row.trackingSheetId,
  orderId: row.orderId,
  articleReference: row.articleReference,
  articleDesignation: row.articleDesignation,
  color: row.color,
  size: row.size,
  quantity: Number(row.quantity || 0),
  currentOperationId: row.currentOperationId,
  currentOperationName: row.currentOperationName,
  nextOperationId: row.nextOperationId,
  nextOperationName: row.nextOperationName,
  employeeId: row.employeeId,
  employeeName: row.employeeName,
  workshopId: row.workshopId,
  lineId: row.lineId,
  workshopName: row.workshopName,
  lineName: row.lineName,
  createdAt: row.createdAt,
  status: row.status,
  blockedReason: row.blockedReason
});

export const mapTrackingSheet = (row) => ({
  _id: row.id,
  sheetNumber: row.sheetNumber,
  sheetDate: toIsoDate(row.sheetDate),
  orderId: row.orderId,
  articleReference: row.articleReference,
  articleDesignation: row.articleDesignation,
  client: row.client,
  color: row.color,
  size: row.size,
  orderQuantity: Number(row.orderQuantity || 0),
  producedQuantity: Number(row.producedQuantity || 0),
  status: row.status,
  createdAt: row.createdAt
});

export const mapTrace = (row) => ({
  _id: row.id,
  basketId: row.basketId,
  trackingSheetId: row.trackingSheetId,
  productionEntryId: row.productionEntryId,
  employeeId: row.employeeId,
  employeeName: row.employeeName,
  operationId: row.operationId,
  operationName: row.operationName,
  traceDate: toIsoDate(row.traceDate),
  traceTime: row.traceTime,
  quantity: Number(row.quantity || 0),
  status: row.status,
  note: row.note
});

export const mapAlert = (row) => ({
  _id: row.id,
  alertType: row.alertType,
  severity: row.severity,
  title: row.title,
  message: row.message,
  entityType: row.entityType,
  entityId: row.entityId,
  thresholdValue: row.thresholdValue === null ? null : Number(row.thresholdValue),
  actualValue: row.actualValue === null ? null : Number(row.actualValue),
  status: row.status,
  createdAt: row.createdAt,
  acknowledgedAt: row.acknowledgedAt,
  acknowledgedBy: row.acknowledgedBy
});
