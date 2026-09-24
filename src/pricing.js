// Tous les tarifs et infos du prestataire sont centralisés ici : pour changer
// un prix, il suffit de modifier ce fichier, rien d'autre à toucher.

export const PRESTATAIRE = {
  nom: 'Danny Mifundu',
  activite: 'Photographe & Vidéaste',
  adresse: "Rue de l'Économie, 1000 Bruxelles",
  siteWeb: 'www.dreamrecordtv.com',
  chaineYoutube: 'DreamRecordTV',
};

// Tarif horaire selon le type de prestation choisi.
export const TYPES_PRESTATION = [
  { id: 'photo', label: 'Photo', tauxHoraire: 150, categorie: 'photo' },
  { id: 'video', label: 'Vidéo', tauxHoraire: 150, categorie: 'video' },
  { id: 'live1', label: 'Live — 1 caméra', tauxHoraire: 200, categorie: 'video' },
  { id: 'live2', label: 'Live — 2 caméras', tauxHoraire: 400, categorie: 'video' },
  { id: 'live3', label: 'Live — 3 caméras', tauxHoraire: 600, categorie: 'video' },
];

export const OPTION_DRONE_PRIX = 100;

// Tarif appliqué pour chaque heure de prestation effectuée au-delà de
// l'heure de fin prévue (dépassement).
export const TARIF_HEURE_SUPPLEMENTAIRE = 100;

// Pourcentage d'acompte demandé à la commande (le solde étant payé le jour
// de la prestation, avant le début de celle-ci).
export const ACOMPTE_POURCENTAGE = 0.5;

// Nombre de jours de validité d'un devis : passé ce délai, le Prestataire
// n'est plus tenu de garder la date au client et peut accepter une autre
// prestation à cette même date.
export const DEVIS_VALIDITE_JOURS = 7;

// Délai de livraison des fichiers finaux après la prestation, selon la
// catégorie (vidéo/live vs photo).
export const DELAI_LIVRAISON_JOURS = {
  video: 30,
  photo: 21, // 3 semaines
};

// Durées maximales des livrables vidéo.
export const DUREE_TEASER_MAX_MIN = 2;
export const DUREE_FILM_MAX_MIN = 30;

export function trouverTypePrestation(id) {
  return TYPES_PRESTATION.find((t) => t.id === id) || TYPES_PRESTATION[0];
}

// Calcule le détail complet (sous-total, options, total, acompte, solde) à
// partir des choix faits dans le formulaire. Si une négociation est active
// et qu'un prix négocié valide est fourni, ce prix remplace le tarif
// catalogue pour le calcul du total (et donc de l'acompte/solde), tout en
// gardant le tarif catalogue disponible pour affichage/comparaison.
export function calculerPrix({ typePrestationId, heures, optionDrone, negociationActive, prixNegocie }) {
  const type = trouverTypePrestation(typePrestationId);
  const h = Number(heures) || 0;
  const sousTotal = type.tauxHoraire * h;
  const totalOptions = optionDrone ? OPTION_DRONE_PRIX : 0;
  const prixCatalogue = sousTotal + totalOptions;

  const prixNegocieValide = negociationActive && Number(prixNegocie) > 0;
  const total = prixNegocieValide ? Number(prixNegocie) : prixCatalogue;
  const negocie = Boolean(prixNegocieValide);
  const ajustementNegocie = negocie ? Math.round((total - prixCatalogue) * 100) / 100 : 0;

  const acompte = Math.round(total * ACOMPTE_POURCENTAGE * 100) / 100;
  const solde = Math.round((total - acompte) * 100) / 100;
  return { type, heures: h, sousTotal, totalOptions, prixCatalogue, negocie, ajustementNegocie, total, acompte, solde };
}

export function formaterEuros(montant) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(montant || 0);
}
