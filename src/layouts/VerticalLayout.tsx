'use client'

import Customizer from '@/layouts/components/customizer'
import Footer from '@/layouts/components/footer'
import Sidenav from '@/layouts/components/sidenav'
import Topbar from '@/layouts/components/topbar'
import { Fragment, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChildrenType } from '@/types'

const VerticalLayout = ({ children }: ChildrenType) => {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  // 🔥 Déclenche le loader à chaque changement de route
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 800) // durée simulée
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <Fragment>
      {/* === Barre de progression animée === */}
      {loading && (
        <div
          className="position-fixed top-0 start-0 w-100"
          style={{
            height: 3,
            zIndex: 3000,
            overflow: 'hidden',
            backgroundColor: 'transparent',
          }}
        >
          <div
            className="bg-primary"
            style={{
              height: '100%',
              width: '50%',
              animation: 'moveBar 1.2s linear infinite',
            }}
          ></div>
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

      {/* === Overlay + Spinner === */}
      {loading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light bg-opacity-75"
          style={{ zIndex: 2500, transition: 'opacity 0.3s ease' }}
        >
          <div
            className="spinner-border text-primary"
            role="status"
            style={{ width: 80, height: 80 }}
          >
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      )}

      {/* === Contenu principal === */}
      <div className="wrapper">
        <Sidenav />
        <Topbar />

        <div className="content-page">
          {children}
          <Footer />
        </div>
      </div>

      <Customizer />
    </Fragment>
  )
}

export default VerticalLayout
