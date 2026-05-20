import React from 'react'
import { Modal, Button, ModalHeader, ModalTitle, ModalBody, ModalFooter, Badge, Row, Col } from 'react-bootstrap'
import { TbCash, TbCalendar, TbMessage, TbUser, TbNotebook, TbCoin } from 'react-icons/tb'

type Caisse = {
  _id?: string
  motif?: string
  montant?: number | string
  type?: string
  date?: string | null
  commentaire?: string
  nomutilisatuer: string
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

export default function CaisseViewModal({ show, onHide, caisse }: { show: boolean; onHide: () => void; caisse: Caisse | null }) {
  if (!caisse) return null

  const isCred = caisse.type?.toLowerCase().includes('cred')

  return (
    <Modal show={show} onHide={onHide} centered>
      <ModalHeader closeButton className={isCred ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}>
        <ModalTitle as="h5" className="d-flex align-items-center gap-2">
          <TbCash size={20} />
          Détails de la caisse
        </ModalTitle>
      </ModalHeader>
      <ModalBody className="py-4">
        <Row className="g-3">
          <Col xs={6}>
            <div className="p-3 bg-body-tertiary rounded-3 h-100">
              <div className="text-body-secondary small mb-1">
                <TbUser size={14} className="me-1" />Ajouté par
              </div>
              <div className="fw-semibold">{caisse.nomutilisatuer?.split('@')[0] || '-'}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-body-tertiary rounded-3 h-100">
              <div className="text-body-secondary small mb-1">
                <TbCoin size={14} className="me-1" />Montant
              </div>
              <div className={`fw-bold fs-5 ${isCred ? 'text-success' : 'text-danger'}`}>
                {isCred ? '+' : '-'} {typeof caisse.montant === 'number' ? Math.abs(caisse.montant).toFixed(2) : caisse.montant || '0'} DT
              </div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-body-tertiary rounded-3 h-100">
              <div className="text-body-secondary small mb-1">
                <TbNotebook size={14} className="me-1" />Motif
              </div>
              <div className="fw-semibold">{caisse.motif || '-'}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-body-tertiary rounded-3 h-100">
              <div className="text-body-secondary small mb-1">
                <Badge bg={isCred ? 'success' : 'danger'} pill>Type</Badge>
              </div>
              <div className="fw-semibold">{isCred ? 'Crédit' : 'Débit'}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-body-tertiary rounded-3 h-100">
              <div className="text-body-secondary small mb-1">
                <TbCalendar size={14} className="me-1" />Date
              </div>
              <div className="fw-semibold">{formatDateDDMMYYYY(caisse.date)}</div>
            </div>
          </Col>
          <Col xs={12}>
            <div className="p-3 bg-body-tertiary rounded-3">
              <div className="text-body-secondary small mb-1">
                <TbMessage size={14} className="me-1" />Commentaire
              </div>
              <div className="fw-semibold" style={{ whiteSpace: 'pre-line' }}>{caisse.commentaire || '-'}</div>
            </div>
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter className="border-0 pt-0">
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  )
}
