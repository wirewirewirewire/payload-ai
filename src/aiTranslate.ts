import type { CollectionAfterChangeHook, FieldHook } from 'payload'

import OpenAI from 'openai'

import { deepCompareTranslateAndMerge } from './deepCompareAndMerge.js'

const aiTranslateHook =
  (
    {
      collection,
      collectionOptions,
      pluginOptions,
    }: { collection: object; collectionOptions: any; pluginOptions: any },
    fallback?: string,
  ): CollectionAfterChangeHook =>
  async ({ collection, context, doc, previousDoc, req }) => {
    const settings = pluginOptions.collections?.[collection.slug]?.settings

    return await translateCollection({
      collection,
      collectionOptions,
      context,
      doc,
      previousDoc,
      req,
      settings,
    })
  }

export default aiTranslateHook

export async function translateCollection({
  codes,
  collection,
  collectionOptions,
  context,
  doc,
  onlyMissing,
  onProgress,
  previousDoc,
  req,
  settings,
  sourceLanguage,
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

  if (context.triggerAfterChange === false /* || req.locale !== sourceLanguageI */) {return}

  if (!Array.isArray(localCodes) || localCodes.length < 2 || !sourceLanguageI) {return}

  const targetLanguages = localCodes.filter(
    targetLanguage =>
      targetLanguage !== sourceLanguageI && (!codes || codes.includes(targetLanguage)),
  )

  if (!targetLanguages.length) {return}

  if (typeof onProgress === 'function') {
    for (const targetLanguage of targetLanguages) {
      await onProgress({ language: targetLanguage, status: 'processing' })

      try {
        const targetDoc = await req.payload.findByID({
          id: doc.id,
          collection: collection.slug,
          depth: 0,
          fallbackLocale: false,
          limit: 0,
          locale: targetLanguage,
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
          { ...settings, localization, namespace: doc?.namespace },
        )

        const { id, _status, createdAt, publishedDate, updatedAt, ...dataNew } =
          targetDocWithTranslation

        await req.payload.update({
          id: doc.id,
          collection: collection.slug,
          context: {
            triggerAfterChange: false,
          },
          data: dataNew,
          depth: 0,
          limit: 1,
          locale: targetLanguage,
        })

        await onProgress({ language: targetLanguage, status: 'completed' })
      } catch (error: any) {
        await onProgress({
          error: error?.message || 'Translation failed',
          language: targetLanguage,
          status: 'failed',
        })
        throw error
      }
    }

    return
  }

  const translationPromises = targetLanguages.map(async (tL: string) => {
    const targetDoc = await req.payload.findByID({
      id: doc.id,
      collection: collection.slug,
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      locale: tL,
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
      { ...settings, localization, namespace: doc?.namespace },
    )

    const { id, _status, createdAt, publishedDate, updatedAt, ...dataNew } =
      targetDocWithTranslation

    return { dataNew, tL }
  })

  const translationResults = await Promise.all(translationPromises)

  for (const translatedContent of translationResults) {
    const updatedLanguage = await req.payload.update({
      //req,
      id: doc.id,
      collection: collection.slug,
      context: {
        triggerAfterChange: false,
      },
      data: translatedContent.dataNew,
      depth: 0,
      limit: 1,
      locale: translatedContent.tL,
    })
  }
}
