import { cookies } from 'next/headers'

const API = process.env.API_BASE_URL!

export async function apiFetch(path: string, init: RequestInit = {}) {
  const c = await cookies()
  let at = c.get('ext_access')?.value

  let res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${at ?? ''}` },
    cache: 'no-store',
  })

  if (res.status === 401 && c.get('ext_refresh')) {
    // refresh and retry
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/auth/refresh`, { method: 'POST' })
    if (r.ok) {
      at = (await cookies()).get('ext_access')?.value // cookie updated by route
      res = await fetch(`${API}${path}`, {
        ...init,
        headers: { ...(init.headers || {}), Authorization: `Bearer ${at ?? ''}` },
        cache: 'no-store',
      })
    }
  }

  return res
}
