import React, { useState } from 'react'

export default function NewPaperBookModal({ onCancel, onCreate }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({ title: title.trim(), author: author.trim() })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(36,34,25,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 10,
      }}
      onClick={onCancel}
    >
      <form
        className="setup-card"
        style={{ maxWidth: 380 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="setup-title" style={{ fontSize: '1.3rem' }}>Nouveau livre papier</h2>
        <div className="field">
          <label htmlFor="title">Titre</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="author">Auteur (optionnel)</label>
          <input id="author" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" type="submit">Créer</button>
          <button className="btn-ghost" type="button" onClick={onCancel}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
