import {
  aggregateEfficiency,
  insertAlertIfNew,
  listAlerts,
  listBaskets,
  listOpenTrackingSheets,
  acknowledgeAlert
} from '../repositories/mesRepository.js';
import { mapAlert } from '../dto/mesDto.js';
import { resolvePeriod } from '../utils/mesCalculations.js';

export const evaluateMesAlerts = async ({ efficiencyThreshold = 60, waitingHours = 8, date = new Date() } = {}) => {
  const range = resolvePeriod('daily', date);
  const workers = await aggregateEfficiency({ ...range, groupBy: 'employee' });
  const created = [];

  for (const worker of workers) {
    if (Number(worker.efficiency || 0) < Number(efficiencyThreshold)) {
      const alert = await insertAlertIfNew({
        alertType: 'low_efficiency',
        severity: 'warning',
        title: 'Rendement inferieur au seuil',
        message: `${worker.label} est a ${worker.efficiency}% sur la periode`,
        entityType: 'employee',
        entityId: worker.id,
        thresholdValue: efficiencyThreshold,
        actualValue: worker.efficiency
      });
      if (alert) created.push(mapAlert(alert));
    }
  }

  const blocked = await listBaskets({ status: 'bloque' });
  for (const basket of blocked) {
    const alert = await insertAlertIfNew({
      alertType: 'blocked_basket',
      severity: 'critical',
      title: 'Panier bloque',
      message: `${basket.basketCode} est bloque${basket.blockedReason ? `: ${basket.blockedReason}` : ''}`,
      entityType: 'basket',
      entityId: basket.id
    });
    if (alert) created.push(mapAlert(alert));
  }

  const waiting = (await listBaskets({ status: 'en_attente' })).filter((basket) => {
    const createdAt = basket.createdAt instanceof Date ? basket.createdAt : new Date(basket.createdAt);
    return (Date.now() - createdAt.getTime()) / 36e5 >= Number(waitingHours);
  });
  for (const basket of waiting) {
    const alert = await insertAlertIfNew({
      alertType: 'waiting_too_long',
      severity: 'warning',
      title: 'Operation en attente trop longtemps',
      message: `${basket.basketCode} attend depuis plus de ${waitingHours}h`,
      entityType: 'basket',
      entityId: basket.id,
      thresholdValue: waitingHours
    });
    if (alert) created.push(mapAlert(alert));
  }

  const openSheets = await listOpenTrackingSheets();
  for (const sheet of openSheets) {
    const alert = await insertAlertIfNew({
      alertType: 'order_quantity_not_reached',
      severity: 'warning',
      title: 'Quantite OF non atteinte',
      message: `${sheet.sheetNumber} produit ${sheet.producedQuantity}/${sheet.orderQuantity} pieces`,
      entityType: 'tracking_sheet',
      entityId: sheet.id,
      thresholdValue: sheet.orderQuantity,
      actualValue: sheet.producedQuantity
    });
    if (alert) created.push(mapAlert(alert));
  }

  return created;
};

export const getMesAlerts = async (status) => {
  const rows = await listAlerts(status);
  return rows.map(mapAlert);
};

export const ackMesAlert = async ({ id, userId }) => {
  const row = await acknowledgeAlert({ id, userId });
  return row ? mapAlert(row) : null;
};
