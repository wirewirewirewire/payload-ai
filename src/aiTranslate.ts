import OpenAI from 'openai'
import type { CollectionAfterChangeHook, FieldHook } from 'payload'
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
  onProgress,
}: any) {
  const localization = req?.payload?.config?.localization
  const previousDocument = previousDoc || {}
  const locales = localization?.locales
  const localCodes: string[] = Array.isArray(localization?.localeCodes)
    ? localization.localeCodes
    : Array.isArray(locales)
    ? locales
        .map((locale: any) => (typeof locale === 'string' ? locale : locale?.code))
        .filter(Boolean)
    : []

  const sourceLanguageI =
    sourceLanguage ||
    doc.sourceLanguage ||
    localization?.defaultLocale ||
    localCodes[0] ||
    req?.locale

  if (context.triggerAfterChange === false /* || req.locale !== sourceLanguageI */) return

  if (!Array.isArray(localCodes) || localCodes.length < 2 || !sourceLanguageI) return

  const targetLanguages = localCodes.filter(
    targetLanguage =>
      targetLanguage !== sourceLanguageI && (!codes || codes.includes(targetLanguage)),
  )

  if (!targetLanguages.length) return

  if (typeof onProgress === 'function') {
    for (const targetLanguage of targetLanguages) {
      await onProgress({ language: targetLanguage, status: 'processing' })

      try {
        const targetDoc = await req.payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: targetLanguage,
          fallbackLocale: false,
          limit: 0,
          depth: 0,
        })

        const targetDocWithTranslation = await deepCompareTranslateAndMerge(
          doc,
          previousDocument,
          targetDoc,
          collectionOptions.fields,
          targetLanguage,
          previousDocument.id ? 'update' : 'create',
          onlyMissing,
          sourceLanguageI,
          { ...settings, namespace: doc?.namespace, localization },
        )

        const { id, _status, updatedAt, createdAt, publishedDate, ...dataNew } =
          targetDocWithTranslation

        await req.payload.update({
          collection: collection.slug,
          id: doc.id,
          data: dataNew,
          locale: targetLanguage,
          limit: 1,
          depth: 0,
          context: {
            triggerAfterChange: false,
          },
        })

        await onProgress({ language: targetLanguage, status: 'completed' })
      } catch (error: any) {
        await onProgress({
          language: targetLanguage,
          status: 'failed',
          error: error?.message || 'Translation failed',
        })
        throw error
      }
    }

    return
  }

  const translationPromises = targetLanguages.map(async (tL: string) => {
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
      previousDocument,
      targetDoc,
      collectionOptions.fields,
      tL,
      previousDocument.id ? 'update' : 'create',
      onlyMissing,
      sourceLanguageI,
      { ...settings, namespace: doc?.namespace, localization },
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
