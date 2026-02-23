import type { UiFrame } from '@airforms/renderer-react'
import type { TurnRequest, TurnResponse } from '@airforms/ui-schema'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  ui?: UiFrame
}

export type ChatState = {
  messages: ChatMessage[]
  pending: boolean
  activeFrameId?: string
  error?: string
}

export type TurnDebugEntry = {
  id: string
  createdAt: string
  request: TurnRequest
  response?: TurnResponse
  error?: string
  responseHasUi: boolean
  responseHasSlider: boolean
  requestAskedSlider: boolean
  assistantMentionsSlider: boolean
  sliderIntentMismatch: boolean
  patchedComponents: string[]
}
