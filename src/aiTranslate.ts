import OpenAI from 'openai'
import type { CollectionAfterChangeHook, FieldHook } from 'payload/types'
import { deepCompareTranslateAndMerge } from './deepCompareAndMerge'

const aiTranslateHook =
  (
    { collectionOptions, collection }: { collectionOptions: any; collection: object },
    fallback?: string,
  ): CollectionAfterChangeHook =>
  async ({ doc, req, previousDoc, context, collection }) => {
    return await translateCollection({
      doc,
      req,
      previousDoc,
      context,
      collection,
      collectionOptions,
    })
  }

export default aiTranslateHook

export async function translateCollection({
  req,
  doc,
  collection,
  previousDoc,
  context,
  collectionOptions,
  onlyMissing,
  codes,
}: any) {
  if (
    context.triggerAfterChange === false ||
    req.locale !== req.payload.config.localization.defaultLocale
  )
    return

  const localCodes: string[] = req.payload.config.localization.localeCodes

  console.log(
    'filter codes',
    localCodes.filter(
      targetLanguage =>
        targetLanguage !== req.payload.config.localization.defaultLocale &&
        (!codes || codes.includes(targetLanguage)),
    ),
  )

  const translationPromises = localCodes
    .filter(
      targetLanguage =>
        targetLanguage !== req.payload.config.localization.defaultLocale &&
        (!codes || codes.includes(targetLanguage)),
    )
    .map(async (tL: string) => {
      const targetDoc = await req.payload.findByID({
        collection: collection.slug,
        id: doc.id,
        locale: tL,
        fallbackLocale: false,
        limit: 0,
        depth: 0,
      })

      const targetDocWithTranslation = await deepCompareTranslateAndMerge(
        doc,
        previousDoc,
        targetDoc,
        collectionOptions.fields,
        tL,
        previousDoc.id ? 'update' : 'create',
        onlyMissing,
        req.payload.config.localization.defaultLocale,
      )

      const { id, _status, updatedAt, createdAt, publishedDate, ...dataNew } =
        targetDocWithTranslation

      return { dataNew, tL }
    })

  const translationResults = await Promise.all(translationPromises)

  for (const translatedContent of translationResults) {
    const updatedLanguage = await req.payload.update({
      //req,
      collection: collection.slug,
      id: doc.id,
      data: translatedContent.dataNew,
      locale: translatedContent.tL,
      limit: 1,
      depth: 0,
      context: {
        triggerAfterChange: false,
      },
    })
  }
}
