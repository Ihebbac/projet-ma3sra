'use client'

import { Badge, Button, Card, Col, Modal, Row } from 'react-bootstrap'
import { TbEye, TbPrinter, TbX } from 'react-icons/tb'
import { TransactionType } from '../types'

const formatDateTime = (value?: string | Date) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}

const formatNumber = (value?: number) => Number(value || 0).toFixed(2)

export const printThermalTicket = (transaction: TransactionType) => {
  const printWindow = window.open('', '_blank', 'width=420,height=700')
  if (!printWindow) return

  const dateValue =
    transaction.date ||
    transaction.dateCreation ||
    transaction.createdAt ||
    new Date().toISOString()

  const typeStock = transaction.typeStock || transaction.type || '-'
  const quantite = Number(transaction.quantite || 0)
  const motif = transaction.motif || '-'
  const commentaire = transaction.commentaire || transaction.details || '-'
  const prixFinal = Number(transaction.prixFinal || transaction.prix || 0)
  const nomPrenom = transaction.nomPrenom || transaction.clientNom || '-'
  const operation = transaction.operation || 'retrait'

  const html = `
    <html>
      <head>
        <title>Impression ticket</title>
        <style>
          body { font-family: monospace; width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; color: #000; }
          .center { text-align: center; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { margin-bottom: 4px; word-break: break-word; }
          .title { font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center title">SORTIE STOCK</div>
        <div class="center">Propriétaire</div>
        <div class="line"></div>
        <div class="row">Date : ${new Date(dateValue).toLocaleString('fr-FR')}</div>
        <div class="row">Opération : ${operation}</div>
        <div class="row">Type : ${typeStock}</div>
        <div class="row">Quantité : ${formatNumber(quantite)} kg</div>
        <div class="row">Motif : ${motif}</div>
        <div class="row">Commentaire : ${commentaire}</div>
        <div class="row">Prix final : ${formatNumber(prixFinal)} DT</div>
        <div class="row">Nom fiche : ${nomPrenom}</div>
        <div class="line"></div>
        <div class="center">Merci</div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

type Props = {
  show: boolean
  onHide: () => void
  transaction: TransactionType | null
}

const ViewTransactionModal = ({ show, onHide, transaction }: Props) => {
  if (!transaction) return null

  const typeStock = transaction.typeStock || transaction.type || ''

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <TbEye className="me-2" />
          Détails du retrait
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <div className="text-muted small">Date</div>
                <div className="fw-semibold">
                  {formatDateTime(transaction.date || transaction.dateCreation || transaction.createdAt)}
                </div>
              </Col>

              <Col md={6}>
                <div className="text-muted small">Type</div>
                <div>
                  <Badge bg={typeStock === 'olive' ? 'success' : 'warning'}>
                    {typeStock === 'olive' ? 'Olive' : 'Huile'}
                  </Badge>
                </div>
              </Col>

              <Col md={6}>
                <div className="text-muted small">Opération</div>
                <div className="fw-semibold">{transaction.operation || 'retrait'}</div>
              </Col>

              <Col md={6}>
                <div className="text-muted small">Quantité</div>
                <div className="fw-semibold">{formatNumber(transaction.quantite)} kg</div>
              </Col>

              <Col md={6}>
                <div className="text-muted small">Motif</div>
                <div className="fw-semibold">{transaction.motif || '-'}</div>
              </Col>

              <Col md={6}>
                <div className="text-muted small">Prix final</div>
                <div className="fw-semibold">{formatNumber(transaction.prixFinal || transaction.prix)} DT</div>
              </Col>

              <Col md={12}>
                <div className="text-muted small">Commentaire</div>
                <div className="fw-semibold">{transaction.commentaire || transaction.details || '-'}</div>
              </Col>

              <Col md={12}>
                <div className="text-muted small">Nom de la fiche créée</div>
                <div className="fw-semibold">{transaction.nomPrenom || transaction.clientNom || '-'}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-primary" onClick={() => printThermalTicket(transaction)}>
          <TbPrinter className="me-1" />
          Imprimer
        </Button>

        <Button variant="secondary" onClick={onHide}>
          <TbX className="me-1" />
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ViewTransactionModal