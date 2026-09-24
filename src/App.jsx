import { useMemo, useState } from 'react';
import {
  TYPES_PRESTATION,
  calculerPrix,
  formaterEuros,
} from './pricing';
import { genererDevisPDF, genererContratPDF } from './pdf';
import { chargerHistorique, ajouterEntree, supprimerEntree, prochainNumero } from './storage';
import { MOT_DE_PASSE, CLE_ACCES } from './acces';
import { corrigerTexte } from './correction';
import logoDreamRecordTV from './assets/logo.png';
import './App.css';

const FORM_VIDE = {
  clientNom: '',
  clientEmail: '',
  clientTelephone: '',
  clientAdresse: '',
  typeEvenement: '',
  dateEvenement: '',
  heureDebut: '',
  typePrestationId: TYPES_PRESTATION[0].id,
  heures: 1,
  optionDrone: false,
  negociationActive: false,
  prixNegocie: '',
  arrangementPersonnalise: '',
  notes: '',
};

export default function App() {
  const [onglet, setOnglet] = useState('nouveau');
  const [form, setForm] = useState(FORM_VIDE);
  const [historique, setHistorique] = useState(() => chargerHistorique());
  const [message, setMessage] = useState('');
  const [correctionEnCours, setCorrectionEnCours] = useState(false);

  const [autorise, setAutorise] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(CLE_ACCES) === 'oui'
  );
  const [motDePasseSaisi, setMotDePasseSaisi] = useState('');
  const [erreurAcces, setErreurAcces] = useState('');

  const verifierMotDePasse = (e) => {
    e.preventDefault();
    if (motDePasseSaisi === MOT_DE_PASSE) {
      window.localStorage.setItem(CLE_ACCES, 'oui');
      setAutorise(true);
      setErreurAcces('');
    } else {
      setErreurAcces('Mot de passe incorrect.');
    }
  };

  const calcul = useMemo(() => calculerPrix(form), [form]);

  const majChamp = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));

  const formValide =
    form.clientNom.trim() &&
    form.dateEvenement &&
    Number(form.heures) > 0 &&
    (!form.negociationActive || Number(form.prixNegocie) > 0);

  const enregistrer = (type, numero, donneesUtilisees) => {
    const entree = {
      id: `${Date.now()}`,
      type,
      numero,
      creeLe: new Date().toISOString(),
      data: donneesUtilisees,
      calcul,
    };
    setHistorique(ajouterEntree(entree));
  };

  // Corrige automatiquement les fautes de l'arrangement particulier (le cas
  // échéant) avant de générer un document, et répercute le texte corrigé
  // dans le formulaire pour que ce soit transparent pour Danny. En cas de
  // souci réseau, on retombe silencieusement sur le texte tel quel.
  const corrigerArrangementSiBesoin = async () => {
    const texte = form.arrangementPersonnalise;
    if (!texte || !texte.trim()) return form;

    setCorrectionEnCours(true);
    const { texteCorrige, nombreCorrections, erreur } = await corrigerTexte(texte);
    setCorrectionEnCours(false);

    if (erreur) {
      setMessage(`Correction automatique indisponible (${erreur}) — texte utilisé tel quel.`);
      return form;
    }
    if (nombreCorrections > 0) {
      setForm((f) => ({ ...f, arrangementPersonnalise: texteCorrige }));
      setMessage(`${nombreCorrections} correction(s) appliquée(s) au texte de l'arrangement particulier.`);
    }
    return { ...form, arrangementPersonnalise: texteCorrige };
  };

  const telechargerDevis = async () => {
    if (!formValide) { setMessage('Renseigne au moins le nom du client, la date et les heures.'); return; }
    const donnees = await corrigerArrangementSiBesoin();
    const numero = prochainNumero('DEV');
    genererDevisPDF(donnees, calcul, numero);
    enregistrer('devis', numero, donnees);
    setMessage(`Devis ${numero} généré.`);
  };

  const telechargerContrat = async () => {
    if (!formValide) { setMessage('Renseigne au moins le nom du client, la date et les heures.'); return; }
    const donnees = await corrigerArrangementSiBesoin();
    const numero = prochainNumero('CTR');
    genererContratPDF(donnees, calcul, numero);
    enregistrer('contrat', numero, donnees);
    setMessage(`Contrat ${numero} généré.`);
  };

  const corrigerArrangementManuel = async () => {
    if (!form.arrangementPersonnalise || !form.arrangementPersonnalise.trim()) return;
    setCorrectionEnCours(true);
    const { texteCorrige, nombreCorrections, erreur } = await corrigerTexte(form.arrangementPersonnalise);
    setCorrectionEnCours(false);
    if (erreur) {
      setMessage(`Correction automatique indisponible (${erreur}).`);
      return;
    }
    setForm((f) => ({ ...f, arrangementPersonnalise: texteCorrige }));
    setMessage(nombreCorrections > 0 ? `${nombreCorrections} correction(s) appliquée(s).` : 'Aucune faute trouvée.');
  };

  const reGenerer = (entree) => {
    if (entree.type === 'devis') genererDevisPDF(entree.data, entree.calcul, entree.numero);
    else genererContratPDF(entree.data, entree.calcul, entree.numero);
  };

  const supprimer = (id) => setHistorique(supprimerEntree(id));

  if (!autorise) {
    return (
      <div className="page page-verrouillee">
        <header className="entete">
          <div className="entete-decor" aria-hidden="true">
            <span className="icone-decor icone-appareil">📷</span>
            <span className="icone-decor icone-camera">🎥</span>
          </div>
          <div className="entete-contenu">
            <img src={logoDreamRecordTV} alt="DreamRecord TV" className="logo-marque" />
            <h1>Accès privé</h1>
            <p>Outil interne — Devis &amp; contrats</p>
            <a className="lien-site" href="https://www.dreamrecordtv.com" target="_blank" rel="noreferrer">www.dreamrecordtv.com</a>
          </div>
        </header>

        <div className="verrou-conteneur">
          <form className="verrou-carte" onSubmit={verifierMotDePasse}>
            <p className="verrou-icone" aria-hidden="true">🔒</p>
            <h2>Accès réservé</h2>
            <p className="verrou-texte">Entre le mot de passe pour accéder à l'outil.</p>
            <input
              type="password"
              className="verrou-champ"
              placeholder="Mot de passe"
              value={motDePasseSaisi}
              onChange={(e) => setMotDePasseSaisi(e.target.value)}
              autoFocus
            />
            {erreurAcces && <p className="verrou-erreur">{erreurAcces}</p>}
            <button type="submit" className="bouton principal">Entrer</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="entete">
        <div className="entete-decor" aria-hidden="true">
          <span className="icone-decor icone-appareil">📷</span>
          <span className="icone-decor icone-camera">🎥</span>
        </div>
        <div className="entete-contenu">
          <img src={logoDreamRecordTV} alt="DreamRecord TV" className="logo-marque" />
          <h1>Danny Mifundu</h1>
          <p>Devis &amp; contrats — Photo / Vidéo / Live</p>
          <a className="lien-site" href="https://www.dreamrecordtv.com" target="_blank" rel="noreferrer">www.dreamrecordtv.com</a>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-piste">
          <span>📷 Photo&nbsp;&nbsp;•&nbsp;&nbsp;🎥 Vidéo&nbsp;&nbsp;•&nbsp;&nbsp;📡 Live&nbsp;&nbsp;•&nbsp;&nbsp;✨ Devis instantané&nbsp;&nbsp;•&nbsp;&nbsp;📄 Contrat automatique&nbsp;&nbsp;•&nbsp;&nbsp;🌐 www.dreamrecordtv.com&nbsp;&nbsp;•&nbsp;&nbsp;</span>
          <span>📷 Photo&nbsp;&nbsp;•&nbsp;&nbsp;🎥 Vidéo&nbsp;&nbsp;•&nbsp;&nbsp;📡 Live&nbsp;&nbsp;•&nbsp;&nbsp;✨ Devis instantané&nbsp;&nbsp;•&nbsp;&nbsp;📄 Contrat automatique&nbsp;&nbsp;•&nbsp;&nbsp;🌐 www.dreamrecordtv.com&nbsp;&nbsp;•&nbsp;&nbsp;</span>
        </div>
      </div>

      <nav className="onglets">
        <button className={onglet === 'nouveau' ? 'actif' : ''} onClick={() => setOnglet('nouveau')}>
          Nouveau
        </button>
        <button className={onglet === 'historique' ? 'actif' : ''} onClick={() => setOnglet('historique')}>
          Historique ({historique.length})
        </button>
      </nav>

      {onglet === 'nouveau' && (
        <div className="contenu">
          <section className="carte">
            <h2>Client</h2>
            <div className="grille">
              <label>
                Nom du client *
                <input value={form.clientNom} onChange={(e) => majChamp('clientNom', e.target.value)} placeholder="Ex: Marie Dupont" />
              </label>
              <label>
                Email
                <input type="email" value={form.clientEmail} onChange={(e) => majChamp('clientEmail', e.target.value)} placeholder="marie@email.com" />
              </label>
              <label>
                Téléphone
                <input value={form.clientTelephone} onChange={(e) => majChamp('clientTelephone', e.target.value)} placeholder="+32 ..." />
              </label>
              <label>
                Adresse
                <input value={form.clientAdresse} onChange={(e) => majChamp('clientAdresse', e.target.value)} placeholder="Adresse du client" />
              </label>
            </div>
          </section>

          <section className="carte">
            <h2>Prestation</h2>
            <div className="grille">
              <label>
                Type d'événement
                <input value={form.typeEvenement} onChange={(e) => majChamp('typeEvenement', e.target.value)} placeholder="Anniversaire, mariage, entreprise..." />
              </label>
              <label>
                Date de l'événement *
                <input type="date" value={form.dateEvenement} onChange={(e) => majChamp('dateEvenement', e.target.value)} />
              </label>
              <label>
                Heure de début
                <input type="time" value={form.heureDebut} onChange={(e) => majChamp('heureDebut', e.target.value)} />
              </label>
              <label>
                Type de prestation
                <select value={form.typePrestationId} onChange={(e) => majChamp('typePrestationId', e.target.value)}>
                  {TYPES_PRESTATION.map((t) => (
                    <option key={t.id} value={t.id}>{t.label} — {formaterEuros(t.tauxHoraire)}/h</option>
                  ))}
                </select>
              </label>
              <label>
                Nombre d'heures *
                <input type="number" min="0" step="0.5" value={form.heures} onChange={(e) => majChamp('heures', e.target.value)} />
              </label>
              <label className="case">
                <input type="checkbox" checked={form.optionDrone} onChange={(e) => majChamp('optionDrone', e.target.checked)} />
                Option drone (+{formaterEuros(100)})
              </label>
              <label className="case">
                <input
                  type="checkbox"
                  checked={form.negociationActive}
                  onChange={(e) => majChamp('negociationActive', e.target.checked)}
                />
                Prix négocié avec le client
              </label>
              {form.negociationActive && (
                <label>
                  Prix négocié total (€) *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.prixNegocie}
                    onChange={(e) => majChamp('prixNegocie', e.target.value)}
                    placeholder={`Tarif catalogue : ${formaterEuros(calcul.prixCatalogue)}`}
                  />
                </label>
              )}
            </div>
            <label className="notes">
              Notes (optionnel)
              <textarea value={form.notes} onChange={(e) => majChamp('notes', e.target.value)} rows={3} />
            </label>
          </section>

          <section className="carte">
            <h2>Arrangement particulier (optionnel)</h2>
            <p className="aide-texte">
              Si tu t'es mis d'accord avec ce client sur des conditions différentes de celles
              du contrat standard (par exemple un échéancier de paiement différent), décris-le
              ici. Ce texte sera ajouté comme clause dans le contrat et dans le devis. Laisse
              vide pour garder le contrat standard (acompte 50% / solde 50% le jour J).
            </p>
            <textarea
              className="arrangement-champ"
              value={form.arrangementPersonnalise}
              onChange={(e) => majChamp('arrangementPersonnalise', e.target.value)}
              rows={4}
              placeholder="Ex : Le client verse 50% à la réservation, 25% le jour de la prestation, et les 25% restants à la remise du travail final."
            />
            <div className="arrangement-actions">
              <button
                type="button"
                className="bouton secondaire petit-bouton"
                onClick={corrigerArrangementManuel}
                disabled={correctionEnCours || !form.arrangementPersonnalise.trim()}
              >
                {correctionEnCours ? 'Correction en cours…' : 'Corriger le texte'}
              </button>
              <span className="aide-texte aide-texte-inline">
                Les fautes d'orthographe et de grammaire de ce texte sont de toute façon corrigées
                automatiquement au moment de générer le devis ou le contrat.
              </span>
            </div>
          </section>

          <section className="carte recap">
            <h2>Récapitulatif</h2>
            <div className="ligne"><span>{calcul.type.label} × {calcul.heures}h</span><span>{formaterEuros(calcul.sousTotal)}</span></div>
            {calcul.totalOptions > 0 && (
              <div className="ligne"><span>Option drone</span><span>{formaterEuros(calcul.totalOptions)}</span></div>
            )}
            {calcul.negocie && (
              <>
                <div className="ligne petit"><span>Sous-total tarif catalogue</span><span>{formaterEuros(calcul.prixCatalogue)}</span></div>
                <div className="ligne petit"><span>Ajustement négocié</span><span>{formaterEuros(calcul.ajustementNegocie)}</span></div>
              </>
            )}
            <div className="ligne total"><span>{calcul.negocie ? 'Total (prix négocié)' : 'Total'}</span><span>{formaterEuros(calcul.total)}</span></div>
            <div className="ligne petit"><span>Acompte (50%) à la commande</span><span>{formaterEuros(calcul.acompte)}</span></div>
            <div className="ligne petit"><span>Solde (50%) le jour J</span><span>{formaterEuros(calcul.solde)}</span></div>

            <div className="actions">
              <button className="bouton secondaire" onClick={telechargerDevis} disabled={correctionEnCours}>Télécharger le devis (PDF)</button>
              <button className="bouton principal" onClick={telechargerContrat} disabled={correctionEnCours}>Télécharger le contrat (PDF)</button>
            </div>
            {message && <p className="message">{message}</p>}
          </section>
        </div>
      )}

      {onglet === 'historique' && (
        <div className="contenu">
          {historique.length === 0 ? (
            <p className="vide">Aucun devis ou contrat généré pour l'instant.</p>
          ) : (
            <ul className="liste-historique">
              {historique.map((e) => (
                <li key={e.id} className="carte">
                  <div className="ligne-historique">
                    <div>
                      <strong>{e.numero}</strong> — {e.data.clientNom}
                      <div className="sous-texte">
                        {e.type === 'devis' ? 'Devis' : 'Contrat'} · {e.calcul.type.label} · {formaterEuros(e.calcul.total)}
                      </div>
                    </div>
                    <div className="actions-historique">
                      <button className="bouton secondaire petit-bouton" onClick={() => reGenerer(e)}>Télécharger</button>
                      <button className="bouton danger petit-bouton" onClick={() => supprimer(e.id)}>Supprimer</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
