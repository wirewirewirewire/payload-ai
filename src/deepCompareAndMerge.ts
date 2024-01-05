import { translateTextOrObject } from './translateTextAndObjects'

interface CollectionObjType {
  [prop: string]: any // You can replace 'any' with a more specific type
}

let colllectionObj: CollectionObjType = {} // Assuming targetObj is initialized somewhere

interface ReturnTypeExample {}

export async function deepCompareTranslateAndMerge(
  newOriginalObj: CollectionObjType,
  originalObj: CollectionObjType,
  targetObj: CollectionObjType,
  fields: string[],
  language: string,
  action?: 'create' | 'update',
  onlyMissing?: boolean,
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
          onlyMissing,
        ),
      ),
    )
  } else if (typeof newOriginalObj === 'object' && newOriginalObj !== null) {
    const promises = Object.keys(newOriginalObj).map(async prop => {
      if (newOriginalObj.hasOwnProperty(prop)) {
        if (fields.includes(prop) /*&& typeof newOriginalObj[prop] === 'string'*/) {
          if (
            originalObj?.[prop] === undefined ||
            JSON.stringify(newOriginalObj[prop]) !== JSON.stringify(originalObj[prop]) ||
            action === 'create'
          ) {
            // Translate the text and merge it into the English object
            console.log(
              'found to translate',
              onlyMissing,
              targetObj[prop],
              newOriginalObj[prop],
              language,
            )
            if (!onlyMissing || targetObj[prop] === undefined || targetObj[prop] === '') {
              targetObj[prop] = await translateTextOrObject(newOriginalObj[prop], language)
            } else {
              // targetObj[prop] = 'not translated'
            }
            console.log('translation', targetObj[prop])
          }
        } else if (
          typeof newOriginalObj[prop] === 'object' &&
          typeof targetObj[prop] === 'object'
        ) {
          targetObj[prop] = await deepCompareTranslateAndMerge(
            newOriginalObj[prop],
            originalObj?.[prop] || null,
            targetObj[prop] || null,
            fields,
            language,
            action,
            onlyMissing,
          )
        }
      }
    })
    await Promise.all(promises)
  }
  return targetObj
}