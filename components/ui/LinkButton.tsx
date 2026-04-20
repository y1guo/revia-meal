import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
    buttonClasses,
    buttonIconSize,
    type ButtonSize,
    type ButtonVariant,
} from './Button'

type NextLinkProps = ComponentProps<typeof Link>

type LinkButtonProps = Omit<NextLinkProps, 'children'> & {
    variant?: ButtonVariant
    size?: ButtonSize
    leftIcon?: LucideIcon
    rightIcon?: LucideIcon
    children?: ReactNode
}

/**
 * Anchor styled like <Button>. Use for navigation that needs to look like an
 * action button (e.g. "Clear filters" next to a primary "Apply").
 */
export function LinkButton({
    variant = 'secondary',
    size = 'md',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    children,
    ...rest
}: LinkButtonProps) {
    const iconSize = buttonIconSize(size)
    return (
        <Link
            {...rest}
            className={buttonClasses({ variant, size, className })}
        >
            {LeftIcon ? (
                <LeftIcon
                    size={iconSize}
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            ) : null}
            {children != null && <span>{children}</span>}
            {RightIcon ? (
                <RightIcon
                    size={iconSize}
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            ) : null}
        </Link>
    )
}
