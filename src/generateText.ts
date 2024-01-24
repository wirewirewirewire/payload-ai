import OpenAI from 'openai'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload/config'

export async function generateText(body: OpenAI.Chat.ChatCompletionCreateParams) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  console.log('body', body.messages[0].content)

  const chatCompletion: any = await openai.chat.completions.create({
    // model: 'gpt-3.5-turbo',
    ...body,
  })

  const newItemResult = chatCompletion.choices[0].message.content

  return chatCompletion
}

export const generateTextHandler = (translatorConfig: PluginTypes): PayloadHandler => {
  return async (req, res) => {
    const result = await generateText(req.body)
    res.json(result)
  }
}
