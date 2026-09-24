import { jsPDF } from 'jspdf';
import {
  PRESTATAIRE,
  formaterEuros,
  DEVIS_VALIDITE_JOURS,
  DELAI_LIVRAISON_JOURS,
  DUREE_TEASER_MAX_MIN,
  DUREE_FILM_MAX_MIN,
} from './pricing';
import { LOGO_DREAMRECORD_TV } from './logo';

const MARGE = 14;
const LARGEUR_PAGE = 210;
const BAS_PAGE = 280;

function formaterDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Vérifie s'il reste assez de place avant le bas de page ; sinon crée une
// nouvelle page (avec un petit en-tête léger) et renvoie la nouvelle position Y.
function assurerPlace(doc, y, hauteurNecessaire = 10) {
  if (y + hauteurNecessaire > BAS_PAGE) {
    doc.addPage();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(PRESTATAIRE.siteWeb, MARGE, 10);
    doc.setTextColor(0, 0, 0);
    return 20;
  }
  return y;
}

function ecrireParagraphe(doc, y, texte, { taille = 9, gras = false, largeur = 182, x = MARGE } = {}) {
  doc.setFont('helvetica', gras ? 'bold' : 'normal');
  doc.setFontSize(taille);
  const lignes = doc.splitTextToSize(texte, largeur);
  let curseur = y;
  lignes.forEach((ligne) => {
    curseur = assurerPlace(doc, curseur, 6);
    doc.text(ligne, x, curseur);
    curseur += taille * 0.5 + 1.5;
  });
  return curseur;
}

function enTete(doc, titre, numero) {
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, LARGEUR_PAGE, 36, 'F');

  // Logo DreamRecord TV (ratio 600x119 ≈ 5.04:1)
  const largeurLogo = 58;
  const hauteurLogo = largeurLogo / (600 / 119);
  doc.addImage(LOGO_DREAMRECORD_TV, 'PNG', MARGE, 7, largeurLogo, hauteurLogo);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(titre, MARGE, 31);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${numero}`, MARGE + 45, 31);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(PRESTATAIRE.nom, 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(PRESTATAIRE.activite, 196, 17, { align: 'right' });
  doc.text(PRESTATAIRE.adresse, 196, 22, { align: 'right' });
  doc.text(PRESTATAIRE.siteWeb, 196, 27, { align: 'right' });

  doc.setTextColor(0, 0, 0);
}

function blocClient(doc, y, data) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Client', MARGE, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientNom || '—', MARGE, y + 6);
  if (data.clientAdresse) doc.text(data.clientAdresse, MARGE, y + 11);
  if (data.clientEmail) doc.text(data.clientEmail, MARGE, y + 16);
  if (data.clientTelephone) doc.text(data.clientTelephone, MARGE, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Prestation', 120, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Type d'événement : ${data.typeEvenement || '—'}`, 120, y + 6);
  doc.text(`Date : ${formaterDate(data.dateEvenement)}`, 120, y + 11);
  if (data.heureDebut) doc.text(`Heure de début : ${data.heureDebut}`, 120, y + 16);
  doc.text(`Émis le : ${formaterDate(new Date().toISOString())}`, 120, y + 21);

  return y + 32;
}

function tableauPrix(doc, y, calcul) {
  y = assurerPlace(doc, y, 40);
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(240, 240, 245);
  doc.rect(MARGE, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Description', MARGE + 4, y + 5.5);
  doc.text('Heures', 130, y + 5.5);
  doc.text('Taux', 152, y + 5.5);
  doc.text('Montant', 190, y + 5.5, { align: 'right' });

  let ligneY = y + 14;
  doc.setFont('helvetica', 'normal');
  doc.text(calcul.type.label, MARGE + 4, ligneY);
  doc.text(String(calcul.heures), 130, ligneY);
  doc.text(formaterEuros(calcul.type.tauxHoraire) + '/h', 152, ligneY);
  doc.text(formaterEuros(calcul.sousTotal), 190, ligneY, { align: 'right' });

  if (calcul.totalOptions > 0) {
    ligneY += 7;
    doc.text('Option drone', MARGE + 4, ligneY);
    doc.text(formaterEuros(calcul.totalOptions), 190, ligneY, { align: 'right' });
  }

  if (calcul.negocie) {
    ligneY += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Sous-total tarif catalogue', 120, ligneY);
    doc.text(formaterEuros(calcul.prixCatalogue), 190, ligneY, { align: 'right' });
    ligneY += 6;
    doc.text('Ajustement négocié avec le client', 120, ligneY);
    doc.text(formaterEuros(calcul.ajustementNegocie), 190, ligneY, { align: 'right' });
  }

  ligneY += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(120, ligneY, 196, ligneY);
  ligneY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(calcul.negocie ? 'Total (prix négocié)' : 'Total', 120, ligneY);
  doc.text(formaterEuros(calcul.total), 190, ligneY, { align: 'right' });

  ligneY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Acompte (50%) à la commande', 120, ligneY);
  doc.text(formaterEuros(calcul.acompte), 190, ligneY, { align: 'right' });
  ligneY += 5;
  doc.text('Solde (50%) le jour de la prestation', 120, ligneY);
  doc.text(formaterEuros(calcul.solde), 190, ligneY, { align: 'right' });

  return ligneY + 10;
}

function piedDePage(doc, texte) {
  const nbPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= nbPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(doc.splitTextToSize(texte, 182), MARGE, 290);
    doc.setFontSize(7);
    doc.text(`${PRESTATAIRE.siteWeb} — Page ${i}/${nbPages}`, 196, 290, { align: 'right' });
  }
}

export function genererDevisPDF(data, calcul, numero) {
  const doc = new jsPDF();
  enTete(doc, 'DEVIS', numero);
  let y = blocClient(doc, 46, data);
  y = tableauPrix(doc, y, calcul);

  if (data.arrangementPersonnalise && data.arrangementPersonnalise.trim()) {
    y = assurerPlace(doc, y, 15);
    y = ecrireParagraphe(doc, y, 'Arrangement particulier convenu avec le client', { gras: true });
    y = ecrireParagraphe(doc, y, data.arrangementPersonnalise.trim());
    y += 4;
  }

  if (data.notes) {
    y = assurerPlace(doc, y, 15);
    y = ecrireParagraphe(doc, y, 'Notes', { gras: true });
    y = ecrireParagraphe(doc, y, data.notes);
    y += 4;
  }

  piedDePage(
    doc,
    `Devis valable ${DEVIS_VALIDITE_JOURS} jours à compter de la date d'émission. Passé ce délai, le Prestataire se réserve le droit d'accepter une autre prestation à la date initialement proposée au Client. L'acompte de 50% n'est pas remboursable en cas d'annulation par le Client.`
  );

  doc.save(`${numero}.pdf`);
}

// Construit la liste des articles du contrat, adaptés selon la catégorie de
// prestation (vidéo/live vs photo).
function construireArticles(data, calcul, numero) {
  const estVideo = calcul.type.categorie === 'video';
  const delaiJours = estVideo ? DELAI_LIVRAISON_JOURS.video : DELAI_LIVRAISON_JOURS.photo;
  const delaiTexte = estVideo ? `${delaiJours} jours` : `3 semaines (${delaiJours} jours)`;

  // On construit d'abord la liste sans numéro : le numéro d'article est
  // recalculé à la fin, ce qui permet d'insérer l'arrangement particulier
  // (s'il y en a un) sans devoir renuméroter les articles à la main.
  const articles = [];

  articles.push({
    titreBase: 'Parties',
    texte: `Le présent contrat est conclu entre ${PRESTATAIRE.nom}, ${PRESTATAIRE.activite}, domicilié ${PRESTATAIRE.adresse} (ci-après "le Prestataire"), et ${data.clientNom || '—'}${data.clientAdresse ? `, domicilié ${data.clientAdresse}` : ''} (ci-après "le Client").`,
  });

  articles.push({
    titreBase: 'Objet du contrat',
    texte: `Le Prestataire s'engage à réaliser une prestation de type "${calcul.type.label}" à l'occasion de : ${data.typeEvenement || '—'}, le ${formaterDate(data.dateEvenement)}${data.heureDebut ? ` à partir de ${data.heureDebut}` : ''}, pour une durée de ${calcul.heures} heure(s)${calcul.totalOptions > 0 ? ', avec option drone' : ''}.`,
  });

  if (estVideo) {
    articles.push({
      titreBase: 'Livrables',
      texte: `Le Client recevra un teaser d'une durée maximale de ${DUREE_TEASER_MAX_MIN} minutes ainsi qu'un film complet d'une durée maximale de ${DUREE_FILM_MAX_MIN} minutes. Sauf arrangement particulier prévu ci-dessous, les fichiers seront remis au Client sous forme d'un lien de téléchargement, dans un délai de ${delaiTexte} après la date de la prestation.`,
    });
    articles.push({
      titreBase: 'Droits de diffusion',
      texte: `Sauf refus écrit du Client avant la date de la prestation, le Client autorise le Prestataire à publier tout ou partie de la vidéo réalisée sur la chaîne YouTube "${PRESTATAIRE.chaineYoutube}" ainsi que sur le site ${PRESTATAIRE.siteWeb}, à des fins de présentation du travail du Prestataire.`,
    });
  } else {
    articles.push({
      titreBase: 'Livrables',
      texte: `Sauf arrangement particulier prévu ci-dessous, les photographies seront remises au Client sous forme d'un lien de téléchargement, dans un délai de ${delaiTexte} après la date de la prestation.`,
    });
    articles.push({
      titreBase: 'Droits de diffusion',
      texte: `Sauf refus écrit du Client avant la date de la prestation, le Client autorise le Prestataire à publier une sélection des photographies réalisées sur le site ${PRESTATAIRE.siteWeb}, à des fins de présentation du travail du Prestataire.`,
    });
  }

  articles.push({
    titreBase: 'Prix et modalités de paiement',
    texte: calcul.negocie
      ? `Le tarif catalogue de la prestation s'élève à ${formaterEuros(calcul.prixCatalogue)}. D'un commun accord entre les parties, un prix négocié a été convenu, portant le montant total de la prestation à ${formaterEuros(calcul.total)}. Sauf arrangement particulier prévu ci-dessous, un acompte de ${formaterEuros(calcul.acompte)} (50%) est dû à la signature du présent contrat pour confirmer la réservation de la date, le solde de ${formaterEuros(calcul.solde)} (50%) étant payable le jour de la prestation, avant le début de celle-ci.`
      : `Le montant total de la prestation s'élève à ${formaterEuros(calcul.total)}. Sauf arrangement particulier prévu ci-dessous, un acompte de ${formaterEuros(calcul.acompte)} (50%) est dû à la signature du présent contrat pour confirmer la réservation de la date, le solde de ${formaterEuros(calcul.solde)} (50%) étant payable le jour de la prestation, avant le début de celle-ci.`,
  });

  // Clause libre : uniquement si le Prestataire a renseigné un texte dans la
  // zone "Arrangement particulier" du formulaire (ex : un échéancier de
  // paiement différent négocié avec ce Client précis). Vide par défaut, donc
  // le contrat reste inchangé si rien n'est saisi.
  if (data.arrangementPersonnalise && data.arrangementPersonnalise.trim()) {
    articles.push({
      titreBase: 'Arrangement particulier',
      texte: `Par dérogation à toute clause standard prévue ci-dessus dans le présent contrat (notamment les délais de livraison des Articles 3 et 5), les parties conviennent expressément de l'arrangement particulier suivant, qui prévaut sur les clauses standards concernées : ${data.arrangementPersonnalise.trim()}`,
    });
  }

  articles.push({
    titreBase: 'Réservation de la date',
    texte: `La date de la prestation n'est définitivement réservée qu'à réception de l'acompte visé ci-dessus. Sans acompte reçu dans le délai de validité du devis, le Prestataire se réserve le droit d'accepter une autre prestation à cette même date.`,
  });

  articles.push({
    titreBase: 'Annulation et report',
    texte: `En cas d'annulation par le Client, l'acompte versé reste acquis au Prestataire et n'est pas remboursable. Toute prestation annulée moins de 48 heures avant la date prévue reste due dans son intégralité. En cas d'empêchement du Prestataire (maladie, force majeure), celui-ci s'engage à proposer une nouvelle date au Client ou, à défaut d'accord, à rembourser intégralement l'acompte versé.`,
  });

  articles.push({
    titreBase: 'Force majeure',
    texte: `Aucune des parties ne pourra être tenue responsable d'un retard ou d'une inexécution dû à un cas de force majeure (maladie grave, accident, catastrophe naturelle, décision administrative, panne majeure de matériel imprévisible).`,
  });

  articles.push({
    titreBase: 'Responsabilité',
    texte: `La responsabilité du Prestataire ne pourra être engagée au-delà du montant total perçu pour la prestation. Le Prestataire ne saurait être tenu responsable de la perte de fichiers résultant d'une défaillance technique imprévisible et indépendante de sa volonté.`,
  });

  articles.push({
    titreBase: 'Droit applicable et litiges',
    texte: `Le présent contrat est soumis au droit belge. Tout litige relatif à son interprétation ou à son exécution relève de la compétence exclusive des tribunaux de l'arrondissement de Bruxelles.`,
  });

  return articles.map((article, index) => ({
    ...article,
    titre: `Article ${index + 1} — ${article.titreBase}`,
  }));
}

export function genererContratPDF(data, calcul, numero) {
  const doc = new jsPDF();
  enTete(doc, 'CONTRAT DE PRESTATION', numero);
  let y = blocClient(doc, 46, data);
  y = tableauPrix(doc, y, calcul);
  y += 6;

  const articles = construireArticles(data, calcul, numero);
  articles.forEach((article) => {
    y = assurerPlace(doc, y, 16);
    y = ecrireParagraphe(doc, y, article.titre, { taille: 10, gras: true });
    y = ecrireParagraphe(doc, y, article.texte, { taille: 9 });
    y += 3;
  });

  y = assurerPlace(doc, y, 45);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Fait en deux exemplaires à _______________________, le _______________________', MARGE, y);
  y += 20;
  doc.text('Le Prestataire', MARGE, y);
  doc.text('Le Client', 120, y);
  doc.text('(précédé de "Lu et approuvé")', 120, y + 5);
  y += 22;
  doc.text('Signature : _____________________', MARGE, y);
  doc.text('Signature : _____________________', 120, y);

  piedDePage(doc, `Contrat régi par le droit belge — ${PRESTATAIRE.siteWeb}`);

  doc.save(`${numero}.pdf`);
}
