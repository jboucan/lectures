import {
  listFolder,
  downloadFile,
  uploadFile,
  DropboxNotFoundError,
  DropboxNotFolderError,
} from './dropboxApi.js'

// ----------------------------------------------------------------------
// Reading the KOReader "highlights" export.
//
// This plugin's export layout can vary depending on how you configured
// it. Two shapes are common:
//
//   A) A FOLDER containing one .json file per book, each file holding an
//      array of highlight objects (the shape you shared: page, pageno,
//      color, text, datetime, chapter, drawer, pos0, pos1, and sometimes
//      "note" for an annotation attached to that highlight).
//
//   B) A SINGLE .json FILE combining every book, either as
//        { "Book Title": [ ...highlights ], "Other Book": [...] }
//      or as one flat array where each entry carries its own
//      "title"/"book" field.
//
// parseKoreaderFolder() below tries A first (list_folder), and falls
// back to B if the configured path turns out to be a file rather than
// a folder. If your export looks different from both, this is the
// function to adjust — the rest of the app only cares about the
// normalized { id, title, highlights[] } shape it returns.
// ----------------------------------------------------------------------

function normalizeHighlightEntry(raw) {
  return {
    text: raw.text ?? '',
    note: raw.note ?? null,
    color: raw.color ?? 'gray',
    drawer: raw.drawer ?? 'lighten',
    chapter: raw.chapter ?? null,
    pageno: raw.pageno ?? null,
    page: raw.page ?? null,
    datetime: raw.datetime ?? null,
  }
}

function titleFromFilename(name) {
  return name.replace(/\.json$/i, '').replace(/[_-]+/g, ' ').trim()
}

function bookIdFromTitle(title) {
  return 'kr:' + title.toLowerCase().replace(/\s+/g, '-')
}

// A stable id independent of the (possibly API-fetched, possibly
// unavailable-offline) title: prefer the ISBN when we found one, since
// that never changes, and only fall back to the filename-derived title.
function bookIdFor(isbn, fallbackTitle) {
  return isbn ? 'kr:isbn:' + isbn : bookIdFromTitle(fallbackTitle)
}

// ----------------------------------------------------------------------
// ISBN detection (in filenames or book-map titles) + metadata lookup.
//
// Some KOReader exports are named after the book's ISBN (e.g.
// "9782253106023.json"), which makes for an ugly sidebar title. When we
// spot one, we look it up on a public book API (Open Library, with
// Google Books as fallback — both are free, keyless and CORS-enabled)
// to recover a clean title/author. Results are cached in localStorage
// since ISBN metadata never changes and this avoids re-querying on
// every library refresh.
// ----------------------------------------------------------------------

function extractIsbn(str) {
  if (!str) return null

  // Prefer an explicit "isbn"/"isbn13"/"isbn10" label when present (the
  // convention used by Calibre/Anna's Archive-style filenames, e.g.
  // "... isbn13 9782895963301 ...") — it's unambiguous, unlike hunting
  // for bare digit runs in a filename that may also contain a year, a
  // page count or a content-hash.
  const labeled = str.match(/isbn[-_ ]?1?[03]?\s*[:=\-]?\s*([\dXx][\dXx-]{8,16}[\dXx])/i)
  if (labeled) {
    const digits = labeled[1].replace(/[^\dXx]/gi, '')
    if (/^97[89]\d{10}$/.test(digits)) return digits
    if (/^\d{9}[\dXx]$/.test(digits)) return digits.toUpperCase()
  }

  // Otherwise, look for a bare run of digits. Only hyphens are allowed
  // as internal separators here (not spaces) — spaces are the general
  // word separator in these filenames, so allowing them would bridge
  // unrelated numbers (e.g. a trailing "13" from an "isbn13" label, or
  // a nearby publication year) into one bogus candidate.
  const base = str.replace(/\.[a-z0-9]+$/i, '')
  const candidates = base.match(/[\dXx][\dXx-]{8,20}[\dXx]/g) || []
  for (const candidate of candidates) {
    const digits = candidate.replace(/[^\dXx]/gi, '')
    if (/^97[89]\d{10}$/.test(digits)) return digits
    if (/^\d{9}[\dXx]$/.test(digits)) return digits.toUpperCase()
  }
  return null
}

const ISBN_CACHE_KEY = 'lectures_isbn_metadata_cache_v1'

function loadIsbnCache() {
  try {
    return JSON.parse(localStorage.getItem(ISBN_CACHE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveIsbnCache(cache) {
  try {
    localStorage.setItem(ISBN_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // storage full/unavailable: not fatal, we just won't cache
  }
}

async function fetchFromOpenLibrary(isbn) {
  const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
  if (!res.ok) return null
  const data = await res.json()
  const entry = data[`ISBN:${isbn}`]
  if (!entry?.title) return null
  const author = Array.isArray(entry.authors) && entry.authors.length
    ? entry.authors.map((a) => a.name).join(', ')
    : null
  return { title: entry.title, author }
}

async function fetchFromGoogleBooks(isbn) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
  if (!res.ok) return null
  const data = await res.json()
  const info = data.items?.[0]?.volumeInfo
  if (!info?.title) return null
  const author = Array.isArray(info.authors) ? info.authors.join(', ') : null
  return { title: info.title, author }
}

async function fetchBookMetadataByIsbn(isbn) {
  const cache = loadIsbnCache()
  if (isbn in cache) return cache[isbn]
  let meta = null
  try {
    meta = await fetchFromOpenLibrary(isbn)
  } catch {
    // network error: fall through to the second source
  }
  if (!meta) {
    try {
      meta = await fetchFromGoogleBooks(isbn)
    } catch {
      // both sources unreachable: caller falls back to the filename title
    }
  }
  cache[isbn] = meta
  saveIsbnCache(cache)
  return meta
}

function extractHighlightsArray(parsed) {
  // Accepts: a bare array, or an object with a common wrapper key.
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return null
  if (Array.isArray(parsed.highlights)) return parsed.highlights
  if (Array.isArray(parsed.entries)) return parsed.entries
  return null
}

async function parseKoreaderFolder(token, folderPath) {
  const entries = await listFolder(token, folderPath)
  const jsonFiles = entries.filter((e) => e['.tag'] === 'file' && /\.json$/i.test(e.name))

  const books = []
  for (const file of jsonFiles) {
    const raw = await downloadFile(token, file.path_lower)
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue // skip unreadable files rather than crashing the whole library
    }
    const list = extractHighlightsArray(parsed)
    if (!list) continue
    const fallbackTitle = titleFromFilename(file.name)
    const isbn = extractIsbn(file.name)
    const meta = isbn ? await fetchBookMetadataByIsbn(isbn) : null
    books.push({
      id: bookIdFor(isbn, fallbackTitle),
      title: meta?.title || fallbackTitle,
      author: meta?.author || null,
      source: 'koreader',
      highlights: list.map(normalizeHighlightEntry),
    })
  }
  return books
}

async function parseKoreaderSingleFile(token, filePath) {
  const raw = await downloadFile(token, filePath)
  const parsed = JSON.parse(raw)

  // Shape: { "Title": [...highlights] }
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    const maybeBooks = Object.entries(parsed)
    const looksLikeBookMap = maybeBooks.every(([, v]) => Array.isArray(v))
    if (looksLikeBookMap) {
      const books = []
      for (const [title, list] of maybeBooks) {
        const isbn = extractIsbn(title)
        const meta = isbn ? await fetchBookMetadataByIsbn(isbn) : null
        books.push({
          id: bookIdFor(isbn, title),
          title: meta?.title || title,
          author: meta?.author || null,
          source: 'koreader',
          highlights: list.map(normalizeHighlightEntry),
        })
      }
      return books
    }
  }

  // Shape: flat array, entries may carry their own title/book field.
  const flat = extractHighlightsArray(parsed) ?? (Array.isArray(parsed) ? parsed : [])
  const byTitle = new Map()
  for (const entry of flat) {
    if (!entry || typeof entry !== 'object') continue
    const title = entry.title || entry.book || 'Sans titre'
    if (!byTitle.has(title)) byTitle.set(title, [])
    byTitle.get(title).push(normalizeHighlightEntry(entry))
  }
  const books = []
  for (const [title, highlights] of byTitle) {
    const isbn = extractIsbn(title)
    const meta = isbn ? await fetchBookMetadataByIsbn(isbn) : null
    books.push({
      id: bookIdFor(isbn, title),
      title: meta?.title || title,
      author: meta?.author || null,
      source: 'koreader',
      highlights,
    })
  }
  return books
}

export async function loadKoreaderLibrary(token, path) {
  if (!path) return []
  try {
    return await parseKoreaderFolder(token, path)
  } catch (err) {
    if (err instanceof DropboxNotFoundError) return []
    if (err instanceof DropboxNotFolderError) {
      // path exists but isn't a folder -> try as a single combined file
      return parseKoreaderSingleFile(token, path)
    }
    // Any other error (bad path, missing scope, rate limit, ...) is a real
    // problem — let it surface instead of masking it behind a confusing
    // "tried to download a folder" failure from the single-file fallback.
    throw err
  }
}

// ----------------------------------------------------------------------
// App-owned data: general notes per book, and paper books.
// Stored separately from KOReader's own export so this app never writes
// to (or risks corrupting) your KOReader sync files.
// ----------------------------------------------------------------------

async function readJsonOrDefault(token, path, fallback) {
  try {
    const raw = await downloadFile(token, path)
    return JSON.parse(raw)
  } catch (err) {
    if (err instanceof DropboxNotFoundError) return fallback
    throw err
  }
}

export async function loadGeneralNotes(token, appDataFolder) {
  return readJsonOrDefault(token, `${appDataFolder}/general-notes.json`, {})
}

export async function saveGeneralNotes(token, appDataFolder, notesById) {
  await uploadFile(token, `${appDataFolder}/general-notes.json`, JSON.stringify(notesById, null, 2))
}

export async function loadBookOverrides(token, appDataFolder) {
  return readJsonOrDefault(token, `${appDataFolder}/book-overrides.json`, {})
}

export async function saveBookOverrides(token, appDataFolder, overridesById) {
  await uploadFile(token, `${appDataFolder}/book-overrides.json`, JSON.stringify(overridesById, null, 2))
}

export async function loadPaperBooks(token, appDataFolder) {
  return readJsonOrDefault(token, `${appDataFolder}/paper-books.json`, [])
}

export async function savePaperBooks(token, appDataFolder, books) {
  await uploadFile(token, `${appDataFolder}/paper-books.json`, JSON.stringify(books, null, 2))
}

export function newPaperBookId() {
  return 'paper:' + crypto.randomUUID()
}

export function newEntryId() {
  return crypto.randomUUID()
}
