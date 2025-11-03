// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signSession } from '@/lib/jwt'
import { json } from 'stream/consumers'

const API = 'http://localhost:8170'!

export async function POST(req: Request) {
  try {
    const body = await req.json() // { email, password }

    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await r.json()

    if (!r.ok) {
      return NextResponse.json({ error: data?.message || 'Invalid credentials' }, { status: 401 })
    }

    const access = data.access_token || data.accessToken || data.token
    const refresh = data.refresh_token || data.refreshToken || null
    if (!access) {
      return NextResponse.json({ error: 'API did not return an access token' }, { status: 500 })
    }

    // Pull user info either from response or via /auth/me
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

    // ❗ cookies() is sync
    const c = await cookies()

    // 1) Our session (verified by middleware)
    c.set('session_token', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    })
    // 2) External tokens (for server-to-API calls)
    c.set('ext_access', access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    if (refresh) {
      c.set('ext_refresh', refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    }

    return NextResponse.json({ ok: true,    data:{ sub: user?.id?.toString?.() || user?._id, email: user?.email, roles: user?.roles }
  })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Login failed' }, { status: 400 })
  }
}
