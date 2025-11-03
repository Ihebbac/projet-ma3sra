'use client'

import { userDropdownItems } from '@/layouts/components/data'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useState } from 'react'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbChevronDown } from 'react-icons/tb'
import { useRouter } from 'next/navigation'

// Importations d'images
import user3 from '@/assets/images/users/user-2.jpg' // Image par défaut pour Caissier
import user6 from '@/assets/images/users/user-6.jpg' // Nouvelle image ou icône pour Propriétaire

const LOGIN_PATH = '/auth-2/sign-in'

// Ajout des props pour recevoir le rôle depuis Topbar
interface UserProfileProps {
    displayRole?: string;
}

const UserProfile = ({ displayRole = 'caissier' }: UserProfileProps) => {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Déterminer l'image à afficher
  const userImage = displayRole === 'Proprietaire' ? user6 : user3
  
  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // Simuler l'appel API de déconnexion
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    } finally {
      // Nettoyage de localStorage ou de tout état de session ici si nécessaire
      localStorage.removeItem('user') 
      
      // Redirige vers la page de login
      router.replace(LOGIN_PATH)
      router.refresh() // force un refresh des données côté client
    }
  }

  return (
    <div className="topbar-item nav-user">
      <Dropdown align="end">
        <DropdownToggle as={'a'} className="topbar-link dropdown-toggle drop-arrow-none px-2">
          {/* Utiliser l'image dynamique */}
          <Image src={userImage.src} width={32} height={32} className="rounded-circle me-lg-2 d-flex" alt="user-image" />
          <div className="d-lg-flex align-items-center gap-1 d-none">
            {/* Utiliser le rôle dynamique */}
            <h5 className="my-0">{displayRole}</h5>
            <TbChevronDown className="align-middle" />
          </div>
        </DropdownToggle>

        <DropdownMenu className="dropdown-menu-end">
          {userDropdownItems.map((item, idx) => (
            <Fragment key={idx}>
              {item.isHeader ? (
                <div className="dropdown-header noti-title">
                  <h6 className="text-overflow m-0">{item.label}</h6>
                </div>
              ) : item.isDivider ? (
                <DropdownDivider />
              ) : item.url === '#' ? (
                // ✅ Item "Logout" (ou action) : bouton qui appelle handleLogout
                <DropdownItem as="button" type="button" className={item.class} onClick={handleLogout} disabled={loggingOut}>
                  {item.icon && <item.icon className="me-2 fs-17 align-middle" />}
                  <span className="align-middle">{loggingOut ? 'Déconnexion…' : item.label}</span>
                </DropdownItem>
              ) : (
                // ✅ Les autres items gardent Link
                <DropdownItem as={Link} href={item.url} className={item.class}>
                  {item.icon && <item.icon className="me-2 fs-17 align-middle" />}
                  <span className="align-middle">{item.label}</span>
                </DropdownItem>
              )}
            </Fragment>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default UserProfile
