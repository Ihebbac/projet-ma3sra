// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/jwt' // make sure /lib/jwt.ts exists

const LOGIN_PATH = '/auth-2/sign-in'
const HOME_AFTER_LOGIN = '/dashboard'
const PROTECTED_PREFIXES = ['/dashboard', '/crm', '/users'] // add more bases if needed

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function redirectTo(req: NextRequest, path: string) {
  const url = req.nextUrl.clone()
  url.pathname = path
  // keep query if you want; for login redirects we build ?next= explicitly
  return NextResponse.redirect(url)
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const token = req.cookies.get('session_token')?.value
  const hasCookie = Boolean(token)

  // Try to verify session (non-throwing)
  const getUser = async () => {
    if (!token) return null
    try {
      return await verifySession(token)
    } catch {
      return null
    }
  }
  const user = await getUser()

  // 1) Root: send to dashboard if logged, else to login
  if (pathname === '/') {
    return user ? redirectTo(req, HOME_AFTER_LOGIN) : redirectTo(req, LOGIN_PATH)
  }

  // 2) Guard protected routes
  if (isProtected(pathname)) {
    if (user) return NextResponse.next()

    const res = redirectTo(req, `${LOGIN_PATH}`)
    if (hasCookie) {
      // stale/invalid cookie → clear to avoid loops
      res.cookies.set('session_token', '', { path: '/', maxAge: 0 })
    }
    return res
  }

  // 3) Login page behavior
  //    - If already logged in, bounce to dashboard
  //    - If cookie exists but invalid, clear it and allow page
  if (pathname === LOGIN_PATH || pathname.startsWith(LOGIN_PATH + '/')) {
    if (user) return redirectTo(req, HOME_AFTER_LOGIN)
    if (hasCookie && !user) {
      const res = NextResponse.next()
      res.cookies.set('session_token', '', { path: '/', maxAge: 0 })
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/', // root
    '/dashboard/:path*', // protect dashboard and subpaths
    '/crm/:path*', // protect all CRM pages
    '/users/:path*', // protect users pages
    '/auth-2/sign-in', // login page (no trailing slash bug)
    '/auth-2/sign-in/:path*', // login subpaths if any
  ],
}
