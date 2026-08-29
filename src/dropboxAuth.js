// OAuth 2.0 PKCE flow for Dropbox, entirely client-side.
// Docs: https://developers.dropbox.com/oauth-guide

const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'
const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize'

const TOKENS_KEY = 'lectures_dropbox_tokens'
const VERIFIER_KEY = 'lectures_pkce_verifier'
const STATE_KEY = 'lectures_oauth_state'

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes.buffer).slice(0, length)
}

async function sha256(input) {
  const data = new TextEncoder().encode(input)
  return crypto.subtle.digest('SHA-256', data)
}

/** Redirect the browser to Dropbox's consent screen. */
export async function startLogin({ clientId, redirectUri }) {
  const verifier = randomString(64)
  const challenge = base64UrlEncode(await sha256(verifier))
  const state = randomString(24)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
    token_access_type: 'offline', // ask for a refresh token
    state,
  })

  window.location.assign(`${AUTH_URL}?${params.toString()}`)
}

/** Call this on app load. Returns true if a redirect callback was handled. */
export async function handleRedirectCallback({ clientId, redirectUri }) {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error_description') || url.searchParams.get('error')

  if (!code && !error) return false

  // Clean the URL regardless of outcome so the code isn't left in history.
  const cleanUrl = window.location.origin + window.location.pathname
  window.history.replaceState({}, document.title, cleanUrl)

  if (error) {
    throw new Error(error)
  }

  const expectedState = sessionStorage.getItem(STATE_KEY)
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)

  if (!verifier || state !== expectedState) {
    throw new Error("La réponse de Dropbox n'a pas pu être vérifiée (state invalide). Réessaie de te connecter.")
  }

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Échec de l'échange du code Dropbox : ${text}`)
  }

  const data = await res.json()
  storeTokens(data)
  return true
}

function storeTokens(data) {
  const record = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || getStoredTokens()?.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 14400) * 1000,
  }
  localStorage.setItem(TOKENS_KEY, JSON.stringify(record))
  return record
}

export function getStoredTokens() {
  const raw = localStorage.getItem(TOKENS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_KEY)
}

async function refreshAccessToken(clientId) {
  const tokens = getStoredTokens()
  if (!tokens?.refresh_token) throw new Error('Pas de refresh token disponible, reconnecte-toi.')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: clientId,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Échec du rafraîchissement du token Dropbox : ${text}`)
  }

  const data = await res.json()
  return storeTokens(data)
}

/** Returns a valid access token, refreshing it first if it's about to expire. */
export async function ensureValidAccessToken(clientId) {
  const tokens = getStoredTokens()
  if (!tokens) throw new Error('Non connecté à Dropbox.')

  const expiresSoon = Date.now() > tokens.expires_at - 60_000
  if (expiresSoon) {
    const refreshed = await refreshAccessToken(clientId)
    return refreshed.access_token
  }
  return tokens.access_token
}

export function isLoggedIn() {
  return !!getStoredTokens()?.refresh_token
}
