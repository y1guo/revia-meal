import type { Metadata } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import { ThemeSync } from '@/components/ThemeSync'
import { themeScript } from '@/lib/theme-script'
import './globals.css'

const fraunces = Fraunces({
    variable: '--font-fraunces',
    subsets: ['latin'],
    axes: ['opsz', 'SOFT'],
    display: 'swap',
})

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
    display: 'swap',
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'revia · meal',
    description: "HeyRevia's daily lunch poll.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="min-h-full flex flex-col">
                <ThemeSync />
                {children}
            </body>
        </html>
    )
}
