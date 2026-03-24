'use client'

import AppLogo from '@/components/AppLogo'
import { currentYear } from '@/helpers'
import { Card, Col, Container, Row } from 'react-bootstrap'

const NotFoundPage = () => {
  return (
    <div className="auth-box overflow-hidden align-items-center d-flex min-vh-100" style={{ backgroundColor: '#f8faf8' }}>
      <Container>
        <Row className="justify-content-center">
          <Col xxl={4} md={6} sm={8}>
            <Card className="p-4 border-0 shadow-sm" style={{ borderRadius: '30px', textAlign: 'center' }}>
              
              {/* Logo de l'huilerie */}
              <div className="auth-brand mb-4">
                <AppLogo />
              </div>

              <div className="p-2">
                {/* Grand code erreur discret */}
                <div 
                  className="fw-bold" 
                  style={{ fontSize: '5rem', color: '#064e3b', opacity: 0.1, lineHeight: 1 }}
                >
                  404
                </div>
                
                {/* Message en Arabe */}
                <h3 className="fw-bold mt-3" style={{ color: '#064e3b', fontFamily: 'Cairo, sans-serif' }}>
                  عذراً، الصفحة غير موجودة
                </h3>
                
                {/* Message en Français */}
                <p className="text-muted mt-2 mb-4">
                  Page Introuvable <br />
                  <small>La page que vous cherchez n'existe pas ou l'adresse est incorrecte.</small>
                </p>

                {/* Icône symbolique (Olive) */}
                <div className="mt-2" style={{ fontSize: '3.5rem' }}>
                  🫒
                </div>
              </div>
            </Card>

            {/* Footer avec votre nom de Maâsra */}
            <p className="text-center text-muted mt-4 mb-0">
              © {currentYear} معصرة زيتون عصرية — جميع الحقوق محفوظة
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default NotFoundPage