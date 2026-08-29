import React, { useState } from 'react'

export default function SetupScreen({ initial, onComplete, defaultRedirectUri, onCancel }) {
  const [clientId, setClientId] = useState(initial?.clientId || '')
  const [redirectUri, setRedirectUri] = useState(initial?.redirectUri || defaultRedirectUri)
  const [koreaderFolder, setKoreaderFolder] = useState(initial?.koreaderFolder || '/koreader/highlights')
  const [appDataFolder, setAppDataFolder] = useState(initial?.appDataFolder || '/koreader/lectures')

  function handleSubmit(e) {
    e.preventDefault()
    if (!clientId.trim()) return
    onComplete({
      clientId: clientId.trim(),
      redirectUri: redirectUri.trim(),
      koreaderFolder: koreaderFolder.trim().replace(/\/$/, ''),
      appDataFolder: appDataFolder.trim().replace(/\/$/, ''),
    })
  }

  const clientIdChanged = initial && clientId.trim() !== initial.clientId

  return (
    <div className="centered-screen">
      <form className="setup-card" onSubmit={handleSubmit}>
        <h1 className="setup-title">Lectures</h1>
        <p className="setup-subtitle">
          Connecte ton Dropbox pour lire tes surlignages KOReader et gérer tes
          notes. Ces réglages restent dans ce navigateur (localStorage), rien
          n'est envoyé ailleurs qu'à Dropbox.
        </p>

        <div className="field">
          <label htmlFor="clientId">Clé d'app Dropbox (App key)</label>
          <input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="ex : 8fj29xk3q7z1abc"
            required
          />
          <p className="field-hint">
            Créée sur console.dropbox.com/apps (accès « Scoped access »).
            Active files.metadata.read, files.metadata.write,
            files.content.read et files.content.write dans l'onglet
            Permissions, puis clique Submit.
          </p>
          {clientIdChanged && (
            <p className="field-hint" style={{ color: 'var(--hl-red)' }}>
              Tu changes de App key : ta connexion Dropbox actuelle sera
              coupée et il faudra te reconnecter, car un token n'est valable
              que pour l'app qui l'a émis.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="redirectUri">URL de redirection</label>
          <input
            id="redirectUri"
            type="text"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            required
          />
          <p className="field-hint">
            Ajoute exactement cette URL dans « Redirect URIs » de ta console
            Dropbox (une pour le localhost de dev, une pour le site déployé).
          </p>
        </div>

        <div className="field">
          <label htmlFor="krFolder">Dossier des exports KOReader</label>
          <input
            id="krFolder"
            type="text"
            value={koreaderFolder}
            onChange={(e) => setKoreaderFolder(e.target.value)}
          />
          <p className="field-hint">
            Chemin Dropbox du dossier (ou fichier) créé par le plugin
            « highlights » de KOReader. Si ton app Dropbox est de type
            « App folder », ce chemin est relatif à ce dossier dédié — pas
            besoin du préfixe /Apps/....
          </p>
        </div>

        <div className="field">
          <label htmlFor="appFolder">Dossier de données Lectures</label>
          <input
            id="appFolder"
            type="text"
            value={appDataFolder}
            onChange={(e) => setAppDataFolder(e.target.value)}
          />
          <p className="field-hint">
            Où seront rangées tes notes générales et tes livres papier — jamais
            dans le dossier KOReader, pour ne pas interférer avec sa synchro.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" type="submit">
            {initial ? 'Enregistrer' : 'Continuer'}
          </button>
          {onCancel && (
            <button className="btn-ghost" type="button" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
