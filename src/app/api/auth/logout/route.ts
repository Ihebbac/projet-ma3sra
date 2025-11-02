import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const c = await cookies()
  for (const k of ['session_token', 'ext_access', 'ext_refresh']) {
    c.set(k, '', { path: '/', maxAge: 0 })
  }
  return NextResponse.json({ ok: true })
}
