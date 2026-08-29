import React, { useState } from 'react'

export default function Sidebar({ koreaderBooks, paperBooks, selectedId, onSelect, onAddPaperBook }) {
  const [digitalOpen, setDigitalOpen] = useState(true)
  const [paperOpen, setPaperOpen] = useState(true)

  return (
    <div className="sidebar">
      <button
        type="button"
        className="sidebar-section-label sidebar-section-toggle"
        aria-expanded={digitalOpen}
        onClick={() => setDigitalOpen((v) => !v)}
      >
        <span>Bibliothèque numérique</span>
        <span className="sidebar-section-caret">{digitalOpen ? '−' : '+'}</span>
      </button>
      {digitalOpen && (
        <>
          {koreaderBooks.length === 0 && (
            <div className="book-row" style={{ color: 'var(--ink-faint)', cursor: 'default' }}>
              Aucun surlignage trouvé
            </div>
          )}
          {koreaderBooks.map((book) => (
            <button
              key={book.id}
              className={`book-row${selectedId === book.id ? ' active' : ''}`}
              onClick={() => onSelect(book.id)}
            >
              {book.title}
              <span className="book-count">{book.highlights.length} surlignage(s)</span>
            </button>
          ))}
        </>
      )}

      <button
        type="button"
        className="sidebar-section-label sidebar-section-toggle"
        aria-expanded={paperOpen}
        onClick={() => setPaperOpen((v) => !v)}
      >
        <span>Livres papier</span>
        <span className="sidebar-section-caret">{paperOpen ? '−' : '+'}</span>
      </button>
      {paperOpen && (
        <>
          {paperBooks.map((book) => (
            <button
              key={book.id}
              className={`book-row${selectedId === book.id ? ' active' : ''}`}
              onClick={() => onSelect(book.id)}
            >
              {book.title}
              <span className="book-count">{book.entries.length} entrée(s)</span>
            </button>
          ))}
          <button className="add-paper-book-btn" onClick={onAddPaperBook}>
            + Ajouter un livre papier
          </button>
        </>
      )}
    </div>
  )
}
