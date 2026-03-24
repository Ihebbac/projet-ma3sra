'use client'

import AppLogo from '@/components/AppLogo'
import { currentYear } from '@/helpers'
import type { Metadata } from 'next'
import { Card, Col, Container, Row } from 'react-bootstrap'

// Si tu es dans un "Client Component", la metadata se gère dans un fichier layout ou parent.
// Si ce fichier est un Server Component, tu peux garder l'export metadata.

const Page = () => {
  return (
    <div className="auth-box overflow-hidden align-items-center d-flex min-vh-100" style={{ backgroundColor: '#f8faf8' }}>
      <Container>
        <Row className="justify-content-center">
          <Col xxl={4} md={6} sm={8}>
            <Card className="p-4 border-0 shadow-sm" style={{ borderRadius: '30px' }}>
              
              {/* Filigrane SVG Discret (Optionnel - Style Huile) */}
              <div className="position-absolute top-0 end-0" style={{ width: 150, opacity: '0.05' }}>
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#064e3b" d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,76.4,-44.7C83.7,-31.3,87.1,-15.7,85.3,-0.9C83.6,13.8,76.6,27.7,68.2,40.1C59.8,52.5,50,63.5,37.8,71.4C25.6,79.3,11,84.2,-3.2,89.7C-17.4,95.2,-31.2,101.3,-43.8,97.2C-56.4,93.1,-67.8,78.8,-76.3,64.2C-84.8,49.6,-90.4,34.7,-92.5,19.4C-94.6,4.1,-93.2,-11.6,-87.3,-25.4C-81.4,-39.2,-71,-51.1,-58.8,-58.8C-46.6,-66.5,-32.7,-70.1,-18.9,-75.1C-5,-80.1,8.7,-86.5,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>

              <div className="auth-brand text-center mb-2">
                <AppLogo />
              </div>

              <div className="p-4 text-center">
                {/* Style 404 discret en vert Maâsra */}
                <div className="fw-bold mb-2" style={{ fontSize: '4rem', color: '#064e3b', opacity: 0.2 }}>404</div>
                
                <h3 className="fw-bold text-uppercase mb-3" style={{ color: '#064e3b', letterSpacing: '1px' }}>
                  عذراً، الصفحة غير موجودة
                </h3>
                
                <p className="text-muted mb-4" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                  الصفحة التي تحاول الوصول إليها غير متوفرة حالياً أو أن الرابط قد تعطل.
                </p>

                {/* Icône Huile au lieu des boutons */}
                <div className="mt-2" style={{ fontSize: '3rem' }}>
                  🫒
                </div>
              </div>
            </Card>

            {/* Footer personnalisé */}
            <p className="text-center text-muted mt-4 mb-0" style={{ fontSize: '0.9rem' }}>
              © {currentYear} معصرة زيتون عصرية — جميع الحقوق محفوظة
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Page