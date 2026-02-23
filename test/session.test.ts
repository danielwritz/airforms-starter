import { describe, expect, it } from 'vitest'
import {
  clearConversationId,
  clearFormSensitivity,
  getOrCreateConversationId,
  getOrCreateFormSensitivity,
  setFormSensitivity
} from '../src/state/session'

describe('session conversation id', () => {
  it('creates and reuses a conversation id', () => {
    const storage = window.sessionStorage
    clearConversationId(storage)

    const first = getOrCreateConversationId(storage)
    const second = getOrCreateConversationId(storage)

    expect(first).toBe(second)
    expect(first.startsWith('c_')).toBe(true)
  })

  it('creates, persists, and clamps form sensitivity', () => {
    const storage = window.sessionStorage
    clearFormSensitivity(storage)

    const initial = getOrCreateFormSensitivity(storage)
    const updated = setFormSensitivity(4, storage)
    const persisted = getOrCreateFormSensitivity(storage)
    const clampedHigh = setFormSensitivity(99, storage)
    const clampedLow = setFormSensitivity(0, storage)

    expect(initial).toBe(10)
    expect(updated).toBe(4)
    expect(persisted).toBe(4)
    expect(clampedHigh).toBe(10)
    expect(clampedLow).toBe(1)
  })
})
