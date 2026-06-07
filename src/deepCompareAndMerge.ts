import { translateTextOrObject } from './translateTextAndObjects.js'

interface CollectionObjType {
  [prop: string]: any // You can replace 'any' with a more specific type
}

const isEmptyTranslatableValue = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

export async function deepCompareTranslateAndMerge(
  newOriginalObj: CollectionObjType,
  originalObj: CollectionObjType,
  targetObj: CollectionObjType,
  fields: string[],
  language: string,
  action?: 'create' | 'update',
  onlyMissing?: boolean,
  sourceLanguage?: string,
  settings?: any,
): Promise<CollectionObjType> {
  if (Array.isArray(newOriginalObj)) {
    const targetArray = Array.isArray(targetObj) ? targetObj : []
    const translatedItems = await Promise.all(
      newOriginalObj.map((item, index) =>
        deepCompareTranslateAndMerge(
          item,
          originalObj?.[index],
          targetObj?.[index],
          fields,
          language,
          action,
          onlyMissing,
          sourceLanguage,
          settings,
        ),
      ),
    )

    translatedItems.forEach((item, index) => {
      targetArray[index] = item
    })

    return targetArray
  } else if (typeof newOriginalObj === 'object' && newOriginalObj !== null) {
    const targetObject =
      targetObj && typeof targetObj === 'object' && !Array.isArray(targetObj) ? targetObj : {}

    if (newOriginalObj?.noAutoTranslate) {return targetObject}

    const promises = Object.keys(newOriginalObj).map(async prop => {
      if (Object.prototype.hasOwnProperty.call(newOriginalObj, prop)) {
        if (fields.includes(prop) /*&& typeof newOriginalObj[prop] === 'string'*/) {
          if (
            originalObj?.[prop] === undefined ||
            JSON.stringify(newOriginalObj[prop]) !== JSON.stringify(originalObj[prop]) ||
            action === 'create'
          ) {
            // Translate the text and merge it into the target language object
            if (!onlyMissing || isEmptyTranslatableValue(targetObject[prop])) {
              targetObject[prop] = await translateTextOrObject({
                language,
                settings,
                sourceLanguage,
                text: newOriginalObj[prop],
              })
            } else {
              // targetObj[prop] = 'not translated'
            }
          }
        } else if (
          typeof newOriginalObj[prop] === 'object' &&
          newOriginalObj[prop] !== null
        ) {
          targetObject[prop] = await deepCompareTranslateAndMerge(
            newOriginalObj[prop],
            originalObj?.[prop] || null,
            targetObject[prop] || null,
            fields,
            language,
            action,
            onlyMissing,
            sourceLanguage,
            settings,
          )
        } else if (prop === 'blockType' && targetObject[prop] === undefined) {
          targetObject[prop] = newOriginalObj[prop]
        }
      }
    })
    await Promise.all(promises)

    return targetObject
  }
  return targetObj
}
