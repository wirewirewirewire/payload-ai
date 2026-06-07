'use client'

import { Button, useDocumentInfo } from '@payloadcms/ui'
import React, { useCallback } from 'react'

import { modelOptions } from '../../modelOptions.js'

import './Translator.css'

type LocaleShape = { code: string; label?: string }

type LanguageStatus = 'completed' | 'failed' | 'processing' | 'queued'

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
    if (code === selectedSourceLocale) {return false}
    return locales.some(locale => locale.code === code)
  })
}

const statusLabelMap: Record<LanguageStatus, string> = {
  completed: 'Done',
  failed: 'Failed',
  processing: 'Translating',
  queued: 'Queued',
}

const getLocaleFromURL = () => {
  if (typeof window === 'undefined') {return undefined}
  const url = new URL(window.location.href)
  return url.searchParams.get('locale') || undefined
}

const getActiveLocaleCode = ({
  defaultLocaleCode,
  locales,
}: {
  defaultLocaleCode: string
  locales: LocaleShape[]
}) => {
  const localeFromURL = getLocaleFromURL()

  return localeFromURL && locales.some(locale => locale.code === localeFromURL)
    ? localeFromURL
    : defaultLocaleCode
}

type TranslatorProps = {
  localization?: {
    defaultLocale?: string
    locales?: Array<LocaleShape | string>
  }
}

export const Translator: React.FC<TranslatorProps> = ({ localization }) => {
  const baseClass = 'ai-translator'

  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [languageStatuses, setLanguageStatuses] = React.useState<LanguageStatusMap>({})
  const [statusMessage, setStatusMessage] = React.useState<null | string>(null)
  const [selectedModel, setSelectedModel] = React.useState<string>('default')

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

  const activeLocaleCode = getActiveLocaleCode({
    defaultLocaleCode,
    locales,
  })

  const fallbackLocaleLabel =
    locales.find(locale => locale.code === activeLocaleCode)?.label || activeLocaleCode

  const [selectedSourceLocale, setSelectedSourceLocale] = React.useState<string>(activeLocaleCode)
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
    setSelectedSourceLocale(getActiveLocaleCode({ defaultLocaleCode, locales }))
    setIsOpen(true)
  }, [defaultLocaleCode, locales])

  const handleCloseTranslator = useCallback(() => {
    setIsOpen(false)
  }, [])

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
      const response = await fetch(
        `/api/${collectionSlug}/translate?locale=${encodeURIComponent(selectedSourceLocale)}`,
        {
          body: JSON.stringify({
            id: documentId,
            codes,
            locale: selectedSourceLocale,
            settings,
            sourceLocale: selectedSourceLocale,
          }),
          headers: {
            Accept: 'application/x-ndjson',
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )

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

          if (!trimmedLine) {return}

          const event = JSON.parse(trimmedLine) as {
            error?: string
            language?: string
            message?: string
            status?: LanguageStatus
            type?: 'complete' | 'error' | 'language' | 'started'
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
              type?: 'complete' | 'error' | 'language' | 'started'
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
        <div aria-live="polite" className={`${baseClass}__status-panel`}>
          <p className={`${baseClass}__label`}>Language status</p>
          <div className={`${baseClass}__status-list`}>
            {visibleLanguageStatuses.map(language => (
              <div className={`${baseClass}__status-item`} key={language.code}>
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
        <div aria-label="Model" className={`${baseClass}__radio-group`} role="radiogroup">
          {modelOptions.map(option => (
            <label className={`${baseClass}__radio-option`} key={option.value}>
              <input
                checked={selectedModel === option.value}
                name="selectedModel"
                onChange={() => setSelectedModel(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={`${baseClass}__field`}>
        <p className={`${baseClass}__label`}>Source locale</p>
        <div aria-label="Source locale" className={`${baseClass}__radio-group`} role="radiogroup">
          {sourceLocaleOptions.map(option => (
            <label className={`${baseClass}__radio-option`} key={option.value}>
              <input
                checked={selectedSourceLocale === option.value}
                name="sourceLocale"
                disabled={isLoading}
                onChange={() => setSelectedSourceLocale(option.value)}
                type="radio"
                value={option.value}
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
        <div aria-modal={true} className={`${baseClass}__modal`} role="dialog">
          <div className={`${baseClass}__backdrop`} onClick={handleCloseTranslator} />
          <div className={`${baseClass}__dialog`}>{translatorControls}</div>
        </div>
      )}
    </div>
  )
}
