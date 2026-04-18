import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const PUBLIC_PREFIXES = ['/login', '/auth']

export async function proxy(request: NextRequest) {
    const { response, user } = await updateSession(request)
    const { pathname } = request.nextUrl

    const isPublic = PUBLIC_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(p + '/'),
    )
    if (isPublic) return response

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
