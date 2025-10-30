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
      <PageBreadcrumb title="Dashboard" />
      <DashboardClient />
    </Container>
  )
}
