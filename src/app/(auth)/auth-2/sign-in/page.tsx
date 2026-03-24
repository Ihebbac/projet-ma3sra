'use client'

import AppLogo from '@/components/AppLogo'
import { appName, currentYear } from '@/helpers'
import Link from 'next/link'
import { Card, CardBody, Col, FormControl, Row, Spinner } from 'react-bootstrap'
import { LuCircleUser, LuKeyRound } from 'react-icons/lu'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function PageInner() {
  const router = useRouter()
  const sp = useSearchParams() // ✅ maintenant sous Suspense

  const nextPath = '/dashboard'
  // si tu veux utiliser sp plus tard, c'est toujours dispo ici

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Identifiants invalides')

      window.localStorage.setItem('user', JSON.stringify(data.data))
      router.replace(nextPath)
    } catch (err: any) {
      setErrorMsg(
        `Impossible de se connecter : ${err?.message}` ||
          'Une erreur est survenue. Réessayez.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-box p-0 w-100">
      <Row className="w-100 g-0">
        <Col md={'auto'}>
          <Card className="auth-box-form border-0 mb-0 position-relative">
            {submitting && (
              <div
                className="position-absolute top-0 start-0 w-100"
                style={{ height: 4, overflow: 'hidden', borderRadius: 0 }}
              >
                <div
                  className="bg-primary"
                  style={{
                    width: '50%',
                    height: '100%',
                    animation: 'moveBar 1.2s linear infinite',
                  }}
                />

                <style jsx>{`
                  @keyframes moveBar {
                    0% {
                      transform: translateX(-100%);
                    }
                    100% {
                      transform: translateX(200%);
                    }
                  }
                `}</style>
              </div>
            )}

            <CardBody className="min-vh-100  flex-column justify-content-center">
              <div className="mt-auto">
                <h1 className="text-center mb-4">معصرة زيتون عصرية</h1>

                {errorMsg && (
                  <div className="alert alert-danger mt-3" role="alert">
                    {errorMsg}
                  </div>
                )}

                <form className="mt-4" onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label htmlFor="userEmail" className="form-label">
                      Adresse email <span className="text-danger">*</span>
                    </label>
                    <div className="app-search">
                      <FormControl
                        id="userEmail"
                        type="email"
                        placeholder="vous@exemple.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        disabled={submitting}
                      />
                      <LuCircleUser className="app-search-icon text-muted" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="userPassword" className="form-label">
                      Mot de passe <span className="text-danger">*</span>
                    </label>
                    <div className="app-search">
                      <FormControl
                        id="userPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={submitting}
                      />
                      <LuKeyRound className="app-search-icon text-muted" />
                    </div>
                  </div>

                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary fw-bold py-2 d-flex align-items-center justify-content-center gap-2"
                      disabled={submitting}
                    >
                      {submitting && (
                        <Spinner animation="border" size="sm" role="status" />
                      )}
                      {submitting ? 'Connexion…' : 'Se connecter'}
                    </button>
                  </div>
                </form>
              </div>

              <p className="text-center text-muted mt-auto mb-0">
                © {currentYear} {appName}
              </p>
            </CardBody>
          </Card>
        </Col>

        <div className="col">
          <div className="h-100 position-relative card-side-img rounded-0 overflow-hidden">
            <div className="p-4 card-img-overlay auth-overlay d-flex align-items-end justify-content-center" />
          </div>
        </div>
      </Row>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  )
}
