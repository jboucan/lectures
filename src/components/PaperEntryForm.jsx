import React, { useState } from 'react'

export default function PaperEntryForm({ onCancel, onSubmit }) {
  const [page, setPage] = useState('')
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit({
      page: page.trim(),
      text: text.trim(),
      date: new Date().toISOString().slice(0, 10),
    })
    setPage('')
    setText('')
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="entry-form-row">
        <div style={{ maxWidth: 140 }}>
          <label htmlFor="page">Page</label>
          <input id="page" type="text" value={page} onChange={(e) => setPage(e.target.value)} placeholder="ex : 42" />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="text">Citation ou note</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Recopie le passage ou note ton idée…"
          autoFocus
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-primary" type="submit">Ajouter</button>
        <button className="btn-ghost" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  )
}
