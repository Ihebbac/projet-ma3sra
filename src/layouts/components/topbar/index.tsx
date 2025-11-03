'use client'
import { useLayoutContext } from '@/context/useLayoutContext'
import CustomizerToggler from '@/layouts/components/topbar/components/CustomizerToggler'
import LanguageDropdown from '@/layouts/components/topbar/components/LanguageDropdown'
import MegaMenu from '@/layouts/components/topbar/components/MegaMenu'
import MessageDropdown from '@/layouts/components/topbar/components/MessageDropdown'
import ThemeToggler from '@/layouts/components/topbar/components/ThemeToggler'
import UserProfile from '@/layouts/components/topbar/components/UserProfile'
import Image from 'next/image'
import Link from 'next/link'
import { Container, FormControl } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbMenu4 } from 'react-icons/tb'
import { useEffect, useState } from 'react' // <-- Ajout de useEffect et useState

import logoDark from '@/assets/images/logo-black.jpg'
import logoSm from '@/assets/images/logo-sm.jpg'
import logo from '@/assets/images/logo.jpg'
import ApplicationMenu from '@/layouts/components/topbar/components/ApplicationMenu'
import FullscreenToggle from '@/layouts/components/topbar/components/FullscreenToggle'
import MonochromeThemeModeToggler from '@/layouts/components/topbar/components/MonochromeThemeModeToggler'

// Définition du type utilisateur pour typage
type User = {
    roles?: string[]
} | null

const Topbar = () => {
  const { sidenav, changeSideNavSize, showBackdrop } = useLayoutContext()

  // 1. État pour stocker l'utilisateur
  const [user, setUser] = useState<User>(null)

  // 2. Chargement de l'utilisateur depuis localStorage au montage
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing user from localStorage:', error)
        setUser(null)
      }
    }
  }, [])

  // 3. Déterminer si l'utilisateur est propriétaire
  const isProprietaire = user?.roles?.includes('Proprietaire') ?? false

  // 4. Déterminer le rôle à afficher dans l'UI
  const displayRole = isProprietaire ? 'Proprietaire' : 'caissier'


  const toggleSideNav = () => {
    const html = document.documentElement
    const currentSize = html.getAttribute('data-sidenav-size')

    if (currentSize === 'offcanvas') {
      html.classList.toggle('sidebar-enable')
      showBackdrop()
    } else if (sidenav.size === 'compact') {
      changeSideNavSize(currentSize === 'compact' ? 'condensed' : 'compact', false)
    } else {
      changeSideNavSize(currentSize === 'condensed' ? 'default' : 'condensed')
    }
  }
  

  return (
    <header className="app-topbar">
      <Container fluid className="topbar-menu">
        <div className="d-flex align-items-center gap-2">
          <div className="logo-topbar">
            <Link href="/" className="logo-light">
              <span className="logo-lg">
                <Image src={logo.src} alt="logo" width={94.3} height={22} />
              </span>
              <span className="logo-sm">
                <Image src={logoSm.src} alt="small logo" width={30.55} height={26} />
              </span>
            </Link>

            <Link href="/" className="logo-dark">
              <span className="logo-lg">
                <Image src={logoDark.src} alt="dark logo" width={94.3} height={22} />
              </span>
              <span className="logo-sm">
                <Image src={logoSm.src} alt="small logo" width={30.55} height={26} />
              </span>
            </Link>
          </div>

          <button onClick={toggleSideNav} className="sidenav-toggle-button btn btn-default btn-icon">
            <TbMenu4 className="fs-22" />
          </button>

          {/* <MegaMenu /> */}
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* <div className="app-search d-none d-xl-flex me-2">
            <FormControl type="search" className="topbar-search rounded-pill" name="search" placeholder="Quick Search..." />
            <LuSearch className="app-search-icon text-muted" />
          </div> */}

          {/* <LanguageDropdown /> */}

          {/* <MessageDropdown /> */}

          {/* <ApplicationMenu /> */}

          <ThemeToggler />

          <FullscreenToggle />

          {/* <MonochromeThemeModeToggler /> */}

          {/* 5. Passage du rôle dynamique au composant UserProfile */}
          <UserProfile displayRole={displayRole} />

          {/* <CustomizerToggler /> */}
        </div>
      </Container>
    </header>
  )
}

export default Topbar
