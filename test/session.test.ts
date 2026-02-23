import { describe, expect, it } from 'vitest'
import { clearConversationId, getOrCreateConversationId } from '../src/state/session'

describe('session conversation id', () => {
  it('creates and reuses a conversation id', () => {
    const storage = window.sessionStorage
    clearConversationId(storage)

    const first = getOrCreateConversationId(storage)
    const second = getOrCreateConversationId(storage)

    expect(first).toBe(second)
    expect(first.startsWith('c_')).toBe(true)
  })
})
