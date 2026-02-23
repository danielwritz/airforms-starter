const KEY = 'airforms-starter:conversationId'
const FORM_SENSITIVITY_KEY = 'airforms-starter:formSensitivity'
const DEFAULT_FORM_SENSITIVITY = 10

function createConversationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `c_${crypto.randomUUID()}`
  }

  return `c_${Date.now()}`
}

export function getOrCreateConversationId(storage: Storage = window.sessionStorage): string {
  const existing = storage.getItem(KEY)
  if (existing && existing.length > 0) {
    return existing
  }

  const next = createConversationId()
  storage.setItem(KEY, next)
  return next
}

export function clearConversationId(storage: Storage = window.sessionStorage): void {
  storage.removeItem(KEY)
}

function normalizeFormSensitivity(value: number): number {
  if (!Number.isInteger(value)) {
    return DEFAULT_FORM_SENSITIVITY
  }

  return Math.min(10, Math.max(1, value))
}

export function getOrCreateFormSensitivity(storage: Storage = window.sessionStorage): number {
  const raw = storage.getItem(FORM_SENSITIVITY_KEY)
  if (raw !== null) {
    const parsed = Number(raw)
    const normalized = normalizeFormSensitivity(parsed)
    storage.setItem(FORM_SENSITIVITY_KEY, String(normalized))
    return normalized
  }

  storage.setItem(FORM_SENSITIVITY_KEY, String(DEFAULT_FORM_SENSITIVITY))
  return DEFAULT_FORM_SENSITIVITY
}

export function setFormSensitivity(value: number, storage: Storage = window.sessionStorage): number {
  const normalized = normalizeFormSensitivity(value)
  storage.setItem(FORM_SENSITIVITY_KEY, String(normalized))
  return normalized
}

export function clearFormSensitivity(storage: Storage = window.sessionStorage): void {
  storage.removeItem(FORM_SENSITIVITY_KEY)
}
