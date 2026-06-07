import type OpenAI from 'openai'
import type { Access } from 'payload'

export type TranslationPromptMessage = OpenAI.Chat.ChatCompletionMessageParam

export type TranslationPromptFunc = (args: {
  language: string
  messages: TranslationPromptMessage[]
  namespace?: string
  settings?: TranslationSettings
  sourceLanguage?: string
}) => TranslationPromptMessage[]

export type TranslationSettings = {
  maxRetries?: number
  namespace?: string
  promptFunc?: TranslationPromptFunc
} & Partial<
  Omit<OpenAI.Chat.ChatCompletionCreateParams, 'messages'>
>

export interface CollectionOptions {
  access?: Access
  fields?: string[]
  settings?: TranslationSettings
}

export interface GenerateTextOptions {
  /**
   * Default model used when the request omits a model or sends "default"
   */
  defaultModel?: string
  /**
   * Enable or disable the /generate-text endpoint
   * @default true
   */
  enabled?: boolean
  /**
   * Maximum output tokens allowed for a request
   * @default 2048
   */
  maxOutputTokens?: number
  /**
   * Allow-list for models accepted by /generate-text
   */
  models?: string[]
}

export interface PluginTypes {
  /**
   * Collection options
   */
  collections?: Record<string, CollectionOptions>
  /**
   * Enable or disable plugin
   * @default true
   */
  enabled?: boolean
  generateText?: GenerateTextOptions
  stringTranslation?: {
    enabled?: boolean
  }
}

export interface NewCollectionTypes {
  title: string
}

export interface TranslatorConfig {
  name: string
  type: string
}
