import type { AssistantMessage, TurnRequest, TurnResponse, UiFrame } from '@airforms/ui-schema'

function baseUrl() {
  return (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined) ?? 'http://localhost:3000'
}

export async function sendTurn(payload: TurnRequest): Promise<TurnResponse> {
  const response = await fetch(`${baseUrl()}/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Orchestrator request failed (${response.status}): ${message}`)
  }

  const raw = (await response.json()) as Partial<TurnResponse>
  if (!isTurnResponse(raw)) {
    throw new Error('Received invalid turn response payload from orchestrator.')
  }

  return raw
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  return Boolean(value && typeof value === 'object' && (value as AssistantMessage).type === 'assistant_message' && typeof (value as AssistantMessage).text === 'string')
}

function isUiFrame(value: unknown): value is UiFrame {
  return Boolean(value && typeof value === 'object' && (value as UiFrame).type === 'ui_frame' && typeof (value as UiFrame).frameId === 'string')
}

function isTurnResponse(value: Partial<TurnResponse>): value is TurnResponse {
  return Boolean(
    typeof value?.conversationId === 'string' &&
      Array.isArray(value.messages) &&
      value.messages.every(isAssistantMessage) &&
      (value.ui === undefined || isUiFrame(value.ui))
  )
}
