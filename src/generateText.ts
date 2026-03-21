import OpenAI from 'openai'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload'
import { validateAccess } from './access/validateAccess'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

export async function generateText(body: OpenAI.Chat.ChatCompletionCreateParams) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const chatCompletion: any = await openai.chat.completions.create({
    // model: 'gpt-3.5-turbo',
    ...body,
  })

  const newItemResult = chatCompletion.choices[0].message.content

  return chatCompletion
}

export const generateTextHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async req => {
    const hasAccess = await validateAccess(req, pluginOptions)
    if (!hasAccess) return jsonResponse({ error: 'not allowed' }, 403)

    const reqAny = req as any
    const body = reqAny.data || (reqAny.json ? await reqAny.json() : reqAny.body || {})
    const result = await generateText(body)

    return jsonResponse(result)
  }
}
