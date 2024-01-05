import OpenAI from 'openai'

export async function translateTextOrObject(text: string | object, language: string) {
  if (typeof text !== 'string') {
    return text
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const content = `Translate to ${language} (ISO-2-Code). ${
    typeof text !== 'string'
      ? 'Keep the json structure. Only return the json'
      : 'Only return the translated text without any comment'
  }:   ${typeof text !== 'string' ? JSON.stringify(text) : text}`

  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    model: 'gpt-3.5-turbo',
  })

  console.log('Translated', language, content, chatCompletion.choices[0].message.content)

  const newItemResult =
    typeof text !== 'string'
      ? JSON.parse(chatCompletion.choices[0].message.content as string)
      : chatCompletion.choices[0].message.content

  return newItemResult
}
