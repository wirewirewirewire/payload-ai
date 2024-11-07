# Payload AI

Translate content to different languages using [OpenAI's GPT](https://openai.com/).


### How to install the plugin

Install via npm:


```
npm install payload-ai
```

Or yarn:
```
yarn add payload-ai
```

To install the plugin, simply add it to your payload.config() in the Plugin array.

```ts
import payloadAi from 'payload-ai';

export const config = buildConfig({
  plugins: [
    // You can pass options to the plugin
    payloadAi({
		  enabled: true,
    }),
  ]
});
```

### Collection translation 📦

Add the `collections` where you want to enable the translation and the `fields`. It will translate each field (also nested fields) on every update of the default language.

```ts
plugins: [
  aiTranslatorPlugin({
    enabled: true,
    collections: {
      examples: { // Name of the collection you want to add translations
        fields: [
          'stringText', // Keys of fields you want to translate (wil also translate nested fields)
          'richText',
        ],
      },
    },
  }),
],
```


#### Custom prompts by Field

Use `promptFunc` for each field to customize the prompt.

```jsx
plugins: [
  aiTranslatorPlugin({
    enabled: true,
    collections: {
      examples: {
          settings: {
            model: 'gpt-4',
            promptFunc: ({ messages, namespace }) => {
              return [
                {
                  role: 'system',
                  content:
                    'Important: Add a smily face at the end of the message to make the AI more friendly. 😊',
                },
                ...messages,
              ]
            },
          },
        },
    }
  }
]
```


 The function will allow you to use the following

- `req`: Request
- `doc` Document in languages
-  `previousDoc` Old document (only available on Update)
-  `targetDoc` The old target document
- `collectionOptions`
- `language`
- translatorConfig
  language: string,
  sourceLanguage?: string,

- targetField
- sourceField



### Use with [payload-seo](https://payloadcms.com/docs/plugins/seo)

```jsx


import {generateTitle, generateDescription } from "payload-ai";

seo({
  collections: ['examples'],
  // uploadsCollection: 'media',
  generateTitle: generateTitle,
  generateDescription: ({ doc }) => generateDescription,
});
```

### String translation

Use this to provide a [backend](https://github.com/i18next/i18next-http-backend) for [i18next](https://www.i18next.com) string translations.


```jsx
plugins: [
  aiTranslatorPlugin({
    enabled: true,
    stringTranslation: {
      enabled: true
    }
  }),
],
```
#### Change model for string translation

To update the model you can change the collection settings in the same way as with other collections.

```jsx
plugins: [
  aiTranslatorPlugin({
    enabled: true,
    stringTranslation: {
      enabled: true
    }
    collections: {
      translations: {
        settings: {
          model: 'gpt-4',
        },
      }
    }
  }),
],
```

### Access control

By default the plugin will use the [update](https://payloadcms.com/docs/access-control/collections#update) access control of the collection.

To overwrite that behaviour you can add `access` to the collections configuration.


```jsx
plugins: [
  aiTranslatorPlugin({
    enabled: true,
    stringTranslation: {
      enabled: true
    }
    collections: {
      examples: {
        access: () => true,
      }
    }
  }),
],
```


### Planned features 🧭

- generate image alt text from GPT
- generate SEO Text
- generate structured content
- custom access control
- custom overrides for translation
- generate images based on input
- generate Open Graph based on content

#### Use in hooks

TODO: add documentation

myCollectionPrompt = ({source}) => {

  source()

  return 
}
