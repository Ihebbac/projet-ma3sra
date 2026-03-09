// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { signSession } from '@/lib/jwt'

const API = 'http://192.168.1.15:8170'

function isHttps(req: Request) {
  const proto = req.headers.get('x-forwarded-proto')
  if (proto) return proto === 'https'
  return req.url.startsWith('https://')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await r.json()

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.message || 'Invalid credentials' },
        { status: 401 }
      )
    }

    const access = data.access_token || data.accessToken || data.token
    const refresh = data.refresh_token || data.refreshToken || null
    if (!access) {
      return NextResponse.json(
        { error: 'API did not return an access token' },
        { status: 500 }
      )
    }

    let user = data.user
    if (!user) {
      const me = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${access}` },
        cache: 'no-store',
      })
      user = me.ok ? await me.json() : null
    }

    const session = await signSession({
      sub: user?.id?.toString?.() || user?._id || 'unknown',
      email: user?.email || body.email,
      roles: user?.roles || ['user'],
    })

    const secure = isHttps(req) // ✅ IMPORTANT

    const res = NextResponse.json({
      ok: true,
      data: { sub: user?.id?.toString?.() || user?._id, email: user?.email, roles: user?.roles },
    })

    res.cookies.set('session_token', session, {
      httpOnly: true,
      secure,          // ✅ plus basé sur NODE_ENV
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    })

    res.cookies.set('ext_access', access, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })

    if (refresh) {
      res.cookies.set('ext_refresh', refresh, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    }

    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Login failed' }, { status: 400 })
  }
}
