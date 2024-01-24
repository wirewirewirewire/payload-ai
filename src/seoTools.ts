export const generateTitle = async ({ doc, locale }: any) => {
  console.log('sourceLanguage', locale)
  const body = {
    model: 'gpt-3.5-turbo-1106',
    messages: [
      {
        role: 'system',
        content: `
You will be provided with a blog post as json. 
Craft a title of the blog post for Google SEO purpose, which should be between 50 and 60 characters.
Return the title in the language with ISO-2-Code: "${locale.code}".
Only return the title without any comment or quotes, not the rest of the blog post.
      `,
      },
      {
        role: 'user',
        content: `${JSON.stringify(doc, null, 2).substring(0, 2000)}`,
      },
    ],
    max_tokens: 30,
  }

  try {
    const response = await fetch(`/api/generate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body) as any,
    })

    const chatCompletion = await response.json()
    return chatCompletion.choices[0].message.content
  } catch (error) {
    console.error(error)
  }
}

export const generateDescription = async ({ doc, locale }: any) => {
  const body = {
    model: 'gpt-3.5-turbo-1106',
    messages: [
      {
        role: 'system',
        content: `
You will be provided with a blog post as json. Only use the values in the JSON object.
Craft such a meta description for Google SEO for this blog post and output only the result (maximum 150 characters) without any comment or quotes.
Return the title in the language with ISO-2-Code: "${locale.code}".
Make sure it is shorter than 150 characters.
Only return the title without any comment or quotes, not the rest of the blog post.
      `,
      },
      {
        role: 'user',
        content: `${JSON.stringify(doc, null, 2).substring(0, 2000)}`,
      },
    ],
    max_tokens: 50,
  }

  try {
    const response = await fetch(`/api/generate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body) as any,
    })

    const chatCompletion = await response.json()
    return chatCompletion.choices[0].message.content
  } catch (error) {
    console.error(error)
  }
}
