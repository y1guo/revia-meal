'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, Settings as SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'

type AvatarMenuProps = {
    displayName: string | null
    email: string
    avatarUrl?: string | null
    isAdmin: boolean
    signOutAction: () => void | Promise<void>
    /** If true, Theme segment renders inside the panel (desktop). If false, hidden (mobile puts it in /settings). */
    showThemeToggle?: boolean
    className?: string
}

export function AvatarMenu({
    displayName,
    email,
    avatarUrl,
    isAdmin,
    signOutAction,
    showThemeToggle = true,
    className,
}: AvatarMenuProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                className={cn(
                    'inline-flex items-center gap-1.5',
                    'rounded-full pl-0.5 pr-2 py-0.5',
                    'hover:bg-[color:var(--surface-raised)]',
                    'transition-colors duration-150',
                    className,
                )}
                aria-label="Account menu"
            >
                <Avatar
                    name={displayName}
                    email={email}
                    imageUrl={avatarUrl}
                    size={28}
                />
                <ChevronDown
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-[color:var(--text-secondary)]"
                />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className={cn(
                        'z-50 w-[280px] p-1.5',
                        'bg-[color:var(--surface-raised)]',
                        'border border-[color:var(--border-subtle)]',
                        'rounded-[var(--radius-lg)]',
                        'shadow-[var(--shadow-card-hover)]',
                    )}
                >
                    <div className="flex items-start gap-3 px-2 py-2">
                        <Avatar
                            name={displayName}
                            email={email}
                            imageUrl={avatarUrl}
                            size={40}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="text-[0.875rem] font-medium text-[color:var(--text-primary)] truncate">
                                {displayName ?? email}
                            </div>
                            {displayName && (
                                <div className="text-[0.75rem] text-[color:var(--text-secondary)] truncate">
                                    {email}
                                </div>
                            )}
                            {isAdmin && (
                                <div className="mt-1.5">
                                    <Chip variant="accent">Admin</Chip>
                                </div>
                            )}
                        </div>
                    </div>
                    <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
                    <DropdownMenu.Item asChild>
                        <Link
                            href="/settings"
                            className={cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)]',
                                'text-[0.875rem] text-[color:var(--text-primary)]',
                                'data-[highlighted]:bg-[color:var(--surface-sunken)]',
                                'outline-none cursor-pointer',
                            )}
                        >
                            <SettingsIcon
                                size={16}
                                strokeWidth={1.75}
                                aria-hidden="true"
                                className="text-[color:var(--text-secondary)]"
                            />
                            Settings
                        </Link>
                    </DropdownMenu.Item>
                    {isAdmin && (
                        <DropdownMenu.Item asChild>
                            <Link
                                href="/admin"
                                className={cn(
                                    'flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)]',
                                    'text-[0.875rem] text-[color:var(--text-primary)]',
                                    'data-[highlighted]:bg-[color:var(--surface-sunken)]',
                                    'outline-none cursor-pointer md:hidden',
                                )}
                            >
                                <SettingsIcon
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                    className="text-[color:var(--text-secondary)]"
                                />
                                Admin
                            </Link>
                        </DropdownMenu.Item>
                    )}
                    {showThemeToggle && (
                        <>
                            <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
                            <div className="px-2 py-2">
                                <div className="text-[0.75rem] uppercase tracking-wide text-[color:var(--text-tertiary)] mb-1.5">
                                    Theme
                                </div>
                                <ThemeToggle size="sm" className="w-full" />
                            </div>
                        </>
                    )}
                    <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
                    <DropdownMenu.Item asChild>
                        <form action={signOutAction} className="contents">
                            <button
                                type="submit"
                                className={cn(
                                    'flex w-full items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)]',
                                    'text-[0.875rem] text-[color:var(--text-primary)]',
                                    'data-[highlighted]:bg-[color:var(--surface-sunken)]',
                                    'outline-none cursor-pointer',
                                )}
                            >
                                <LogOut
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                    className="text-[color:var(--text-secondary)]"
                                />
                                Sign out
                            </button>
                        </form>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}
