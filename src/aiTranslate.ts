import OpenAI from 'openai'
import type { CollectionAfterChangeHook, FieldHook } from 'payload/types'

async function translateText(text: string | object, language: string) {
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

  //console.log('Translated', language, content, chatCompletion.choices[0].message.content)

  const newItemResult =
    typeof text !== 'string'
      ? JSON.parse(chatCompletion.choices[0].message.content as string)
      : chatCompletion.choices[0].message.content

  return newItemResult
}

interface CollectionObjType {
  [prop: string]: any // You can replace 'any' with a more specific type
}

let colllectionObj: CollectionObjType = {} // Assuming targetObj is initialized somewhere

interface ReturnTypeExample {}

async function deepCompareTranslateAndMerge(
  newOriginalObj: CollectionObjType,
  originalObj: CollectionObjType,
  targetObj: CollectionObjType,
  fields: string[],
  language: string,
  action?: 'create' | 'update',
): Promise<CollectionObjType> {
  if (Array.isArray(newOriginalObj)) {
    return Promise.all(
      newOriginalObj.map((item, index) =>
        deepCompareTranslateAndMerge(
          item,
          originalObj?.[index],
          targetObj?.[index],
          fields,
          language,
          action,
        ),
      ),
    )
  } else if (typeof newOriginalObj === 'object' && newOriginalObj !== null) {
    const promises = Object.keys(newOriginalObj).map(async prop => {
      if (newOriginalObj.hasOwnProperty(prop)) {
        if (fields.includes(prop) /*&& typeof newOriginalObj[prop] === 'string'*/) {
          console.log('found now', newOriginalObj, fields)

          if (
            originalObj?.[prop] === undefined ||
            JSON.stringify(newOriginalObj[prop]) !== JSON.stringify(originalObj[prop]) ||
            action === 'create'
          ) {
            // Translate the text and merge it into the English object
            targetObj[prop] = await translateText(newOriginalObj[prop], language)
            console.log('found now tranlate', targetObj[prop])
          }
        } else if (
          typeof newOriginalObj[prop] === 'object' &&
          typeof targetObj[prop] === 'object'
        ) {
          // console.log('propaaaaaaa', targetObj?.[prop], targetObj, prop)
          targetObj[prop] = await deepCompareTranslateAndMerge(
            newOriginalObj[prop],
            originalObj?.[prop] || null,
            targetObj[prop] || null,
            fields,
            language,
            action,
          )
        }
      }
    })
    await Promise.all(promises)
  }
  return targetObj
}

const aiTranslate =
  (
    { collectionOptions, collection }: { collectionOptions: any; collection: object },
    fallback?: string,
  ): CollectionAfterChangeHook =>
  async ({ doc, req, previousDoc, context, collection }) => {
    console.log('aiTranslate', doc, req.locale, req.payload.config.localization.defaultLocale)
    try {
      if (
        context.triggerAfterChange === false ||
        req.locale !== req.payload.config.localization.defaultLocale
        /*!previousDoc?.id*/
      ) {
        return
      }

      console.log('gooo', previousDoc)
      const localCodes: string[] = req.payload.config.localization.localeCodes

      const translationPromises = localCodes
        .filter(targetLanguage => targetLanguage !== req.payload.config.localization.defaultLocale)
        .map(async targetLanguage => {
          const targetDoc = !previousDoc.id
            ? doc
            : await req.payload.findByID({
                req,
                collection: collection.slug,
                id: previousDoc.id,
                locale: targetLanguage,
                limit: 0,
                depth: 0,
              })

          const targetDocWithTranslation = await deepCompareTranslateAndMerge(
            doc,
            previousDoc,
            targetDoc,
            collectionOptions.fields,
            targetLanguage,
            previousDoc.id ? 'update' : 'create',
          )

          const updatedLanguage = await req.payload.update({
            req,
            collection: collection.slug,
            id: doc.id,
            data: targetDocWithTranslation,
            locale: targetLanguage,
            limit: 0,
            depth: 0,
            context: {
              triggerAfterChange: false,
            },
          })

          return updatedLanguage
        })

      const results = await Promise.all(translationPromises)
    } catch (error) {
      console.log('error while generating languages', error)
    }
  }

export default aiTranslate
