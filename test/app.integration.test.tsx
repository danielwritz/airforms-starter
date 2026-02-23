import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'

const mockFetch = vi.fn<typeof fetch>()

describe('App integration flow', () => {
  beforeEach(() => {
    cleanup()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    window.sessionStorage.clear()
  })

  it('handles user_text -> ui_frame -> ui_submit -> assistant flow', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversationId: 'c_demo',
          messages: [{ type: 'assistant_message', text: 'Please enter your policy details.' }],
          ui: {
            type: 'ui_frame',
            version: '1.0',
            frameId: 'insurance:lookup',
            title: 'Find your policy',
            state: { values: {} },
            components: [
              { id: 'policyNumber', type: 'text', label: 'Policy number', required: true },
              { id: 'dob', type: 'date', label: 'Date of birth', required: true },
              { id: 'urgency', type: 'slider', label: 'Urgency', required: true, min: 1, max: 10, step: 1 }
            ],
            primaryAction: { label: 'Look up', action: { type: 'ui_submit' } }
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversationId: 'c_demo',
          messages: [{ type: 'assistant_message', text: 'Looking up your policy...' }]
        })
      } as Response)

    render(<App />)

    await userEvent.type(screen.getByLabelText('Message'), 'Check my policy')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    const firstCall = mockFetch.mock.calls[0]
    expect(firstCall?.[0]).toBe('http://localhost:3000/turn')
    const firstPayload = JSON.parse(String((firstCall?.[1] as RequestInit | undefined)?.body ?? '{}'))
    expect(firstPayload.message.type).toBe('user_text')
    expect(firstPayload.formSensitivity).toBe(10)

    await screen.findByText('Assistant:')
    await screen.findByText('Please enter your policy details.')
    expect(screen.queryByLabelText('Active form')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Turn JSON Inspector' })).toBeInTheDocument()
    expect(screen.getByText('Slider diagnostics')).toBeInTheDocument()
    expect(screen.getByText('componentId: urgency')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Policy number'), 'ABC123')
    await userEvent.type(screen.getByLabelText('Date of birth'), '1988-07-01')
    fireEvent.change(screen.getByLabelText('Urgency'), { target: { value: '7' } })
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))

    const secondCall = mockFetch.mock.calls[1]
    const secondPayload = JSON.parse(String((secondCall?.[1] as RequestInit | undefined)?.body ?? '{}'))
    expect(secondPayload.formSensitivity).toBe(10)

    await waitFor(() => {
      expect(screen.getByText('Looking up your policy...')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/"type": "ui_submit"/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/"frameId": "insurance:lookup"/).length).toBeGreaterThan(0)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('shows slider mismatch diagnostics when slider is requested but not returned', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversationId: 'c_demo',
        messages: [{ type: 'assistant_message', text: 'Here is a slider form for you.' }],
        ui: {
          type: 'ui_frame',
          version: '1.0',
          frameId: 'sliderForm',
          title: 'Slider Form',
          state: { values: { slider: '15' } },
          components: [{ id: 'slider', type: 'number', label: 'Adjust the slider', required: true }],
          primaryAction: { label: 'Submit', action: { type: 'ui_submit' } }
        }
      })
    } as Response)

    render(<App />)

    await userEvent.type(screen.getByLabelText('Message'), 'Give me a form with sliders on it')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByText('Here is a slider form for you.')
    expect(screen.getByText('slider-mismatch')).toBeInTheDocument()
    expect(screen.getByText('requestAskedSlider: true')).toBeInTheDocument()
    expect(screen.getByText('assistantMentionsSlider: true')).toBeInTheDocument()
    expect(screen.getByText('sliderIntentMismatch: true')).toBeInTheDocument()
    expect(screen.getByText('No slider component in this ui_frame response.')).toBeInTheDocument()
  })

  it('retries once without formSensitivity when orchestrator rejects request payload', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid turn request payload.'
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversationId: 'c_demo',
          messages: [{ type: 'assistant_message', text: 'Fallback-compatible success.' }]
        })
      } as Response)

    render(<App />)

    await userEvent.type(screen.getByLabelText('Message'), 'hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByText('Fallback-compatible success.')

    expect(mockFetch).toHaveBeenCalledTimes(2)

    const firstPayload = JSON.parse(String((mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.body ?? '{}'))
    const secondPayload = JSON.parse(String((mockFetch.mock.calls[1]?.[1] as RequestInit | undefined)?.body ?? '{}'))

    expect(firstPayload.formSensitivity).toBe(10)
    expect(secondPayload.formSensitivity).toBeUndefined()
  })
})
