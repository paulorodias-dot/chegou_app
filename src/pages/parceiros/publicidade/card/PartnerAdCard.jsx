import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  PARTNER_AD_CARD_DEFAULTS,
  PARTNER_AD_CARD_STATUS,
  PARTNER_AD_CARD_VARIANTS,
} from './partnerAdCard.constants'

import {
  formatPartnerAdValidity,
  isPartnerAdRenderable,
  normalizePartnerAdUrl,
  shouldOpenPartnerAdInNewTab,
} from './partnerAdCard.utils'

import './PartnerAdCard.css'

const DEFAULT_AUTOPLAY_INTERVAL = 7000

function normalizeSlides({
  slides,
  imageSrc,
  imageAlt,
  label,
  title,
  description,
  href,
  ctaLabel,
  status,
  validFrom,
  validUntil,
  campaignId,
  partnerId,
}) {
  if (Array.isArray(slides) && slides.length > 0) {
    return slides.filter((slide) =>
      isPartnerAdRenderable({
        status:
          slide.status ||
          PARTNER_AD_CARD_STATUS.ACTIVE,
        imageSrc: slide.imageSrc,
      }),
    )
  }

  if (
    isPartnerAdRenderable({
      status,
      imageSrc,
    })
  ) {
    return [
      {
        id: campaignId || 'partner-ad-single',
        campaignId,
        partnerId,
        imageSrc,
        imageAlt,
        label,
        title,
        description,
        href,
        ctaLabel,
        status,
        validFrom,
        validUntil,
      },
    ]
  }

  return []
}

function PartnerAdCard({
  slides = null,

  campaignId = null,
  partnerId = null,

  imageSrc = '',
  imageAlt = PARTNER_AD_CARD_DEFAULTS.imageAlt,

  label = PARTNER_AD_CARD_DEFAULTS.label,
  title = '',
  description = '',

  href = '',
  ctaLabel = PARTNER_AD_CARD_DEFAULTS.ctaLabel,

  variant = PARTNER_AD_CARD_DEFAULTS.variant,
  status = PARTNER_AD_CARD_DEFAULTS.status,

  validFrom = null,
  validUntil = null,

  moduleContext = '',
  placement = '',

  autoPlay = true,
  interval = DEFAULT_AUTOPLAY_INTERVAL,
  showIndicators = true,

  onImpression,
  onClick,
  onSlideChange,

  className = '',
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const impressionKeysRef = useRef(new Set())

  const normalizedSlides = useMemo(
    () =>
      normalizeSlides({
        slides,
        imageSrc,
        imageAlt,
        label,
        title,
        description,
        href,
        ctaLabel,
        status,
        validFrom,
        validUntil,
        campaignId,
        partnerId,
      }),
    [
      slides,
      imageSrc,
      imageAlt,
      label,
      title,
      description,
      href,
      ctaLabel,
      status,
      validFrom,
      validUntil,
      campaignId,
      partnerId,
    ],
  )

  const totalSlides = normalizedSlides.length
  const activeSlide =
    normalizedSlides[activeIndex] ||
    normalizedSlides[0]

  useEffect(() => {
    if (activeIndex < totalSlides) {
      return
    }

    setActiveIndex(0)
  }, [activeIndex, totalSlides])

  useEffect(() => {
    if (
      !autoPlay ||
      isPaused ||
      totalSlides <= 1
    ) {
      return undefined
    }

    const safeInterval = Math.max(
      Number(interval) || DEFAULT_AUTOPLAY_INTERVAL,
      3000,
    )

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        (currentIndex + 1) % totalSlides,
      )
    }, safeInterval)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    autoPlay,
    interval,
    isPaused,
    totalSlides,
  ])

  useEffect(() => {
    if (!activeSlide) {
      return
    }

    const impressionKey =
      activeSlide.campaignId ||
      activeSlide.id ||
      `partner-ad-${activeIndex}`

    if (
      impressionKeysRef.current.has(impressionKey)
    ) {
      return
    }

    impressionKeysRef.current.add(impressionKey)

    if (typeof onImpression === 'function') {
      onImpression({
        campaignId:
          activeSlide.campaignId || null,
        partnerId:
          activeSlide.partnerId || null,
        slideId: activeSlide.id || null,
        slideIndex: activeIndex,
        moduleContext,
        placement,
      })
    }
  }, [
    activeIndex,
    activeSlide,
    moduleContext,
    onImpression,
    placement,
  ])

  useEffect(() => {
    if (
      typeof onSlideChange !== 'function' ||
      !activeSlide
    ) {
      return
    }

    onSlideChange({
      slideId: activeSlide.id || null,
      slideIndex: activeIndex,
      totalSlides,
    })
  }, [
    activeIndex,
    activeSlide,
    onSlideChange,
    totalSlides,
  ])

  function selectSlide(index) {
    setActiveIndex(index)
  }

  function handleClick(event) {
    const safeHref = normalizePartnerAdUrl(
      activeSlide?.href,
    )

    if (!safeHref) {
      event.preventDefault()
      return
    }

    if (typeof onClick === 'function') {
      onClick({
        campaignId:
          activeSlide.campaignId || null,
        partnerId:
          activeSlide.partnerId || null,
        slideId: activeSlide.id || null,
        slideIndex: activeIndex,
        moduleContext,
        placement,
        href: safeHref,
      })
    }
  }

  if (!activeSlide) {
    return null
  }

  const safeHref = normalizePartnerAdUrl(
    activeSlide.href,
  )

  const openInNewTab =
    shouldOpenPartnerAdInNewTab(safeHref)

  const validityText = formatPartnerAdValidity({
    validFrom: activeSlide.validFrom,
    validUntil: activeSlide.validUntil,
  })

  const hasContent = Boolean(
    activeSlide.title ||
      activeSlide.description ||
      validityText ||
      (safeHref && activeSlide.ctaLabel),
  )

  const cardClassName = [
    'partner-ad-card',
    `partner-ad-card--${variant}`,
    totalSlides > 1
      ? 'partner-ad-card--carousel'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const imageContent = (
    <img
      key={activeSlide.id || activeSlide.imageSrc}
      className="partner-ad-card__image"
      src={activeSlide.imageSrc}
      alt={
        activeSlide.imageAlt ||
        PARTNER_AD_CARD_DEFAULTS.imageAlt
      }
      loading="lazy"
      decoding="async"
    />
  )

  return (
    <article
      className={cardClassName}
      data-campaign-id={
        activeSlide.campaignId || undefined
      }
      data-partner-id={
        activeSlide.partnerId || undefined
      }
      data-module-context={
        moduleContext || undefined
      }
      data-placement={placement || undefined}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      aria-roledescription={
        totalSlides > 1 ? 'carrossel' : undefined
      }
      aria-label={
        totalSlides > 1
          ? 'Publicidade de parceiros'
          : undefined
      }
    >
      <div className="partner-ad-card__media">
        {activeSlide.label && (
          <span className="partner-ad-card__label">
            {activeSlide.label}
          </span>
        )}

        {safeHref ? (
          <a
            className="partner-ad-card__image-link"
            href={safeHref}
            target={
              openInNewTab ? '_blank' : undefined
            }
            rel={
              openInNewTab
                ? 'noopener noreferrer'
                : undefined
            }
            aria-label={
              activeSlide.title
                ? `${activeSlide.ctaLabel || 'Saiba mais'}: ${activeSlide.title}`
                : activeSlide.ctaLabel ||
                  'Saiba mais'
            }
            onClick={handleClick}
          >
            {imageContent}
          </a>
        ) : (
          imageContent
        )}

        {showIndicators && totalSlides > 1 && (
          <div
            className="partner-ad-card__indicators"
            role="group"
            aria-label="Selecionar publicidade"
          >
            {normalizedSlides.map(
              (slide, index) => (
                <button
                  key={
                    slide.id ||
                    slide.campaignId ||
                    index
                  }
                  type="button"
                  className={[
                    'partner-ad-card__indicator',
                    index === activeIndex
                      ? 'is-active'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() =>
                    selectSlide(index)
                  }
                  aria-label={`Exibir publicidade ${index + 1} de ${totalSlides}`}
                  aria-current={
                    index === activeIndex
                      ? 'true'
                      : undefined
                  }
                />
              ),
            )}
          </div>
        )}
      </div>

      {hasContent && (
        <div className="partner-ad-card__content">
          {activeSlide.title && (
            <h2 className="partner-ad-card__title">
              {activeSlide.title}
            </h2>
          )}

          {activeSlide.description && (
            <p className="partner-ad-card__description">
              {activeSlide.description}
            </p>
          )}

          {validityText && (
            <p className="partner-ad-card__validity">
              {validityText}
            </p>
          )}

          {safeHref &&
            activeSlide.ctaLabel && (
              <a
                className="partner-ad-card__cta"
                href={safeHref}
                target={
                  openInNewTab
                    ? '_blank'
                    : undefined
                }
                rel={
                  openInNewTab
                    ? 'noopener noreferrer'
                    : undefined
                }
                onClick={handleClick}
              >
                <span>
                  {activeSlide.ctaLabel}
                </span>

                <span
                  className="partner-ad-card__cta-icon"
                  aria-hidden="true"
                >
                  →
                </span>
              </a>
            )}
        </div>
      )}

      {totalSlides > 1 && (
        <p
          className="partner-ad-card__screen-reader-status"
          aria-live="polite"
        >
          Publicidade {activeIndex + 1} de{' '}
          {totalSlides}.
        </p>
      )}
    </article>
  )
}

PartnerAdCard.VARIANTS =
  PARTNER_AD_CARD_VARIANTS

PartnerAdCard.STATUS =
  PARTNER_AD_CARD_STATUS

export default PartnerAdCard