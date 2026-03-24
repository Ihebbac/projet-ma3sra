// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/jwt'

const LOGIN_PATH = '/auth-2/sign-in'
const HOME_AFTER_LOGIN = '/dashboard'
const ERROR_404_PATH = '/error/404'

// Liste des préfixes de routes réservés à l'administration
const PROTECTED_PREFIXES = ['/dashboard', '/crm', '/users', '/auth-2']

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('session_token')?.value

  // Vérification de la session via JWT
  const getUser = async () => {
    if (!token) return null
    try {
      return await verifySession(token)
    } catch {
      return null
    }
  }
  
  const user = await getUser()

  // --- 1) GESTION DE LA RACINE (localhost:3000/ ou IP seule) ---
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL(HOME_AFTER_LOGIN, req.url))
    }
    // Pour un client (non connecté), on affiche la page d'erreur directement
    // On utilise .rewrite pour garder l'URL "/" mais afficher le contenu de la 404
    return NextResponse.rewrite(new URL(ERROR_404_PATH, req.url))
  }

  // --- 2) PROTECTION DES ROUTES ADMIN & AUTH ---
  if (isProtected(pathname)) {
    // Si l'utilisateur n'est pas connecté et tente d'accéder à l'admin
    if (!user) {
      // Si c'est la page de login elle-même, on peut l'autoriser UNIQUEMENT 
      // si on veut que l'admin puisse taper l'URL manuellement.
      // Mais pour bloquer le client curieux, on affiche la 404 même sur le login.
      if (pathname.startsWith(LOGIN_PATH)) {
        return NextResponse.next()
      }
      
      // Pour toute autre tentative (ex: /dashboard, /crm), on affiche la 404
      return NextResponse.rewrite(new URL(ERROR_404_PATH, req.url))
    }

    // Si l'utilisateur est connecté et tente d'aller sur la page de login
    if (user && pathname.startsWith(LOGIN_PATH)) {
      return NextResponse.redirect(new URL(HOME_AFTER_LOGIN, req.url))
    }
  }

  return NextResponse.next()
}

// Configuration du Matcher pour intercepter les routes concernées
export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/crm/:path*',
    '/users/:path*',
    '/auth-2/:path*',
  ],
}