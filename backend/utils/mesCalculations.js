export const parseWorkedMinutes = (dateStr, startTime, endTime) => {
  if (!dateStr || !startTime || !endTime) throw new Error('Date et heures obligatoires');
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) {
    throw new Error('Format heure invalide');
  }

  const base = new Date(dateStr);
  const start = new Date(base);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(base);
  end.setHours(endHour, endMinute, 0, 0);
  if (end < start) end.setDate(end.getDate() + 1);

  const minutes = (end - start) / 60000;
  if (minutes <= 0 || minutes > 1440) throw new Error('Temps de travail invalide');
  return minutes;
};

const parseDateOnly = (dateStr) => {
  if (!dateStr) throw new Error('Date obligatoire');
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
  if ([year, month, day].some((value) => Number.isNaN(value))) throw new Error('Date invalide');
  return new Date(year, month - 1, day);
};

export const getScheduledPresenceMinutes = (dateStr) => {
  const date = parseDateOnly(dateStr);
  const day = date.getDay();
  const month = date.getMonth() + 1;

  if (day === 0) return 0;
  if (day === 6) return 300;
  if (month === 7 || month === 8) return 420;
  return 510;
};

export const resolveWorkedMinutes = ({ entryDate, startTime, endTime, realWorkedMinutes }) => {
  const explicit = Number(realWorkedMinutes || 0);
  if (explicit > 0) return explicit;
  if (startTime && endTime) return parseWorkedMinutes(entryDate, startTime, endTime);
  const scheduled = getScheduledPresenceMinutes(entryDate);
  if (scheduled <= 0) throw new Error('Jour non travaille selon calendrier atelier');
  return scheduled;
};

export const computeEfficiency = ({ quantityProduced, samMinutes, realWorkedMinutes }) => {
  const quantity = Number(quantityProduced || 0);
  const sam = Number(samMinutes || 0);
  const worked = Number(realWorkedMinutes || 0);
  if (sam <= 0) throw new Error('SAM invalide');
  if (worked <= 0) throw new Error('Temps reel invalide');
  return Number((((quantity * sam) / worked) * 100).toFixed(2));
};

export const computeDailyArticleCapacity = ({ operations = [], presenceMinutes, defaultWorkers = 1 }) => {
  const presence = Number(presenceMinutes || 0);
  if (presence <= 0) {
    return {
      presenceMinutes: presence,
      bottleneckCapacity: 0,
      totalResourceNeedForOnePiecePerDay: 0,
      operations: []
    };
  }

  const rows = operations
    .map((operation) => {
      const sam = Number(operation.samMinutes || operation.tempsMinutes || 0);
      const workers = Math.max(1, Number(operation.workers || operation.workerCount || defaultWorkers || 1));
      const capacityPieces = sam > 0 ? (presence * workers) / sam : 0;
      return {
        operationId: operation.operationId || operation.id || null,
        operationName: operation.operationName || operation.nom || operation.name || null,
        sequenceNo: operation.sequenceNo || null,
        samMinutes: Number(sam.toFixed(4)),
        workers,
        capacityPieces: Number(capacityPieces.toFixed(2)),
        resourceNeedForOnePiecePerDay: sam > 0 ? Number((sam / presence).toFixed(4)) : 0
      };
    })
    .filter((operation) => operation.samMinutes > 0);

  return {
    presenceMinutes: presence,
    bottleneckCapacity: rows.length ? Math.floor(Math.min(...rows.map((operation) => operation.capacityPieces))) : 0,
    totalResourceNeedForOnePiecePerDay: Number(rows.reduce((sum, operation) => sum + operation.resourceNeedForOnePiecePerDay, 0).toFixed(4)),
    operations: rows
  };
};

export const computeOperationMetrics = ({ quantityProduced, samMinutes, realWorkedMinutes }) => {
  const quantity = Number(quantityProduced || 0);
  const sam = Number(samMinutes || 0);
  const worked = Number(realWorkedMinutes || 0);
  if (sam <= 0) throw new Error('SAM invalide');
  if (worked <= 0) throw new Error('Temps reel invalide');

  const targetPieces = worked / sam;
  const theoreticalMinutes = quantity * sam;
  const lostMinutes = Math.max(worked - theoreticalMinutes, 0);
  const productiveMinutes = Math.min(theoreticalMinutes, worked);

  return {
    hourlyTarget: Number((60 / sam).toFixed(2)),
    targetPieces: Number(targetPieces.toFixed(2)),
    theoreticalMinutes: Number(theoreticalMinutes.toFixed(2)),
    productiveMinutes: Number(productiveMinutes.toFixed(2)),
    lostMinutes: Number(lostMinutes.toFixed(2)),
    variancePieces: Number((quantity - targetPieces).toFixed(2)),
    efficiency: Number(((theoreticalMinutes / worked) * 100).toFixed(2))
  };
};

const toLocalDateOnly = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const resolvePeriod = (period = 'daily', date = new Date()) => {
  const base = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(date);
  base.setHours(0, 0, 0, 0);
  const start = new Date(base);
  const end = new Date(base);

  if (period === 'weekly') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === 'monthly') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }

  return {
    startDate: toLocalDateOnly(start),
    endDate: toLocalDateOnly(end)
  };
};

export const makeBasketCode = (year, number) => `PAN-${year}-${String(number).padStart(5, '0')}`;
