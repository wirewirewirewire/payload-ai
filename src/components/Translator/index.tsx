import React from 'react'

import { Button } from 'payload/components/elements'

const baseClass = 'after-dashboard'

export const Translator: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const translate = async () => {
    try {
      const response = await fetch('/api/ai-translator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: 'sss', // valuesToTranslate.map(({ value }) => value),
          // from: localeTranslateFrom,
          // to: locale,
        }),
      })

      const translatedValues = await response.json()

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      console.error(error)
    }
  }

  return (
    <div className={baseClass}>
      <Button disabled={isLoading} size="small" onClick={translate}>
        <span>Translate content from default language</span>
        {/* {isLoading && <Loader size={'sm'} />}  */}
      </Button>
    </div>
  )
}
