export const validateTimeRange = (heureDebut, heureFin, dateStr) => {
  const [hD, mD] = heureDebut.split(':').map(Number);
  const [hF, mF] = heureFin.split(':').map(Number);
  const base = new Date(dateStr);
  const start = new Date(base); start.setHours(hD, mD, 0, 0);
  const end = new Date(base); end.setHours(hF, mF, 0, 0);
  if (end < start) end.setDate(end.getDate() + 1);
  const hours = (end - start) / 36e5;
  if (hours <= 0 || hours > 24) throw new Error('Durée de travail invalide');
  return hours;
};
export const computeProductionMetrics = ({ tailleLot, nbLots, objectifHeure, heuresTravail }) => {
  const lots = Math.max(1, nbLots);
  const totalPieces = tailleLot * lots;
  const piecesParHeure = heuresTravail > 0 ? totalPieces / heuresTravail : 0;
  const rendement = heuresTravail > 0 ? (piecesParHeure / objectifHeure) * 100 : 0;
  return { totalPieces, piecesParHeure, rendement };
};

export const computeStandardOperationMetrics = ({ tempsMinutes, objectifHeure }) => {
  const sam = Number(tempsMinutes || 0);
  const hourlyTarget = Number(objectifHeure || 0);
  const standardMinutes = sam > 0 ? sam : hourlyTarget > 0 ? 60 / hourlyTarget : 0;
  const computedHourlyTarget = hourlyTarget > 0 ? hourlyTarget : standardMinutes > 0 ? 60 / standardMinutes : 0;

  return {
    tempsMinutes: Number(standardMinutes.toFixed(4)),
    objectifHeure: Number(computedHourlyTarget.toFixed(2))
  };
};

export const computeResourceNeed = ({ tempsMinutes, objectifHeure, productionJour, tempsPresenceMinutes }) => {
  const { tempsMinutes: standardMinutes, objectifHeure: hourlyTarget } = computeStandardOperationMetrics({
    tempsMinutes,
    objectifHeure
  });
  const dailyProduction = Number(productionJour || 0);
  const presence = Number(tempsPresenceMinutes || 0);
  const besoin = standardMinutes > 0 && dailyProduction > 0 && presence > 0
    ? (standardMinutes * dailyProduction) / presence
    : 0;

  return {
    tempsMinutes: standardMinutes,
    objectifHeure: hourlyTarget,
    besoinRessource: Number(besoin.toFixed(4))
  };
};
