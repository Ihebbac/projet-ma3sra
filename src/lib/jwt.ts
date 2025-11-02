import { SignJWT, jwtVerify } from 'jose'

const SESSION_SECRET = process.env.SESSION_SECRET!
const enc = new TextEncoder()

export type Session = {
  sub: string
  email: string
  roles: string[]
}

export async function signSession(session: Session, exp: string = '1d') {
  return await new SignJWT(session as any)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(enc.encode(SESSION_SECRET))
}

export async function verifySession(token: string): Promise<Session> {
  const { payload } = await jwtVerify(token, enc.encode(SESSION_SECRET))
  return payload as unknown as Session
}
