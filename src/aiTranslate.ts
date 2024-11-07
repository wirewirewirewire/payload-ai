import OpenAI from 'openai'
import type { CollectionAfterChangeHook, FieldHook } from 'payload/types'
import { deepCompareTranslateAndMerge } from './deepCompareAndMerge'

const aiTranslateHook =
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
  settings,
  sourceLanguage,
}: any) {
  const sourceLanguageI =
    sourceLanguage || doc.sourceLanguage || req.payload.config.localization.defaultLocale

  if (context.triggerAfterChange === false /* || req.locale !== sourceLanguageI */) return

  const localCodes: string[] = req.payload.config.localization.localeCodes

  const translationPromises = localCodes
    .filter(
      targetLanguage =>
        targetLanguage !== sourceLanguageI && (!codes || codes.includes(targetLanguage)),
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
        sourceLanguageI,
        { ...settings, namespace: doc?.namespace, localization: req.payload.config.localization },
      )

      const { id, _status, updatedAt, createdAt, publishedDate, ...dataNew } =
        targetDocWithTranslation

      return { dataNew, tL }
    })

  console.log('translationPromises', translationPromises)

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
