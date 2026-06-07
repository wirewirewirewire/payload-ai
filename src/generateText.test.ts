import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock, openAIMock } = vi.hoisted(() => {
  const createMock = vi.fn()
  const openAIMock = vi.fn(function OpenAI() {
    return {
      chat: {
        completions: {
          create: createMock,
        },
      },
    }
  })

  return { createMock, openAIMock }
})

vi.mock('openai', () => ({
  default: openAIMock,
}))

import { generateText, generateTextHandler } from './generateText.js'

describe('generateText', () => {
  beforeEach(() => {
    createMock.mockReset()
    openAIMock.mockClear()
  })

  it('uses the default allowed model and caps reasoning output tokens', async () => {
    createMock.mockResolvedValueOnce({ id: 'completion-1' })

    await expect(
      generateText({
        max_completion_tokens: 50_000,
        messages: [{ content: 'Write a short title', role: 'user' }],
      }),
    ).resolves.toEqual({ id: 'completion-1' })

    expect(createMock).toHaveBeenCalledWith({
      max_completion_tokens: 2048,
      messages: [{ content: 'Write a short title', role: 'user' }],
      model: 'gpt-5-mini',
    })
  })

  it('rejects models outside the allow-list', async () => {
    await expect(
      generateText({
        messages: [{ content: 'Write a short title', role: 'user' }],
        model: 'not-a-real-model',
      }),
    ).rejects.toThrow('model "not-a-real-model" is not allowed')

    expect(createMock).not.toHaveBeenCalled()
  })

  it('allows configured models and clamps non-reasoning settings', async () => {
    createMock.mockResolvedValueOnce({ id: 'completion-2' })

    await generateText(
      {
        max_tokens: 999,
        messages: [{ content: 'Write a short title', role: 'user' }],
        model: 'gpt-4.1-mini',
        temperature: 10,
      },
      {
        generateText: {
          maxOutputTokens: 500,
          models: ['gpt-4.1-mini'],
        },
      },
    )

    expect(createMock).toHaveBeenCalledWith({
      frequency_penalty: 0,
      max_tokens: 500,
      messages: [{ content: 'Write a short title', role: 'user' }],
      model: 'gpt-4.1-mini',
      presence_penalty: 0,
      temperature: 2,
      top_p: 1,
    })
  })

  it('rejects requests without messages before calling OpenAI', async () => {
    await expect(generateText({ model: 'gpt-5-mini' })).rejects.toThrow(
      'messages must be a non-empty array',
    )

    expect(createMock).not.toHaveBeenCalled()
  })
})

describe('generateTextHandler', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('returns 403 when access fails', async () => {
    const handler = generateTextHandler({})
    const response = await handler({} as any)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'not allowed' })
  })

  it('returns validation errors as JSON', async () => {
    const handler = generateTextHandler({})
    const response = await handler({
      data: {
        messages: [{ content: 'Write a short title', role: 'user' }],
        model: 'not-a-real-model',
      },
      user: { id: 'user-1' },
    } as any)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'model "not-a-real-model" is not allowed',
    })
  })
})
