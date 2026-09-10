import { useMemo, useState } from 'react';
import {
  TYPES_PRESTATION,
  calculerPrix,
  formaterEuros,
} from './pricing';
import { genererDevisPDF, genererContratPDF } from './pdf';
import { chargerHistorique, ajouterEntree, supprimerEntree, prochainNumero } from './storage';
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
  notes: '',
};

export default function App() {
  const [onglet, setOnglet] = useState('nouveau');
  const [form, setForm] = useState(FORM_VIDE);
  const [historique, setHistorique] = useState(() => chargerHistorique());
  const [message, setMessage] = useState('');

  const calcul = useMemo(() => calculerPrix(form), [form]);

  const majChamp = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));

  const formValide = form.clientNom.trim() && form.dateEvenement && Number(form.heures) > 0;

  const enregistrer = (type, numero) => {
    const entree = {
      id: `${Date.now()}`,
      type,
      numero,
      creeLe: new Date().toISOString(),
      data: form,
      calcul,
    };
    setHistorique(ajouterEntree(entree));
  };

  const telechargerDevis = () => {
    if (!formValide) { setMessage('Renseigne au moins le nom du client, la date et les heures.'); return; }
    const numero = prochainNumero('DEV');
    genererDevisPDF(form, calcul, numero);
    enregistrer('devis', numero);
    setMessage(`Devis ${numero} généré.`);
  };

  const telechargerContrat = () => {
    if (!formValide) { setMessage('Renseigne au moins le nom du client, la date et les heures.'); return; }
    const numero = prochainNumero('CTR');
    genererContratPDF(form, calcul, numero);
    enregistrer('contrat', numero);
    setMessage(`Contrat ${numero} généré.`);
  };

  const reGenerer = (entree) => {
    if (entree.type === 'devis') genererDevisPDF(entree.data, entree.calcul, entree.numero);
    else genererContratPDF(entree.data, entree.calcul, entree.numero);
  };

  const supprimer = (id) => setHistorique(supprimerEntree(id));

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
            </div>
            <label className="notes">
              Notes (optionnel)
              <textarea value={form.notes} onChange={(e) => majChamp('notes', e.target.value)} rows={3} />
            </label>
          </section>

          <section className="carte recap">
            <h2>Récapitulatif</h2>
            <div className="ligne"><span>{calcul.type.label} × {calcul.heures}h</span><span>{formaterEuros(calcul.sousTotal)}</span></div>
            {calcul.totalOptions > 0 && (
              <div className="ligne"><span>Option drone</span><span>{formaterEuros(calcul.totalOptions)}</span></div>
            )}
            <div className="ligne total"><span>Total</span><span>{formaterEuros(calcul.total)}</span></div>
            <div className="ligne petit"><span>Acompte (50%) à la commande</span><span>{formaterEuros(calcul.acompte)}</span></div>
            <div className="ligne petit"><span>Solde (50%) le jour J</span><span>{formaterEuros(calcul.solde)}</span></div>

            <div className="actions">
              <button className="bouton secondaire" onClick={telechargerDevis}>Télécharger le devis (PDF)</button>
              <button className="bouton principal" onClick={telechargerContrat}>Télécharger le contrat (PDF)</button>
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
