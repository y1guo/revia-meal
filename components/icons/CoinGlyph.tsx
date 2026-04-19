type CoinGlyphProps = {
    size?: number
    className?: string
}

export function CoinGlyph({ size = 14, className }: CoinGlyphProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            width={size}
            height={size}
            className={className}
            aria-hidden="true"
        >
            <ellipse
                cx="8"
                cy="11"
                rx="6"
                ry="2"
                fill="var(--color-saffron-700)"
                opacity="0.35"
            />
            <circle cx="8" cy="8" r="6" fill="var(--color-saffron-500)" />
            <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="var(--color-saffron-700)"
                strokeWidth="1"
                opacity="0.5"
            />
            <path
                d="M5.5 7.5 Q6.5 5 8 5 Q9.5 5 10.5 7.5"
                fill="none"
                stroke="var(--color-saffron-700)"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
            />
        </svg>
    )
}
