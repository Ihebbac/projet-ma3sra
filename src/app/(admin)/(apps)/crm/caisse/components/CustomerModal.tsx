import React, { useState } from 'react'
import { Modal, Button, Row, Col, Form, Container, ModalHeader, ModalTitle, ModalBody, ModalFooter, Spinner } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

type CaisseAddModalProps = {
  show: boolean
  onHide: () => void
  onAdded?: (created: any) => void
}

const toNumber = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

const CaisseAddModal = ({ show, onHide, onAdded }: CaisseAddModalProps) => {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('credit')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const raw = Object.fromEntries(formData.entries()) as Record<string, any>

    let finalDate: string | undefined = undefined

    if (raw.date) {
        const selectedDateString = String(raw.date)
        const now = new Date()
        const [year, month, day] = selectedDateString.split('-').map(p => parseInt(p, 10))
        now.setFullYear(year, month - 1, day)
        finalDate = now.toISOString()
    }

    const body = {
      motif: raw.motif ?? '',
      montant: toNumber(raw.montant),
      type: raw.type ?? '',
      date: finalDate,
      commentaire: raw.commentaire ?? '',
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8170/caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(text || 'Erreur lors de l\'ajout')
      }

      const created = await res.json().catch(() => null)
      onAdded?.(created)
      form.reset()
      onHide()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <ModalHeader closeButton className="bg-primary-subtle border-primary">
        <ModalTitle className="d-flex align-items-center gap-2">
          Ajouter une nouvelle caisse
        </ModalTitle>
      </ModalHeader>

      <Form onSubmit={handleSubmit}>
        <ModalBody>
          <Container fluid>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Motif <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" name="motif" placeholder="Ex: Vente huile, Achat fournitures..." required />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Montant (DT) <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="number" name="montant" step="0.01" placeholder="Ex: 120.00" required />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="type"
                    required
                    defaultValue=""
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="credit">Crédit (+)</option>
                    <option value="debit">Débit (-)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <Flatpickr className="form-control" name="date" options={{ dateFormat: 'Y-m-d' }} />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Commentaire</Form.Label>
                  <Form.Control as="textarea" name="commentaire" rows={3} placeholder="Notes optionnelles..." />
                </Form.Group>
              </Col>
            </Row>
          </Container>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="success" disabled={loading} className="px-4">
            {loading ? <><Spinner size="sm" animation="border" className="me-1" /> Ajout...</> : 'Ajouter'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CaisseAddModal
