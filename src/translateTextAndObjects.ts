import OpenAI from 'openai'
import ISO6391 from 'iso-639-1'

function isoToFullName(isoCode: string, settings: any) {
  const foundLanguage = settings.localization.locales.find((item: any) => item.code === isoCode)
  if (foundLanguage && foundLanguage.label.length > 2) {
    return foundLanguage.label
  }
  if (ISO6391.getName(isoCode)) return ISO6391.getName(isoCode)

  console.log('language not found')
  return isoCode
}
function messagesMarkdown({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'system',
      content: `You will be provided with markdown in "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language: "${isoToFullName(
        language,
        settings,
      )}". Only return the translated markdown (mdx) and keep the structure.`,
    },
    {
      role: 'user',
      content: `${text}`,
    },
  ]
}

function messagesString({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'system',
      content: `You will be provided with text in "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language:"${isoToFullName(
        language,
        settings,
      )}". Only return the translated text without anything else.`,
    },
    {
      role: 'user',
      content: `${text}`,
    },
  ]
}

function messagesWithJson({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'system',
      content: `You will be provided with lexical json structure in "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language "${isoToFullName(
        language,
        settings,
      )}". Keep the json structure. Make sure NOT to wrap your result in markdown.`,
    },
    {
      role: 'user',
      content: `${JSON.stringify(text /* , null, 2*/)}`,
    },
  ]
}

function messagesWithJsonLexical({ sourceLanguage, text, language, settings }: any) {
  return [
    {
      role: 'system',
      content: `You will be provided with a flat object structure with long keys in the language "${isoToFullName(
        sourceLanguage,
        settings,
      )}", and your task is to translate it into the language "${isoToFullName(
        language,
        settings,
      )}". Keep the flat json object structure with long dot seperated keys. Make sure NOT to wrap your result in markdown.`,
    },
    {
      role: 'user',
      content: `${JSON.stringify(text /* , null, 2*/)}`,
    },
  ]
}

function promptDefault({ messages }: any): any {
  return messages
}

function generateUniqueKey(path: any) {
  return path.join('.')
}

function extractAndCapitalizeText(
  node: any,
  path: any,
  textMap: any,
  isTargetProperty: (node: any, key: string) => boolean,
) {
  if (node !== null && typeof node === 'object') {
    Object.keys(node).forEach(key => {
      if (isTargetProperty(node, key)) {
        const keyPath = generateUniqueKey(path.concat([key]))
        textMap[keyPath] = node[key] // Assuming you want to capitalize the text.
      } else {
        extractAndCapitalizeText(node[key], path.concat([key]), textMap, isTargetProperty)
      }
    })
  }
}

function reapplyText(
  node: any,
  path: any,
  textMap: any,
  isTargetProperty: (node: any, key: string) => boolean,
) {
  if (node !== null && typeof node === 'object') {
    Object.keys(node).forEach(key => {
      if (isTargetProperty(node, key)) {
        const keyPath = generateUniqueKey(path.concat([key]))
        if (textMap[keyPath]) {
          node[key] = textMap[keyPath]
        }
      } else {
        reapplyText(node[key], path.concat([key]), textMap, isTargetProperty)
      }
    })
  }
}

interface TranslateTextOrObject {
  text: any
  language: string
  sourceLanguage?: string
  retryCount?: number
  setting: any
}

export async function translateTextOrObject({
  text,
  language,
  sourceLanguage,
  retryCount = 0,
  settings,
}: any) {
  console.log('settings', settings)
  function isTranslateNode(node: any, key: string) {
    return (key === 'text' && typeof node[key] === 'string') || key === 'name'
  }

  const textAsString = typeof text === 'string' ? text : JSON.stringify(text, null, 2)

  if (textAsString.length < 2) {
    return text
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    let textMap = {}

    if (text?.root?.children) {
      extractAndCapitalizeText(text.root, ['root'], textMap, isTranslateNode)
    }

    const { promptFunc = promptDefault, namespace, localization, ...restSettings }: any = settings
    const languageIso = language === 'se' ? 'sv' : language

    const promptMessage: any =
      typeof text === 'string' && text.length < 400
        ? (messagesString({ sourceLanguage, text, language: languageIso, settings }) as any)
        : typeof text === 'string'
        ? (messagesMarkdown({ sourceLanguage, text, language: languageIso, settings }) as any)
        : text?.root?.children
        ? (messagesWithJsonLexical({
            sourceLanguage,
            text: textMap,
            language: languageIso,
            settings,
          }) as any)
        : (messagesWithJson({ sourceLanguage, text, language: languageIso, settings }) as any)

    const finalPrompt = promptFunc({
      messages: promptMessage,
      namespace,
      sourceLanguage,
      language,
      settings,
    })

    const chatCompletion = await openai.chat.completions.create({
      model: /* textAsString.length > 2000 ? 'gpt-3.5-turbo-16k' :*/ 'gpt-4o', /// 'gpt-3.5-turbo', // gpt-3.5-turbo-1106 // gpt-3.5-turbo-16k-0613
      messages: finalPrompt,
      temperature: 0,
      max_tokens: 4096,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      ...restSettings,
    })

    if (text?.root?.children) {
      const newText = JSON.parse(JSON.stringify(text))
      console.log(
        'chatCompletion.choices[0].message.content',
        chatCompletion.choices[0].message.content,
      )
      reapplyText(
        newText.root,
        ['root'],
        JSON.parse(chatCompletion.choices[0].message.content as string),
        isTranslateNode,
      )
      return newText
    }

    const newItemResult =
      typeof text !== 'string'
        ? JSON.parse(chatCompletion.choices[0].message.content as string)
        : chatCompletion.choices[0].message.content

    return newItemResult
  } catch (error: any) {
    if (error.status === 429) {
      console.log(
        `Too many requests. Retry after ${error.headers['retry-after-ms']}ms. Retry count: ${retryCount}`,
      )

      await new Promise(resolve => setTimeout(resolve, error.headers['retry-after-ms']))
      const newResult: any = await translateTextOrObject({
        text,
        language,
        sourceLanguage,
        retryCount: retryCount + 1,
        settings,
      })

      return newResult
    } else {
      console.log(
        'Could not be translated',
        error /* , chatCompletion.choices[0].message.content */,
      )
    }
  }
}

/*export async function translateLongTextOrObject(
  text: string | object,
  language: string,
  sourceLanguage?: string,
  retryCount: number = 0,
) {
  const textAsString = typeof text === 'string' ? text : JSON.stringify(text, null, 2)

  if (textAsString.length < 400) {
    return translateTextOrObject(text, language, sourceLanguage)
  }

  if (typeof text !== 'string' && text.root.children) {
    console.log('text', text.root.children)
    const textAsArray = Object.keys(text.root.children).map(key => text[key])

    const textAsArrayTranslated = await Promise.all(
      textAsArray.map(async (item, index) => {
        const newItemResult = await translateLongTextOrObject(
          item,
          language,
          sourceLanguage,
          retryCount,
        )
        return newItemResult
      }),
    )

    const textAsObject = Object.keys(text.root.children).reduce((acc, key, index) => {
      acc[key] = textAsArrayTranslated[index]
      return acc
    }, {})

    text.root.children = textAsObject
    return text
  }
}*/
