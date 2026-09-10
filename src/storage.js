// Historique local des devis/contrats : tout est gardé dans le navigateur
// (pas de serveur), donc l'historique reste sur l'appareil utilisé pour
// générer le document.

const CLE_HISTORIQUE = 'devis_historique_v1';
const CLE_COMPTEUR = 'devis_compteur_v1';

export function chargerHistorique() {
  try {
    const brut = localStorage.getItem(CLE_HISTORIQUE);
    return brut ? JSON.parse(brut) : [];
  } catch {
    return [];
  }
}

function sauvegarderHistorique(liste) {
  localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(liste));
}

export function ajouterEntree(entree) {
  const liste = chargerHistorique();
  liste.unshift(entree);
  sauvegarderHistorique(liste);
  return liste;
}

export function supprimerEntree(id) {
  const liste = chargerHistorique().filter((e) => e.id !== id);
  sauvegarderHistorique(liste);
  return liste;
}

// Génère un numéro du type DEV-2026-0001 / CTR-2026-0001, incrémenté à
// chaque génération (compteur séparé par préfixe).
export function prochainNumero(prefixe) {
  const annee = new Date().getFullYear();
  const cle = `${CLE_COMPTEUR}_${prefixe}_${annee}`;
  const actuel = Number(localStorage.getItem(cle) || '0') + 1;
  localStorage.setItem(cle, String(actuel));
  return `${prefixe}-${annee}-${String(actuel).padStart(4, '0')}`;
}
