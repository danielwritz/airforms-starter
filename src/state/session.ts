const KEY = 'airforms-starter:conversationId'

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
