import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { AvatarMenu } from './AvatarMenu'
import { BottomTabs } from './BottomTabs'
import { TopNav } from './TopNav'

type AppShellProps = {
    user: {
        display_name: string | null
        email: string
        role: 'user' | 'admin'
    }
    signOutAction: () => void | Promise<void>
    children: ReactNode
    /** Tailwind max-width class for the main container. Defaults to reading width. */
    maxWidthClassName?: string
}

export function AppShell({
    user,
    signOutAction,
    children,
    maxWidthClassName = 'max-w-[1200px]',
}: AppShellProps) {
    const isAdmin = user.role === 'admin'
    return (
        <>
            <TopNav
                isAdmin={isAdmin}
                avatarMenu={
                    <AvatarMenu
                        displayName={user.display_name}
                        email={user.email}
                        isAdmin={isAdmin}
                        signOutAction={signOutAction}
                    />
                }
            />
            <main
                className={cn(
                    'mx-auto w-full flex-1',
                    'px-4 md:px-6 2xl:px-8',
                    'pt-6 md:pt-10',
                    'pb-24 md:pb-16',
                    maxWidthClassName,
                )}
            >
                {children}
            </main>
            <BottomTabs />
        </>
    )
}
