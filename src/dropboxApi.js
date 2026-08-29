// Minimal Dropbox API v2 client using plain fetch (no SDK dependency).
// https://www.dropbox.com/developers/documentation/http/documentation

const RPC_ROOT = 'https://api.dropboxapi.com/2'
const CONTENT_ROOT = 'https://content.dropboxapi.com/2'

class DropboxNotFoundError extends Error {}
// Path exists but points at a file where a folder was expected (or vice
// versa). Distinct from DropboxNotFoundError so callers can tell "wrong
// kind of thing" apart from "doesn't exist" and from any other API error.
class DropboxNotFolderError extends Error {}
export { DropboxNotFoundError, DropboxNotFolderError }

// The Dropbox-API-Arg header must be ISO-8859-1 (browsers throw a TypeError
// otherwise), but paths routinely contain characters outside that range —
// typographic quotes, em dashes, etc. Dropbox's own docs recommend escaping
// anything non-ASCII as \uXXXX so the header stays a plain ASCII string.
// https://www.dropbox.com/developers/reference/json-encoding
function httpHeaderSafeJson(args) {
  return JSON.stringify(args).replace(
    /[-￿]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
  )
}

async function rpc(token, path, args = {}) {
  const res = await fetch(`${RPC_ROOT}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 409 && /not_found/.test(text)) {
      throw new DropboxNotFoundError(text)
    }
    if (res.status === 409 && /not_folder/.test(text)) {
      throw new DropboxNotFolderError(text)
    }
    throw new Error(`Dropbox API (${path}) : ${res.status} ${text}`)
  }
  return res.json()
}

/** Lists entries in a folder. Throws DropboxNotFoundError if the path doesn't exist. */
export async function listFolder(token, path) {
  const data = await rpc(token, '/files/list_folder', { path, recursive: false })
  let entries = data.entries
  let cursor = data.cursor
  let hasMore = data.has_more
  while (hasMore) {
    const more = await rpc(token, '/files/list_folder/continue', { cursor })
    entries = entries.concat(more.entries)
    cursor = more.cursor
    hasMore = more.has_more
  }
  return entries
}

/** Returns metadata for a single path (file or folder). Throws DropboxNotFoundError if missing. */
export async function getMetadata(token, path) {
  return rpc(token, '/files/get_metadata', { path })
}

/** Downloads a file's content as text. Throws DropboxNotFoundError if missing. */
export async function downloadFile(token, path) {
  const res = await fetch(`${CONTENT_ROOT}/files/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': httpHeaderSafeJson({ path }),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 409 && /not_found/.test(text)) {
      throw new DropboxNotFoundError(text)
    }
    throw new Error(`Dropbox download (${path}) : ${res.status} ${text}`)
  }
  return res.text()
}

/** Uploads (overwrites) a file with the given string content. Creates parent folders as needed. */
export async function uploadFile(token, path, contentString) {
  const res = await fetch(`${CONTENT_ROOT}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': httpHeaderSafeJson({
        path,
        mode: 'overwrite',
        autorename: false,
        mute: true,
      }),
    },
    body: new Blob([contentString], { type: 'application/json' }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dropbox upload (${path}) : ${res.status} ${text}`)
  }
  return res.json()
}
