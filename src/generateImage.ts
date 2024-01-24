import OpenAI from 'openai'

export async function translateTextOrObject(
  text: string | object,
  language: string,
  sourceLanguage?: string,
) {
  if (typeof text !== 'string') {
    return text
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const promptAbstractBlogPost = (text: string) => {
    return `
Generate an abstract illustration for this blog post:

${text}
`
  }

  const content =
    typeof text !== 'string'
      ? promptAbstractBlogPost(JSON.stringify(text, null, 2))
      : promptAbstractBlogPost(text)

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: content,
    n: 1,
    size: '1024x1024',
  })
  //image_url = response.data.data[0].url

  console.log('Translated', language, content)

  return 'url' //image_url
}
