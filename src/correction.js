// Correction automatique d'orthographe/grammaire pour le texte saisi dans
// "Arrangement particulier", via l'API publique et gratuite de LanguageTool.
// Aucune clé API, aucun serveur à nous : l'appel part directement du
// navigateur du visiteur vers languagetool.org.
//
// Portée : ça corrige les fautes d'orthographe, d'accord et les
// confusions classiques (a/à, ou/où, etc.) — pas une reformulation
// stylistique complète façon IA. En cas d'erreur réseau ou de dépassement
// du quota gratuit, le texte d'origine est renvoyé tel quel (jamais bloquant).

const URL_LANGUAGETOOL = 'https://api.languagetool.org/v2/check';
const DELAI_MAX_MS = 8000;

export async function corrigerTexte(texte) {
  const original = (texte || '').trim();
  if (!original) {
    return { texteCorrige: original, nombreCorrections: 0, erreur: null };
  }

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX_MS);

  try {
    const reponse = await fetch(URL_LANGUAGETOOL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text: original, language: 'fr' }),
      signal: controleur.signal,
    });
    clearTimeout(minuteur);

    if (!reponse.ok) {
      return { texteCorrige: original, nombreCorrections: 0, erreur: 'service indisponible' };
    }

    const donnees = await reponse.json();
    const correspondances = (donnees.matches || [])
      .filter((m) => m.replacements && m.replacements.length > 0)
      .sort((a, b) => a.offset - b.offset);

    let resultat = '';
    let curseur = 0;
    let nombreCorrections = 0;

    correspondances.forEach((m) => {
      if (m.offset < curseur) return; // évite les chevauchements
      resultat += original.slice(curseur, m.offset);
      resultat += m.replacements[0].value;
      curseur = m.offset + m.length;
      nombreCorrections += 1;
    });
    resultat += original.slice(curseur);

    return { texteCorrige: resultat, nombreCorrections, erreur: null };
  } catch (e) {
    clearTimeout(minuteur);
    return { texteCorrige: original, nombreCorrections: 0, erreur: 'délai dépassé ou hors ligne' };
  }
}
