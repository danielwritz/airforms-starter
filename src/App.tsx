import { useMemo, useState } from 'react'
import { ChatUIRenderer } from '@airforms/renderer-react'
import type { UiFrame } from '@airforms/renderer-react'
import type { TurnRequest, TurnResponse, UiSubmit } from '@airforms/ui-schema'
import { sendTurn } from './api/orchestrator'
import { clearConversationId, getOrCreateConversationId } from './state/session'
import type { ChatMessage, TurnDebugEntry } from './types/chat'
import './app.css'

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createTurnId() {
  return `turn-${createMessageId()}`
}

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function hasSliderIntent(text?: string): boolean {
  return /\bsliders?\b|\brange\b|\bscale\b/i.test(text ?? '')
}

function assistantMentionsSlider(response: TurnResponse): boolean {
  return response.messages.some((message) => /\bslider\b|\brange\b|\bscale\b/i.test(message.text))
}

function readPatchedComponents(response: TurnResponse): string[] {
  const meta = response.messages[0]?.meta
  if (!meta || typeof meta !== 'object') {
    return []
  }

  const componentIntent = (meta as Record<string, unknown>).componentIntent
  if (!componentIntent || typeof componentIntent !== 'object') {
    return []
  }

  const patched = (componentIntent as Record<string, unknown>).patched
  if (!Array.isArray(patched)) {
    return []
  }

  return patched.filter((value): value is string => typeof value === 'string')
}

function findFirstSlider(details: TurnDebugEntry): { id: string; min: number; max: number; step: number } | undefined {
  const components = details.response?.ui?.components ?? []
  const slider = components.find((component) => component.type === 'slider')
  if (!slider) {
    return undefined
  }

  return {
    id: slider.id,
    min: slider.min,
    max: slider.max,
    step: slider.step
  }
}

function mapAssistantMessages(response: TurnResponse): ChatMessage[] {
  const mapped: ChatMessage[] = response.messages.map((message) => ({
    id: createMessageId(),
    role: 'assistant' as const,
    text: message.text
  }))

  if (!response.ui) {
    return mapped
  }

  if (mapped.length === 0) {
    return [
      {
        id: createMessageId(),
        role: 'assistant',
        text: 'Please review this form.',
        ui: toRendererFrame(response)
      }
    ]
  }

  mapped[mapped.length - 1] = {
    ...mapped[mapped.length - 1],
    ui: toRendererFrame(response)
  }

  return mapped
}

function toRendererFrame(response: TurnResponse): UiFrame | undefined {
  if (!response.ui) {
    return undefined
  }

  return {
    ...response.ui,
    state: {
      values: response.ui.state.values as Record<string, unknown>
    }
  } as UiFrame
}

export function App() {
  const conversationId = useMemo(() => getOrCreateConversationId(), [])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [activeFrameId, setActiveFrameId] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [turns, setTurns] = useState<TurnDebugEntry[]>([])

  const applyTurn = async (request: TurnRequest, appendUserText?: string) => {
    setPending(true)
    setError(undefined)

    const turnId = createTurnId()
    const createdAt = new Date().toISOString()

    setTurns((previous) => [
      {
        id: turnId,
        createdAt,
        request,
        responseHasUi: false,
        responseHasSlider: false,
        requestAskedSlider: request.message.type === 'ui_submit' ? false : hasSliderIntent(request.message.text),
        assistantMentionsSlider: false,
        sliderIntentMismatch: false,
        patchedComponents: []
      },
      ...previous
    ])

    if (appendUserText) {
      setMessages((previous) => [...previous, { id: createMessageId(), role: 'user', text: appendUserText }])
    }

    try {
      const response = await sendTurn(request)
      const responseHasSlider = Boolean(response.ui?.components.some((component) => component.type === 'slider'))
      const assistantSaysSlider = assistantMentionsSlider(response)
      const patchInfo = readPatchedComponents(response)

      setTurns((previous) =>
        previous.map((entry) =>
          entry.id === turnId
            ? {
                ...entry,
                response,
                responseHasUi: Boolean(response.ui),
                responseHasSlider,
                assistantMentionsSlider: assistantSaysSlider,
                sliderIntentMismatch: entry.requestAskedSlider && !responseHasSlider,
                patchedComponents: patchInfo
              }
            : entry
        )
      )

      setMessages((previous) => [...previous, ...mapAssistantMessages(response)])
      setActiveFrameId(response.ui?.frameId)
    } catch (nextError) {
      const errorMessage = nextError instanceof Error ? nextError.message : 'Unexpected error while calling orchestrator.'
      setError(errorMessage)
      setTurns((previous) =>
        previous.map((entry) =>
          entry.id === turnId
            ? {
                ...entry,
                error: errorMessage
              }
            : entry
        )
      )
    } finally {
      setPending(false)
    }
  }

  const submitUserText = async () => {
    const trimmed = text.trim()
    if (!trimmed || pending) {
      return
    }

    setText('')
    await applyTurn(
      {
        conversationId,
        message: {
          type: 'user_text',
          text: trimmed
        }
      },
      trimmed
    )
  }

  const submitFrame = async (submit: UiSubmit) => {
    if (pending) {
      return
    }

    await applyTurn({
      conversationId,
      message: submit
    })
  }

  return (
    <main
      className="airforms-app"
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        color: '#111827'
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>Airforms Starter</h1>
        <p style={{ margin: '8px 0 0', color: '#4b5563' }}>Conversation ID: {conversationId}</p>
      </header>

      <div className="airforms-layout">
        <section>
          <section
            className="airforms-chat-transcript"
            aria-label="Chat transcript"
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              minHeight: 220,
              background: '#f9fafb'
            }}
          >
            {messages.length === 0 && <p style={{ margin: 0, color: '#6b7280' }}>No messages yet.</p>}
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant'

              return (
                <article
                  key={message.id}
                  className={isAssistant ? 'airforms-message airforms-message-assistant' : 'airforms-message airforms-message-user'}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    background: isAssistant ? '#ffffff' : '#eff6ff'
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>{isAssistant ? 'Assistant' : 'You'}:</strong> {message.text}
                  </p>

                  {message.ui && (
                    <div
                      className="airforms-generated-ui"
                      style={{
                        marginTop: 10,
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: 10
                      }}
                    >
                      <ChatUIRenderer frame={message.ui} onSubmit={(submit) => void submitFrame(submit)} disabled={pending || activeFrameId !== message.ui.frameId} />
                    </div>
                  )}
                </article>
              )
            })}
          </section>

          <section
            className="airforms-compose"
            aria-label="Compose message"
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              padding: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#ffffff'
            }}
          >
            <input
              aria-label="Message"
              value={text}
              disabled={pending}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submitUserText()
                }
              }}
              placeholder="Type a message"
              style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}
            />
            <button
              type="button"
              disabled={pending || text.trim().length === 0}
              onClick={() => void submitUserText()}
              style={{ borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#ffffff', padding: '0 14px' }}
            >
              Send
            </button>
            <button
              type="button"
              disabled={pending}
              style={{ borderRadius: 8, border: '1px solid #d1d5db', background: '#ffffff', padding: '0 12px' }}
              onClick={() => {
                clearConversationId()
                window.location.reload()
              }}
            >
              New Session
            </button>
          </section>

          {error && (
            <section aria-label="Error" style={{ color: '#b00020', marginBottom: 12, padding: 10, border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2' }}>
              {error}
            </section>
          )}
        </section>

        <aside className="airforms-debug-panel" aria-label="Turn JSON inspector">
          <h2>Turn JSON Inspector</h2>
          <p>Raw payloads sent to and returned from the orchestrator.</p>

          {turns.length === 0 ? <p className="airforms-debug-empty">No turns yet.</p> : null}

          {turns.map((turn, index) => {
            const firstSlider = findFirstSlider(turn)

            return (
              <article key={turn.id} className="airforms-debug-turn">
                <header className="airforms-debug-turn-header">
                  <strong>Turn {turns.length - index}</strong>
                  <span>{new Date(turn.createdAt).toLocaleTimeString()}</span>
                </header>

                <div className="airforms-debug-badges">
                  <span className="airforms-debug-badge">{turn.request.message.type}</span>
                  {turn.responseHasUi ? <span className="airforms-debug-badge airforms-debug-badge-ui">ui_frame</span> : null}
                  {turn.responseHasSlider ? <span className="airforms-debug-badge airforms-debug-badge-slider">slider</span> : null}
                  {turn.sliderIntentMismatch ? <span className="airforms-debug-badge airforms-debug-badge-mismatch">slider-mismatch</span> : null}
                  {turn.patchedComponents.length > 0 ? <span className="airforms-debug-badge airforms-debug-badge-patched">patched</span> : null}
                </div>

                <h3>Request</h3>
                <pre className="airforms-debug-json">{toPrettyJson(turn.request)}</pre>

                {turn.error ? (
                  <section className="airforms-debug-error" aria-label="Turn error">
                    {turn.error}
                  </section>
                ) : (
                  <>
                    <h3>Response</h3>
                    <pre className="airforms-debug-json">{toPrettyJson(turn.response ?? { status: 'pending' })}</pre>

                    {turn.response?.ui ? (
                      <section className="airforms-slider-diagnostics" aria-label="Slider diagnostics">
                        <h3>Slider diagnostics</h3>
                        <ul>
                          <li>requestAskedSlider: {String(turn.requestAskedSlider)}</li>
                          <li>assistantMentionsSlider: {String(turn.assistantMentionsSlider)}</li>
                          <li>sliderIntentMismatch: {String(turn.sliderIntentMismatch)}</li>
                          <li>patchedComponents: {turn.patchedComponents.length > 0 ? turn.patchedComponents.join(', ') : 'none'}</li>
                        </ul>
                        {firstSlider ? (
                          <ul>
                            <li>componentId: {firstSlider.id}</li>
                            <li>
                              range: {firstSlider.min} to {firstSlider.max} (step {firstSlider.step})
                            </li>
                            <li>activeFrameId: {activeFrameId ?? 'none'}</li>
                            <li>
                              renderDisabled: {String(pending || activeFrameId !== turn.response.ui?.frameId)}
                            </li>
                          </ul>
                        ) : (
                          <p className="airforms-slider-warning">No slider component in this ui_frame response.</p>
                        )}
                      </section>
                    ) : null}
                  </>
                )}
              </article>
            )
          })}
        </aside>
      </div>
    </main>
  )
}
