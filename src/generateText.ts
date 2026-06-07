import type { PayloadHandler } from 'payload'

import OpenAI from 'openai'

import type { PluginTypes } from './types.js'

import { validateAccess } from './access/validateAccess.js'
import { DEFAULT_TRANSLATION_MODEL, modelOptions } from './modelOptions.js'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  })

const DEFAULT_MAX_OUTPUT_TOKENS = 2048
const MAX_MESSAGES = 20

type GenerateTextBody = {
  maxOutputTokens?: number
} & Partial<OpenAI.Chat.ChatCompletionCreateParams>

const isReasoningModel = (model: string) => /^(?:gpt-5|o[1-9])/i.test(model)

const toFiniteNumber = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return value
}

const sanitizeNumber = ({
  fallback,
  max,
  min,
  value,
}: {
  fallback: number
  max: number
  min: number
  value: unknown
}) => {
  const finiteValue = toFiniteNumber(value)

  if (finiteValue === undefined) {
    return fallback
  }

  return Math.min(Math.max(finiteValue, min), max)
}

const getAllowedModels = (pluginOptions: PluginTypes) => {
  const configuredModels = pluginOptions.generateText?.models

  if (Array.isArray(configuredModels) && configuredModels.length) {
    return configuredModels
  }

  return [
    DEFAULT_TRANSLATION_MODEL,
    ...modelOptions
      .map(option => option.value)
      .filter(value => value !== 'default' && value !== DEFAULT_TRANSLATION_MODEL),
  ]
}

const sanitizeGenerateTextBody = (
  body: GenerateTextBody,
  pluginOptions: PluginTypes,
): OpenAI.Chat.ChatCompletionCreateParams => {
  const messages = body.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array')
  }

  if (messages.length > MAX_MESSAGES) {
    throw new Error(`messages cannot contain more than ${MAX_MESSAGES} items`)
  }

  const defaultModel = pluginOptions.generateText?.defaultModel || DEFAULT_TRANSLATION_MODEL
  const requestedModel =
    typeof body.model === 'string' && body.model !== 'default' ? body.model : defaultModel
  const allowedModels = getAllowedModels(pluginOptions)

  if (!allowedModels.includes(requestedModel)) {
    throw new Error(`model "${requestedModel}" is not allowed`)
  }

  const maxOutputTokens = sanitizeNumber({
    fallback: DEFAULT_MAX_OUTPUT_TOKENS,
    max: 128000,
    min: 1,
    value: pluginOptions.generateText?.maxOutputTokens,
  })
  const requestedOutputTokens =
    toFiniteNumber(body.max_completion_tokens) ||
    toFiniteNumber(body.max_tokens) ||
    toFiniteNumber(body.maxOutputTokens)
  const boundedOutputTokens = Math.min(
    requestedOutputTokens || maxOutputTokens,
    maxOutputTokens,
  )
  const usesCompletionTokens = isReasoningModel(requestedModel)

  return {
    messages,
    model: requestedModel,
    ...(body.response_format ? { response_format: body.response_format } : {}),
    ...(usesCompletionTokens
      ? {
          max_completion_tokens: boundedOutputTokens,
        }
      : {
          frequency_penalty: sanitizeNumber({
            fallback: 0,
            max: 2,
            min: -2,
            value: body.frequency_penalty,
          }),
          max_tokens: boundedOutputTokens,
          presence_penalty: sanitizeNumber({
            fallback: 0,
            max: 2,
            min: -2,
            value: body.presence_penalty,
          }),
          temperature: sanitizeNumber({
            fallback: 0.2,
            max: 2,
            min: 0,
            value: body.temperature,
          }),
          top_p: sanitizeNumber({
            fallback: 1,
            max: 1,
            min: 0,
            value: body.top_p,
          }),
        }),
  }
}

export async function generateText(body: GenerateTextBody, pluginOptions: PluginTypes = {}) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const safeBody = sanitizeGenerateTextBody(body, pluginOptions)

  return await openai.chat.completions.create(safeBody)
}

export const generateTextHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async req => {
    const hasAccess = await validateAccess(req, pluginOptions)
    if (!hasAccess) {return jsonResponse({ error: 'not allowed' }, 403)}

    const reqAny = req as any
    const body = reqAny.data || (reqAny.json ? await reqAny.json() : reqAny.body || {})
    try {
      const result = await generateText(body, pluginOptions)

      return jsonResponse(result)
    } catch (error: any) {
      return jsonResponse({ error: error?.message || 'Could not generate text' }, 400)
    }
  }
}
