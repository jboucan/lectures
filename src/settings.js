const SETTINGS_KEY = 'lectures_settings'

export function defaultRedirectUri() {
  return window.location.origin + window.location.pathname
}

export function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY)
}
