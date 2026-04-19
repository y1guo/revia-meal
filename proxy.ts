import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Paths the proxy should skip session-based auth for.
//   /login, /auth: genuinely public
//   /api: enforces its own Bearer-token auth inside each route handler,
//     so the cookie-session redirect would fight with API clients.
const PROXY_BYPASS_PREFIXES = ['/login', '/auth', '/api']

export async function proxy(request: NextRequest) {
    const { response, user } = await updateSession(request)
    const { pathname } = request.nextUrl

    const shouldBypass = PROXY_BYPASS_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(p + '/'),
    )
    if (shouldBypass) return response

    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        // All paths except Next.js internals and static asset extensions.
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
