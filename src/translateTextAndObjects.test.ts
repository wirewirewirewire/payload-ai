import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { translateTextOrObject } from './translateTextAndObjects.js'

const localization = {
  defaultLocale: 'en',
  locales: [
    {
      code: 'en',
      label: 'English',
    },
    {
      code: 'de',
      label: 'German',
    },
  ],
}

describe('translateTextOrObject', () => {
  let consoleLogMock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createMock.mockReset()
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    openAIMock.mockClear()
  })

  afterEach(() => {
    consoleLogMock.mockRestore()
    vi.useRealTimers()
  })

  it('translates strings with the default model', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hallo Welt' } }],
    })

    await expect(
      translateTextOrObject({
        language: 'de',
        settings: { localization },
        sourceLanguage: 'en',
        text: 'Hello world',
      }),
    ).resolves.toBe('Hallo Welt')

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        max_completion_tokens: 12800,
        model: 'gpt-5-mini',
      }),
    )
  })

  it('parses JSON responses even when wrapped in a code fence', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '```json\n{"title":"Hallo"}\n```' } }],
    })

    await expect(
      translateTextOrObject({
        language: 'de',
        settings: { localization },
        sourceLanguage: 'en',
        text: { title: 'Hello' },
      }),
    ).resolves.toEqual({ title: 'Hallo' })
  })

  it('throws a useful error for invalid JSON responses', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'not json' } }],
    })

    await expect(
      translateTextOrObject({
        language: 'de',
        settings: { localization },
        sourceLanguage: 'en',
        text: { title: 'Hello' },
      }),
    ).rejects.toThrow('AI response was not valid JSON')
  })

  it('retries rate limits using retry-after-ms', async () => {
    vi.useFakeTimers()
    createMock
      .mockRejectedValueOnce({
        headers: {
          'retry-after-ms': '25',
        },
        status: 429,
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Hallo Welt' } }],
      })

    const result = translateTextOrObject({
      language: 'de',
      settings: { localization },
      sourceLanguage: 'en',
      text: 'Hello world',
    })

    await vi.advanceTimersByTimeAsync(25)

    await expect(result).resolves.toBe('Hallo Welt')
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('stops retrying after the configured retry limit', async () => {
    createMock.mockRejectedValueOnce({
      headers: {},
      status: 429,
    })

    await expect(
      translateTextOrObject({
        language: 'de',
        settings: {
          localization,
          maxRetries: 0,
        },
        sourceLanguage: 'en',
        text: 'Hello world',
      }),
    ).rejects.toThrow('OpenAI rate limit retry limit reached after 0 retries')

    expect(createMock).toHaveBeenCalledTimes(1)
  })
})
