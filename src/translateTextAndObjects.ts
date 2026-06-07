import ISO6391 from 'iso-639-1'
import OpenAI from 'openai'

import { DEFAULT_TRANSLATION_MODEL } from './modelOptions.js'

function isoToFullName(isoCode: string, settings: any) {
  const foundLanguage = settings?.localization?.locales?.find(
    (item: any) => item.code === isoCode,
  )
  if (foundLanguage && foundLanguage.label.length > 2) {
    return foundLanguage.label
  }
  if (ISO6391.getName(isoCode)) {return ISO6391.getName(isoCode)}

  return isoCode
}
function messagesMarkdown({ language, settings, sourceLanguage, text }: any) {
  return [
    {
      content: `You will be provided with markdown in "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language: "${isoToFullName(
        language,
        settings,
      )}". Only return the translated markdown (mdx) and keep the structure.`,
      role: 'system',
    },
    {
      content: `${text}`,
      role: 'user',
    },
  ]
}

function messagesString({ language, settings, sourceLanguage, text }: any) {
  return [
    {
      content: `You will be provided with text in "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language:"${isoToFullName(
        language,
        settings,
      )}". Only return the translated text without anything else.`,
      role: 'system',
    },
    {
      content: `${text}`,
      role: 'user',
    },
  ]
}

function messagesWithJson({ language, settings, sourceLanguage, text }: any) {
  return [
    {
      content: `You will be provided with lexical json structure in "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language "${isoToFullName(
        language,
        settings,
      )}". Keep the json structure. Make sure NOT to wrap your result in markdown.`,
      role: 'system',
    },
    {
      content: `${JSON.stringify(text /* , null, 2*/)}`,
      role: 'user',
    },
  ]
}

function messagesWithJsonLexical({ language, settings, sourceLanguage, text }: any) {
  return [
    {
      content: `You will be provided with a flat object structure with long keys in the language "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language "${isoToFullName(
        language,
        settings,
      )}". Keep the flat json object structure with long dot seperated keys. Make sure NOT to wrap your result in markdown.`,
      role: 'system',
    },
    {
      content: `${JSON.stringify(text /* , null, 2*/)}`,
      role: 'user',
    },
  ]
}

function promptDefault({ messages }: any): any {
  return messages
}

function getMaxOutputTokensForModel(model: string) {
  const normalizedModel = model.toLowerCase()

  if (/^gpt-5(?:[.-]|$)/i.test(normalizedModel)) {
    return 12800 //128000
  }

  if (/^o[1-9](?:[.-]|$)/i.test(normalizedModel)) {
    return 20000 // 100000
  }

  if (/^gpt-4\.1(?:[.-]|$)/i.test(normalizedModel)) {
    return 32768
  }

  if (/^(?:gpt-4o|chatgpt-4o)(?:[.-]|$)/i.test(normalizedModel)) {
    return 16384
  }

  return 4096
}

const DEFAULT_RATE_LIMIT_RETRY_MS = 1000
const DEFAULT_RATE_LIMIT_MAX_RETRIES = 5
const MAX_RATE_LIMIT_RETRY_MS = 60 * 1000

function getHeaderValue(headers: unknown, name: string): string | undefined {
  if (!headers) {
    return undefined
  }

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) || undefined
  }

  const matchedHeader = Object.entries(headers as Record<string, unknown>).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )

  const value = matchedHeader?.[1]

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return undefined
}

function getRateLimitRetryDelayMs(error: { headers?: unknown }, retryCount: number) {
  const retryAfterMsHeader = getHeaderValue(error.headers, 'retry-after-ms')
  const retryAfterMs = retryAfterMsHeader ? Number.parseFloat(retryAfterMsHeader) : undefined

  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return Math.min(retryAfterMs, MAX_RATE_LIMIT_RETRY_MS)
  }

  const retryAfterHeader = getHeaderValue(error.headers, 'retry-after')

  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseFloat(retryAfterHeader)
    const retryAfterDelayMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : Date.parse(retryAfterHeader) - Date.now()

    if (Number.isFinite(retryAfterDelayMs) && retryAfterDelayMs >= 0) {
      return Math.min(retryAfterDelayMs, MAX_RATE_LIMIT_RETRY_MS)
    }
  }

  return Math.min(DEFAULT_RATE_LIMIT_RETRY_MS * 2 ** retryCount, MAX_RATE_LIMIT_RETRY_MS)
}

function parseJsonCompletion(content: null | string | undefined) {
  if (!content) {
    throw new Error('AI response was empty')
  }

  const trimmedContent = content.trim()
  const withoutCodeFence = trimmedContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  try {
    return JSON.parse(withoutCodeFence)
  } catch (_error) {
    throw new Error('AI response was not valid JSON')
  }
}

function generateUniqueKey(path: any) {
  return path.join('.')
}

function extractAndCapitalizeText(
  node: any,
  path: any,
  textMap: any,
  isTargetProperty: (node: any, key: string) => boolean,
) {
  if (node !== null && typeof node === 'object') {
    Object.keys(node).forEach(key => {
      if (isTargetProperty(node, key)) {
        const keyPath = generateUniqueKey(path.concat([key]))
        textMap[keyPath] = node[key] // Assuming you want to capitalize the text.
      } else {
        extractAndCapitalizeText(node[key], path.concat([key]), textMap, isTargetProperty)
      }
    })
  }
}

function reapplyText(
  node: any,
  path: any,
  textMap: any,
  isTargetProperty: (node: any, key: string) => boolean,
) {
  if (node !== null && typeof node === 'object') {
    Object.keys(node).forEach(key => {
      if (isTargetProperty(node, key)) {
        const keyPath = generateUniqueKey(path.concat([key]))
        if (textMap[keyPath]) {
          node[key] = textMap[keyPath]
        }
      } else {
        reapplyText(node[key], path.concat([key]), textMap, isTargetProperty)
      }
    })
  }
}

export async function translateTextOrObject({
  language,
  retryCount = 0,
  settings,
  sourceLanguage,
  text,
}: any) {
  function isTranslateNode(node: any, key: string) {
    return (key === 'text' && typeof node[key] === 'string') || key === 'name'
  }

  const textAsString = typeof text === 'string' ? text : JSON.stringify(text, null, 2)

  if (textAsString.length < 2) {
    return text
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    const textMap = {}

    if (text?.root?.children) {
      extractAndCapitalizeText(text.root, ['root'], textMap, isTranslateNode)
    }

    const { localization: _localization, namespace, promptFunc = promptDefault, ...restSettings }: any =
      settings || {}
    const languageIso = language === 'se' ? 'sv' : language

    const promptMessage: any =
      typeof text === 'string' && text.length < 400
        ? (messagesString({ language: languageIso, settings, sourceLanguage, text }) as any)
        : typeof text === 'string'
        ? (messagesMarkdown({ language: languageIso, settings, sourceLanguage, text }) as any)
        : text?.root?.children
        ? (messagesWithJsonLexical({
            language: languageIso,
            settings,
            sourceLanguage,
            text: textMap,
          }) as any)
        : (messagesWithJson({ language: languageIso, settings, sourceLanguage, text }) as any)

    const finalPrompt = promptFunc({
      language,
      messages: promptMessage,
      namespace,
      settings,
      sourceLanguage,
    })

    const model = restSettings.model || DEFAULT_TRANSLATION_MODEL
    const usesCompletionTokens = /^(?:gpt-5|o[1-9])/i.test(model)
    const modelMaxOutputTokens = getMaxOutputTokensForModel(model)
    const {
      frequency_penalty: frequencyPenaltyFromSettings,
      max_completion_tokens: maxCompletionTokensFromSettings,
      max_tokens: maxTokensFromSettings,
      presence_penalty: presencePenaltyFromSettings,
      temperature: temperatureFromSettings,
      top_p: topPFromSettings,
      ...restCompletionSettings
    } = restSettings

    const chatCompletion = await openai.chat.completions.create({
      messages: finalPrompt,
      model,
      ...(!usesCompletionTokens
        ? {
            frequency_penalty: frequencyPenaltyFromSettings ?? 0,
            presence_penalty: presencePenaltyFromSettings ?? 0,
            temperature: temperatureFromSettings ?? 0,
            top_p: topPFromSettings ?? 1,
          }
        : {}),
      ...(usesCompletionTokens
        ? {
            max_completion_tokens: Math.min(
              Math.max(
                maxCompletionTokensFromSettings || 0,
                maxTokensFromSettings || 0,
                modelMaxOutputTokens,
              ),
              modelMaxOutputTokens,
            ),
          }
        : {
            max_tokens: Math.min(
              Math.max(
                maxTokensFromSettings || 0,
                maxCompletionTokensFromSettings || 0,
                modelMaxOutputTokens,
              ),
              modelMaxOutputTokens,
            ),
          }),
      ...restCompletionSettings,
    })

    if (text?.root?.children) {
      const newText = JSON.parse(JSON.stringify(text))

      reapplyText(
        newText.root,
        ['root'],
        parseJsonCompletion(chatCompletion.choices[0].message.content),
        isTranslateNode,
      )
      return newText
    }

    const newItemResult =
      typeof text !== 'string'
        ? parseJsonCompletion(chatCompletion.choices[0].message.content)
        : chatCompletion.choices[0].message.content

    return newItemResult
  } catch (error: any) {
    if (error.status === 429) {
      const maxRetries = settings?.maxRetries ?? DEFAULT_RATE_LIMIT_MAX_RETRIES

      if (retryCount >= maxRetries) {
        throw new Error(`OpenAI rate limit retry limit reached after ${retryCount} retries`)
      }

      const retryAfterMs = getRateLimitRetryDelayMs(error, retryCount)

      console.log(
        `Too many requests. Retry after ${retryAfterMs}ms. Retry count: ${retryCount}`,
      )

      await new Promise(resolve => setTimeout(resolve, retryAfterMs))
      const newResult: any = await translateTextOrObject({
        language,
        retryCount: retryCount + 1,
        settings,
        sourceLanguage,
        text,
      })

      return newResult
    }

    console.log(
      'Could not be translated',
      error /* , chatCompletion.choices[0].message.content */,
    )

    throw error
  }
}

/*export async function translateLongTextOrObject(
  text: string | object,
  language: string,
  sourceLanguage?: string,
  retryCount: number = 0,
) {
  const textAsString = typeof text === 'string' ? text : JSON.stringify(text, null, 2)

  if (textAsString.length < 400) {
    return translateTextOrObject(text, language, sourceLanguage)
  }

  if (typeof text !== 'string' && text.root.children) {
    console.log('text', text.root.children)
    const textAsArray = Object.keys(text.root.children).map(key => text[key])

    const textAsArrayTranslated = await Promise.all(
      textAsArray.map(async (item, index) => {
        const newItemResult = await translateLongTextOrObject(
          item,
          language,
          sourceLanguage,
          retryCount,
        )
        return newItemResult
      }),
    )

    const textAsObject = Object.keys(text.root.children).reduce((acc, key, index) => {
      acc[key] = textAsArrayTranslated[index]
      return acc
    }, {})

    text.root.children = textAsObject
    return text
  }
}*/
