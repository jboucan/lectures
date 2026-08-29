import React, { useEffect, useState, useCallback } from 'react'
import * as auth from './dropboxAuth.js'
import { getSettings, saveSettings, defaultRedirectUri } from './settings.js'
import {
  loadKoreaderLibrary,
  loadGeneralNotes,
  saveGeneralNotes,
  loadBookOverrides,
  saveBookOverrides,
  loadPaperBooks,
  savePaperBooks,
  newPaperBookId,
} from './library.js'
import SetupScreen from './components/SetupScreen.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import BookDetail from './components/BookDetail.jsx'
import NewPaperBookModal from './components/NewPaperBookModal.jsx'

export default function App() {
  // `settings` is the persisted, active config (localStorage key
  // "lectures_settings"). `showSetup` just controls which screen is on
  // screen right now — it does NOT wipe `settings`, so the setup form can
  // be pre-filled with the current values when the person reopens it.
  const [settings, setSettings] = useState(() => getSettings())
  const [showSetup, setShowSetup] = useState(() => !getSettings())
  const [booting, setBooting] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(null)

  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [libraryError, setLibraryError] = useState(null)
  const [koreaderBooks, setKoreaderBooks] = useState([])
  const [paperBooks, setPaperBooks] = useState([])
  const [generalNotes, setGeneralNotes] = useState({})
  const [bookOverrides, setBookOverrides] = useState({})

  const [selectedId, setSelectedId] = useState(null)
  const [showNewPaperBook, setShowNewPaperBook] = useState(false)

  // 1. Handle the OAuth redirect (if any), then check login state.
  useEffect(() => {
    async function boot() {
      if (!settings) {
        setBooting(false)
        return
      }
      try {
        await auth.handleRedirectCallback({
          clientId: settings.clientId,
          redirectUri: settings.redirectUri,
        })
      } catch (err) {
        setAuthError(err.message)
      }
      setAuthed(auth.isLoggedIn())
      setBooting(false)
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reloadLibrary = useCallback(async () => {
    if (!settings || !authed) return
    setLoadingLibrary(true)
    setLibraryError(null)
    try {
      const token = await auth.ensureValidAccessToken(settings.clientId)
      const [kr, notes, overrides, paper] = await Promise.all([
        loadKoreaderLibrary(token, settings.koreaderFolder),
        loadGeneralNotes(token, settings.appDataFolder),
        loadBookOverrides(token, settings.appDataFolder),
        loadPaperBooks(token, settings.appDataFolder),
      ])
      setKoreaderBooks(kr)
      setGeneralNotes(notes)
      setBookOverrides(overrides)
      setPaperBooks(paper)
    } catch (err) {
      setLibraryError(describeDropboxError(err.message))
    } finally {
      setLoadingLibrary(false)
    }
  }, [settings, authed])

  useEffect(() => {
    reloadLibrary()
  }, [reloadLibrary])

  function handleSetupComplete(newSettings) {
    const previous = settings
    saveSettings(newSettings)
    setSettings(newSettings)
    setShowSetup(false)

    // If the App key changed, any stored token belongs to a *different*
    // Dropbox app and will not work (it'll fail, often with a confusing
    // "this app is disabled" error if the old app was later deleted).
    // Force a fresh login whenever the key changes.
    if (!previous || previous.clientId !== newSettings.clientId) {
      auth.clearTokens()
      setAuthed(false)
      setKoreaderBooks([])
      setPaperBooks([])
      setGeneralNotes({})
      setBookOverrides({})
      setSelectedId(null)
      setAuthError(null)
    }
  }

  function handleLogout() {
    auth.clearTokens()
    setAuthed(false)
    setKoreaderBooks([])
    setPaperBooks([])
    setGeneralNotes({})
    setBookOverrides({})
    setSelectedId(null)
  }

  function openSettings() {
    setShowSetup(true)
  }

  function cancelSettings() {
    // Only allowed to bail out if we already have a working config.
    if (settings) setShowSetup(false)
  }

  async function persistGeneralNote(bookId, text) {
    const token = await auth.ensureValidAccessToken(settings.clientId)
    const next = { ...generalNotes, [bookId]: text }
    setGeneralNotes(next)
    await saveGeneralNotes(token, settings.appDataFolder, next)
  }

  async function persistBookOverride(bookId, override) {
    const token = await auth.ensureValidAccessToken(settings.clientId)
    const next = { ...bookOverrides, [bookId]: override }
    setBookOverrides(next)
    await saveBookOverrides(token, settings.appDataFolder, next)
  }

  async function clearBookOverride(bookId) {
    const token = await auth.ensureValidAccessToken(settings.clientId)
    const next = { ...bookOverrides }
    delete next[bookId]
    setBookOverrides(next)
    await saveBookOverrides(token, settings.appDataFolder, next)
  }

  async function persistPaperBooks(next) {
    const token = await auth.ensureValidAccessToken(settings.clientId)
    setPaperBooks(next)
    await savePaperBooks(token, settings.appDataFolder, next)
  }

  async function handleCreatePaperBook({ title, author }) {
    const book = { id: newPaperBookId(), title, author, entries: [] }
    await persistPaperBooks([...paperBooks, book])
    setShowNewPaperBook(false)
    setSelectedId(book.id)
  }

  async function handleAddEntry(bookId, entry) {
    const next = paperBooks.map((b) =>
      b.id === bookId ? { ...b, entries: [...b.entries, entry] } : b
    )
    await persistPaperBooks(next)
  }

  async function handleDeleteEntry(bookId, entryId) {
    const next = paperBooks.map((b) =>
      b.id === bookId ? { ...b, entries: b.entries.filter((e) => e.id !== entryId) } : b
    )
    await persistPaperBooks(next)
  }

  async function handleDeletePaperBook(bookId) {
    const next = paperBooks.filter((b) => b.id !== bookId)
    await persistPaperBooks(next)
    if (selectedId === bookId) setSelectedId(null)
  }

  if (booting) return null

  if (showSetup) {
    return (
      <SetupScreen
        initial={settings}
        defaultRedirectUri={defaultRedirectUri()}
        onComplete={handleSetupComplete}
        onCancel={settings ? cancelSettings : null}
      />
    )
  }

  if (!authed) {
    return (
      <LoginScreen
        settings={settings}
        error={authError}
        onEditSettings={openSettings}
      />
    )
  }

  function withOverride(book) {
    const o = bookOverrides[book.id]
    if (!o) return book
    return { ...book, title: o.title || book.title, author: o.author ?? book.author }
  }

  const displayKoreaderBooks = koreaderBooks.map(withOverride)
  const allBooks = [...displayKoreaderBooks, ...paperBooks]
  const selectedBook = allBooks.find((b) => b.id === selectedId) || null

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-brand">Lectures</div>
        <div className="topbar-actions">
          {loadingLibrary && <span className="save-state">chargement…</span>}
          <button className="icon-btn" onClick={reloadLibrary}>Actualiser</button>
          <button className="icon-btn" onClick={openSettings}>Réglages</button>
          <button className="icon-btn" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>

      <div className="main-area">
        <Sidebar
          koreaderBooks={displayKoreaderBooks}
          paperBooks={paperBooks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddPaperBook={() => setShowNewPaperBook(true)}
        />

        <div className="detail-pane">
          {libraryError && <div className="error-banner">{libraryError}</div>}

          {!selectedBook && !libraryError && (
            <div className="detail-empty">Choisis un livre dans la liste.</div>
          )}

          {selectedBook && (
            <BookDetail
              book={selectedBook}
              generalNote={generalNotes[selectedBook.id] || ''}
              onSaveNote={(text) => persistGeneralNote(selectedBook.id, text)}
              onAddEntry={(entry) => handleAddEntry(selectedBook.id, entry)}
              onDeleteEntry={(entryId) => handleDeleteEntry(selectedBook.id, entryId)}
              onDeleteBook={() => handleDeletePaperBook(selectedBook.id)}
              hasTitleOverride={Boolean(bookOverrides[selectedBook.id])}
              onSaveTitleOverride={(override) => persistBookOverride(selectedBook.id, override)}
              onResetTitleOverride={() => clearBookOverride(selectedBook.id)}
            />
          )}
        </div>
      </div>

      {showNewPaperBook && (
        <NewPaperBookModal
          onCancel={() => setShowNewPaperBook(false)}
          onCreate={handleCreatePaperBook}
        />
      )}
    </div>
  )
}

// Translates a couple of common, confusing Dropbox API errors into
// something actionable in French. Falls through to the raw message
// otherwise so nothing gets silently swallowed.
function describeDropboxError(message) {
  if (/currently disabled/i.test(message)) {
    return (
      "Dropbox refuse la requête : l'app associée à ce token est désactivée. " +
      "Vérifie le statut de ton app sur console.dropbox.com/apps, puis " +
      "Réglages → ressaisis (ou confirme) la App key pour forcer une reconnexion."
    )
  }
  if (/missing_scope/i.test(message)) {
    return (
      "Il manque une permission côté Dropbox. Dans console.dropbox.com/apps → " +
      "ton app → Permissions, coche files.metadata.read, files.metadata.write, " +
      "files.content.read et files.content.write, clique Submit, puis " +
      "Déconnexion / reconnexion ici (les permissions ne s'appliquent qu'aux " +
      "nouveaux tokens)."
    )
  }
  return message
}
