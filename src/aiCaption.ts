import axios from 'axios'
import OpenAI from 'openai'
import type { CollectionAfterChangeHook, FieldHook } from 'payload/types'

const aiCaptionHook =
  (
    {
      collectionOptions,
      collection,
      pluginOptions,
    }: { collectionOptions: any; collection: object; pluginOptions: any },
    fallback?: string,
  ): CollectionAfterChangeHook =>
  async ({ doc, req, previousDoc, context, collection }) => {
    const settings = pluginOptions.collections?.[collection.slug]?.settings

    return await translateCollection({
      doc,
      req,
      previousDoc,
      context,
      collection,
      collectionOptions,
      settings,
    })
  }

export default aiCaptionHook

async function processImageRequest(url: string) {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const imageBuffer = Buffer.from(response.data, 'binary')
  const base64Image = imageBuffer.toString('base64')
  const mimeType = response.headers['content-type']
  const encodedImage = `data:${mimeType};base64,${base64Image}`

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const responseGpt = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Create an image alt text' },
          { type: 'image_url', image_url: { url: encodedImage } },
        ],
      },
    ],
    max_tokens: 1024,
  })

  console.log('GPT Response:', responseGpt.choices[0].message.content)
  return responseGpt
}

export async function translateCollection({
  req,
  doc,
  collection,
  previousDoc,
  context,
  collectionOptions,
  onlyMissing,
  codes,
  settings,
  sourceLanguage,
}: any) {
  if (context.triggerAfterChange === false /* || req.locale !== sourceLanguageI */) return
  console.log('upload doc', doc)
  if (!doc?.sizes?.tablet?.url) return
  const responseGpt = await processImageRequest(`http://localhost:3000${doc.sizes.tablet.url}`)

  const docData = doc

  docData.alt = responseGpt.choices[0].message.content
  const updatedLanguage = await req.payload.update({
    //req,
    collection: collection.slug,
    id: doc.id,
    data: docData,
    limit: 1,
    depth: 0,
    context: {
      triggerAfterChange: false,
    },
  })
}
