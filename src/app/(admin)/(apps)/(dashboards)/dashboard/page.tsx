import { type Metadata } from 'next'
import { Container } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DashboardClient from './components/DashboardClient'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function Page() {
  return (
    <Container fluid>
         
                
      <PageBreadcrumb title="Tableau de Bord" />
      <p className="text-muted mb-0">Vue d'ensemble de votre activité</p>
      <DashboardClient />
    </Container>
  )
}
