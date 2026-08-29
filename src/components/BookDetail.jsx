import React, { useEffect, useRef, useState } from 'react'
import HighlightCard from './HighlightCard.jsx'
import PaperEntryForm from './PaperEntryForm.jsx'
import { newEntryId } from '../library.js'

function groupByChapter(highlights) {
  const groups = []
  let current = null
  for (const h of highlights) {
    const label = h.chapter || 'Sans chapitre'
    if (!current || current.label !== label) {
      current = { label, items: [] }
      groups.push(current)
    }
    current.items.push(h)
  }
  return groups
}

function BookTitleEditor({ book, onSave, onCancel }) {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), author: author.trim() || null })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="book-title-editor" onSubmit={handleSubmit}>
      <input
        type="text"
        className="book-title-editor-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        autoFocus
      />
      <input
        type="text"
        className="book-title-editor-author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Auteur"
      />
      <div className="book-title-editor-actions">
        <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
          Enregistrer
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
      </div>
    </form>
  )
}

function GeneralNotes({ initialText, onSave }) {
  const [text, setText] = useState(initialText)
  const [state, setState] = useState('idle') // idle | pending | saving | saved
  const timerRef = useRef(null)

  useEffect(() => setText(initialText), [initialText])

  function handleChange(e) {
    const value = e.target.value
    setText(value)
    setState('pending')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setState('saving')
      try {
        await onSave(value)
        setState('saved')
      } catch {
        setState('idle')
      }
    }, 800)
  }

  const stateLabel = { idle: '', pending: 'en attente…', saving: 'enregistrement…', saved: 'enregistré' }[state]

  return (
    <div className="notes-block">
      <div className="notes-label">
        <span>Notes générales</span>
        <span className="save-state">{stateLabel}</span>
      </div>
      <textarea
        className="notes-textarea"
        value={text}
        onChange={handleChange}
        placeholder="Impressions, résumé, ce que tu veux retenir de ce livre…"
      />
    </div>
  )
}

export default function BookDetail({
  book,
  generalNote,
  onSaveNote,
  onAddEntry,
  onDeleteEntry,
  onDeleteBook,
  hasTitleOverride,
  onSaveTitleOverride,
  onResetTitleOverride,
}) {
  const isPaper = book.source === 'paper'
  const [showForm, setShowForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  async function handleAdd({ page, text, date }) {
    await onAddEntry({ id: newEntryId(), page, text, date })
    setShowForm(false)
  }

  async function handleSaveTitleOverride(override) {
    await onSaveTitleOverride(override)
    setEditingTitle(false)
  }

  return (
    <div>
      <div className="book-header">
        {editingTitle ? (
          <BookTitleEditor
            book={book}
            onSave={handleSaveTitleOverride}
            onCancel={() => setEditingTitle(false)}
          />
        ) : (
          <>
            <h2 className="book-title">{book.title}</h2>
            <div className="book-meta">
              {isPaper ? 'Livre papier' : 'KOReader'}
              {book.author ? ` · ${book.author}` : ''}
              {!isPaper && (
                <button className="link-btn" onClick={() => setEditingTitle(true)}>
                  corriger titre/auteur
                </button>
              )}
              {!isPaper && hasTitleOverride && (
                <button className="link-btn" onClick={onResetTitleOverride}>
                  réinitialiser
                </button>
              )}
              {isPaper && (
                <button className="link-btn" onClick={onDeleteBook}>supprimer ce livre</button>
              )}
            </div>
          </>
        )}
      </div>

      <GeneralNotes initialText={generalNote} onSave={onSaveNote} />

      {isPaper ? (
        <>
          {!showForm && (
            <button className="btn-primary" style={{ marginBottom: 18 }} onClick={() => setShowForm(true)}>
              + Ajouter une entrée
            </button>
          )}
          {showForm && <PaperEntryForm onCancel={() => setShowForm(false)} onSubmit={handleAdd} />}

          {[...book.entries].reverse().map((entry) => (
            <div key={entry.id} className="highlight-card drawer-lighten" style={{ '--hl-color': 'var(--hl-gray)' }}>
              <p className="highlight-text">{entry.text}</p>
              <div className="highlight-footer">
                {(book.title || book.author) && (
                  <span className="highlight-source">
                    {[book.title, book.author].filter(Boolean).join(' — ')}
                  </span>
                )}
                {entry.page && <span className="highlight-page">p.&nbsp;{entry.page}</span>}
                {entry.date && <span>{entry.date}</span>}
                <button
                  className="link-btn"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => onDeleteEntry(entry.id)}
                >
                  supprimer
                </button>
              </div>
            </div>
          ))}
          {book.entries.length === 0 && !showForm && (
            <p style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              Aucune entrée pour l'instant.
            </p>
          )}
        </>
      ) : (
        groupByChapter(book.highlights).map((group, i) => (
          <div className="chapter-group" key={i}>
            <div className="chapter-label">{group.label}</div>
            {group.items.map((h, j) => (
              <HighlightCard key={j} highlight={h} bookTitle={book.title} bookAuthor={book.author} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
