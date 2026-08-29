import React from 'react'

export default function Sidebar({ koreaderBooks, paperBooks, selectedId, onSelect, onAddPaperBook }) {
  return (
    <div className="sidebar">
      <div className="sidebar-section-label">Bibliothèque numérique</div>
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

      <div className="sidebar-section-label">Livres papier</div>
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
    </div>
  )
}
