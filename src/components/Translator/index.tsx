'use client'

import React, { useCallback } from 'react'

import { Button, useDocumentInfo } from '@payloadcms/ui'
import './Translator.scss'

type LocaleShape = { code: string; label?: string }

type LanguageStatus = 'queued' | 'processing' | 'completed' | 'failed'

type LanguageStatusMap = Record<
  string,
  {
    error?: string
    status: LanguageStatus
  }
>

const getTargetLocaleCodes = ({
  codes,
  locales,
  selectedSourceLocale,
}: {
  codes?: string[]
  locales: LocaleShape[]
  selectedSourceLocale: string
}) => {
  const requestedCodes =
    Array.isArray(codes) && codes.length ? codes : locales.map(locale => locale.code)

  return requestedCodes.filter(code => {
    if (code === selectedSourceLocale) return false
    return locales.some(locale => locale.code === code)
  })
}

const statusLabelMap: Record<LanguageStatus, string> = {
  queued: 'Queued',
  processing: 'Translating',
  completed: 'Done',
  failed: 'Failed',
}

type TranslatorProps = {
  localization?: {
    defaultLocale?: string
    locales?: Array<string | LocaleShape>
  }
}

export const Translator: React.FC<TranslatorProps> = ({ localization }) => {
  const baseClass = 'ai-translator'

  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [languageStatuses, setLanguageStatuses] = React.useState<LanguageStatusMap>({})
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [selectedModel, setSelectedModel] = React.useState<string>('default')

  const activeLocaleFromURL = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const url = new URL(window.location.href)
    return url.searchParams.get('locale') || undefined
  }, [])

  const defaultLocaleCode = localization?.defaultLocale || 'en'

  const locales = React.useMemo(() => {
    const localizationLocales = localization?.locales

    if (!Array.isArray(localizationLocales)) {
      return [{ code: defaultLocaleCode, label: defaultLocaleCode }]
    }

    const normalizedLocales: LocaleShape[] = []

    localizationLocales.forEach((localeEntry: any) => {
      if (typeof localeEntry === 'string') {
        normalizedLocales.push({
          code: localeEntry,
          label: localeEntry,
        })
        return
      }

      if (localeEntry && typeof localeEntry === 'object' && localeEntry.code) {
        normalizedLocales.push({
          code: localeEntry.code,
          label: localeEntry.label || localeEntry.code,
        })
      }
    })

    return normalizedLocales.length
      ? normalizedLocales
      : [{ code: defaultLocaleCode, label: defaultLocaleCode }]
  }, [defaultLocaleCode, localization?.locales])

  const activeLocaleCode =
    activeLocaleFromURL && locales.some(locale => locale.code === activeLocaleFromURL)
      ? activeLocaleFromURL
      : defaultLocaleCode

  const fallbackLocaleLabel =
    locales.find(locale => locale.code === activeLocaleCode)?.label || activeLocaleCode

  const [selectedSourceLocale, setSelectedSourceLocal] = React.useState<string>(activeLocaleCode)
  const documentInfo: any = useDocumentInfo()
  const routeMatch =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/\/admin\/collections\/([^/]+)\/([^/?#]+)/)
      : null
  const routeCollectionSlug = routeMatch?.[1]
  const routeDocumentId = routeMatch?.[2]

  const collectionSlug =
    documentInfo?.collectionSlug ||
    documentInfo?.docConfig?.slug ||
    documentInfo?.collection?.slug ||
    routeCollectionSlug
  const documentId = documentInfo?.id || documentInfo?.data?.id || routeDocumentId
  const hasDocumentContext =
    Boolean(collectionSlug) &&
    documentId !== undefined &&
    documentId !== null &&
    documentId !== '' &&
    documentId !== 'create'

  const handleOpenTranslator = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleCloseTranslator = useCallback(() => {
    setIsOpen(false)
  }, [])

  const modelOptions = [
    {
      label: 'Default',
      value: 'default',
    },
    {
      label: 'GPT-5 Mini ($0.25 in / $2.00 out per 1M)',
      value: 'gpt-5-mini',
    },
    {
      label: 'GPT-4.1 Mini ($0.80 in / $3.20 out per 1M)',
      value: 'gpt-4.1-mini',
    },
    {
      label: 'o3 ($2.00 in / $8.00 out per 1M)',
      value: 'o3',
    },
    {
      label: 'GPT-3.5 Turbo (1106)',
      value: 'gpt-3.5-turbo-1106',
    },
    {
      label: 'GPT-4 Turbo (Preview)',
      value: 'gpt-4-turbo-preview',
    },
    {
      label: 'GPT-5 ($1.25 in / $10.00 out per 1M)',
      value: 'gpt-5',
    },
  ]

  const sourceLocaleOptions = locales.map((locale: any) => ({
    label: locale.label,
    value: locale.code,
  }))

  const visibleLanguageStatuses = Object.entries(languageStatuses)
    .map(([code, value]) => ({
      code,
      error: value.error,
      label: locales.find(locale => locale.code === code)?.label || code,
      status: value.status,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))

  const translate = async ({ codes }: { codes?: string[] }) => {
    if (!hasDocumentContext) {
      console.error('Translator: Missing collection slug or document id', {
        collectionSlug,
        documentId,
        documentInfo,
      })
      return
    }

    const targetLocaleCodes = getTargetLocaleCodes({
      codes,
      locales,
      selectedSourceLocale,
    })

    if (!targetLocaleCodes.length) {
      setLanguageStatuses({})
      setStatusMessage('No target languages available for the current source locale.')
      return
    }

    const settings = {
      model: selectedModel === 'default' ? undefined : selectedModel,
    }

    setLanguageStatuses(
      Object.fromEntries(
        targetLocaleCodes.map(code => [code, { status: 'queued' as const }]),
      ) as LanguageStatusMap,
    )
    setStatusMessage(
      targetLocaleCodes.length === 1
        ? 'Translation started for 1 language.'
        : `Translation started for ${targetLocaleCodes.length} languages.`,
    )
    setIsLoading(true)

    try {
      const response = await fetch(`/api/${collectionSlug}/translate?locale=${activeLocaleCode}`, {
        method: 'POST',
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: documentId,
          locale: selectedSourceLocale,
          codes,
          settings,
        }),
      })

      if (!response.ok) {
        throw new Error(`Translation request failed with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Translation response did not include a progress stream.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let translationFailed = false

      while (true) {
        const { done, value } = await reader.read()

        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        lines.forEach(line => {
          const trimmedLine = line.trim()

          if (!trimmedLine) return

          const event = JSON.parse(trimmedLine) as {
            error?: string
            language?: string
            message?: string
            status?: LanguageStatus
            type?: 'started' | 'language' | 'complete' | 'error'
          }
          const nextStatus = event.status

          if (event.type === 'language' && event.language && nextStatus) {
            setLanguageStatuses(previousState => ({
              ...previousState,
              [event.language as string]: {
                error: event.error,
                status: nextStatus,
              },
            }))
            return
          }

          if (event.type === 'error') {
            translationFailed = true
            setStatusMessage(event.message || 'Translation failed.')
          }

          if (event.type === 'complete') {
            setStatusMessage('Translation finished.')
          }
        })

        if (done) {
          if (buffer.trim()) {
            const event = JSON.parse(buffer.trim()) as {
              error?: string
              language?: string
              message?: string
              status?: LanguageStatus
              type?: 'started' | 'language' | 'complete' | 'error'
            }
            const nextStatus = event.status

            if (event.type === 'language' && event.language && nextStatus) {
              setLanguageStatuses(previousState => ({
                ...previousState,
                [event.language as string]: {
                  error: event.error,
                  status: nextStatus,
                },
              }))
            }

            if (event.type === 'error') {
              translationFailed = true
              setStatusMessage(event.message || 'Translation failed.')
            }

            if (event.type === 'complete') {
              setStatusMessage('Translation finished.')
            }
          }

          if (translationFailed) {
            throw new Error('Translation failed.')
          }

          break
        }
      }
    } catch (error: any) {
      setStatusMessage(error?.message || 'Translation failed.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const translatorControls = (
    <div className={`${baseClass}__content`}>
      <p className={`${baseClass}__description`}>
        Choose source locale and AI model, then start translation for this document.
      </p>

      {statusMessage ? <p className={`${baseClass}__status-message`}>{statusMessage}</p> : null}

      {visibleLanguageStatuses.length ? (
        <div className={`${baseClass}__status-panel`} aria-live="polite">
          <p className={`${baseClass}__label`}>Language status</p>
          <div className={`${baseClass}__status-list`}>
            {visibleLanguageStatuses.map(language => (
              <div key={language.code} className={`${baseClass}__status-item`}>
                <div>
                  <p className={`${baseClass}__status-language`}>{language.label}</p>
                  {language.error ? (
                    <p className={`${baseClass}__status-error`}>{language.error}</p>
                  ) : null}
                </div>
                <span
                  className={`${baseClass}__status-pill ${baseClass}__status-pill--${language.status}`}
                >
                  <span className={`${baseClass}__status-dot`} />
                  {statusLabelMap[language.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`${baseClass}__field`}>
        <p className={`${baseClass}__label`}>Model</p>
        <div className={`${baseClass}__radio-group`} role="radiogroup" aria-label="Model">
          {modelOptions.map(option => (
            <label key={option.value} className={`${baseClass}__radio-option`}>
              <input
                type="radio"
                name="selectedModel"
                value={option.value}
                checked={selectedModel === option.value}
                onChange={() => setSelectedModel(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={`${baseClass}__field`}>
        <p className={`${baseClass}__label`}>Source locale</p>
        <div className={`${baseClass}__radio-group`} role="radiogroup" aria-label="Source locale">
          {sourceLocaleOptions.map(option => (
            <label key={option.value} className={`${baseClass}__radio-option`}>
              <input
                type="radio"
                name="sourceLocale"
                value={option.value}
                checked={selectedSourceLocale === option.value}
                onChange={() => setSelectedSourceLocal(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={`${baseClass}__translation-buttons`}>
        <Button
          buttonStyle="primary"
          className={`${baseClass}__action`}
          disabled={isLoading || !hasDocumentContext}
          onClick={() => translate({})}
        >
          <span>Translate content to all languages</span>
        </Button>
        <Button
          buttonStyle="secondary"
          className={`${baseClass}__action`}
          disabled={isLoading || !hasDocumentContext}
          onClick={() => translate({ codes: [activeLocaleCode] })}
        >
          <span>Translate only {fallbackLocaleLabel}</span>
        </Button>
        <Button
          buttonStyle="secondary"
          className={`${baseClass}__action`}
          onClick={handleCloseTranslator}
        >
          <span>Close</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className={baseClass}>
      <Button
        buttonStyle="secondary"
        className={`${baseClass}__drawer__toggler`}
        onClick={handleOpenTranslator}
        size="small"
      >
        Translator
      </Button>

      {isOpen && (
        <div className={`${baseClass}__modal`} role="dialog" aria-modal={true}>
          <div className={`${baseClass}__backdrop`} onClick={handleCloseTranslator} />
          <div className={`${baseClass}__dialog`}>{translatorControls}</div>
        </div>
      )}
    </div>
  )
}
