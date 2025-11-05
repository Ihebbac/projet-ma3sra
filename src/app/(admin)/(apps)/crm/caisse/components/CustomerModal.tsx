import React, { useState } from 'react'
import { Modal, Button, Row, Col, Form, Container, ModalHeader, ModalTitle, ModalBody, ModalFooter } from 'react-bootstrap'
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const raw = Object.fromEntries(formData.entries()) as Record<string, any>

    const body = {
      motif: raw.motif ?? '',
      montant: toNumber(raw.montant),
      type: raw.type ?? '',
      date: raw.date ? new Date(String(raw.date)).toISOString() : undefined,
      commentaire: raw.commentaire ?? '',
    }

    setLoading(true)
    try {
      const res = await fetch('http://92.112.181.241:8170/caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(text || 'Erreur lors de l’ajout')
      }

      const created = await res.json().catch(() => null)
      alert('Caisse ajoutée avec succès')
      onAdded?.(created)
      form.reset()
      onHide()
    } catch (err) {
      console.error(err)
      alert('Impossible d’ajouter la caisse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle>Ajouter une nouvelle caisse</ModalTitle>
      </ModalHeader>

      <Form onSubmit={handleSubmit}>
        <ModalBody>
          <Container fluid>
            <h5>Informations Caisse</h5>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Motif</Form.Label>
                  <Form.Control type="text" name="motif" placeholder="Motif" required />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Montant (DT)</Form.Label>
                  <Form.Control type="number" name="montant" step="0.01" placeholder="Ex: 120.00" required />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="type" required defaultValue="">
                    <option value="">Sélectionner…</option>
                    <option value="credit">Crédit</option>
                    <option value="debit">Débit</option>
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
                  <Form.Control as="textarea" name="commentaire" rows={3} placeholder="Notes optionnelles…" />
                </Form.Group>
              </Col>
            </Row>
          </Container>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? 'Envoi…' : 'Ajouter'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CaisseAddModal
