// Petits utilitaires pour convertir/relier heure de début, heure de fin et
// nombre d'heures entre eux (calcul automatique dans le formulaire).

export function heureToMinutes(heure) {
  if (!heure) return null;
  const [h, m] = heure.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function minutesToHeure(minutesTotal) {
  const total = ((minutesTotal % 1440) + 1440) % 1440; // toujours positif, borné à 24h
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// À partir d'une heure de début et d'un nombre d'heures, calcule l'heure de
// fin correspondante (format "HH:MM"). Renvoie null si les données sont
// insuffisantes ou invalides.
export function calculerHeureFin(heureDebut, heures) {
  const debutMin = heureToMinutes(heureDebut);
  const h = Number(heures);
  if (debutMin === null || !h || h <= 0) return null;
  return minutesToHeure(debutMin + h * 60);
}

// À partir d'une heure de début et d'une heure de fin, calcule le nombre
// d'heures (arrondi au quart d'heure le plus proche). Gère le passage de
// minuit (heure de fin plus petite que l'heure de début = jour suivant).
// Renvoie null si les données sont insuffisantes ou si la durée est nulle.
export function calculerDureeHeures(heureDebut, heureFin) {
  const debutMin = heureToMinutes(heureDebut);
  const finMin = heureToMinutes(heureFin);
  if (debutMin === null || finMin === null) return null;
  let diff = finMin - debutMin;
  if (diff < 0) diff += 24 * 60;
  if (diff === 0) return null;
  const quartsHeure = Math.round(diff / 15);
  return Math.round((quartsHeure * 15 / 60) * 100) / 100;
}
