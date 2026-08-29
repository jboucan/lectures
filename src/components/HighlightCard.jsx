import React from 'react'
import { colorForName, drawerClass } from '../colors.js'

export default function HighlightCard({ highlight, bookTitle, bookAuthor }) {
  const style = { '--hl-color': colorForName(highlight.color) }
  const cls = `highlight-card drawer-${drawerClass(highlight.drawer)}`
  const source = [bookTitle, bookAuthor].filter(Boolean).join(' — ')

  return (
    <div className={cls} style={style}>
      <p className="highlight-text">{highlight.text}</p>
      {highlight.note && <p className="highlight-note">{highlight.note}</p>}
      <div className="highlight-footer">
        {source && <span className="highlight-source">{source}</span>}
        {highlight.pageno != null && <span>p. {highlight.pageno}</span>}
      </div>
    </div>
  )
}
