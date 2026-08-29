import React from 'react'
import * as auth from '../dropboxAuth.js'

export default function LoginScreen({ settings, error, onEditSettings }) {
  return (
    <div className="centered-screen">
      <div className="setup-card">
        <h1 className="setup-title">Lectures</h1>
        <p className="setup-subtitle">
          Connecte-toi à Dropbox pour accéder à ta bibliothèque.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px 0', marginBottom: 12 }}
          onClick={() => auth.startLogin(settings)}
        >
          Se connecter à Dropbox
        </button>
        <button className="btn-ghost" style={{ width: '100%' }} onClick={onEditSettings}>
          Modifier les réglages
        </button>
      </div>
    </div>
  )
}
