// CustomerModal.tsx
import React, { useState } from 'react'
import { Modal, Button, Row, Col, Form, Container } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { ChevronDown, ChevronUp } from 'lucide-react'

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  onAdded?: (created: any) => void
}

const toNumber = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

const CustomerModal = ({ show, onHide, onAdded,onClientSaved }: CustomerModalProps) => {
  const [openOlive, setOpenOlive] = useState(true)
  const [openHuile, setOpenHuile] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const raw = Object.fromEntries(formData.entries()) as Record<string, any>

    // prepare body with typed values
    const body = {
      nomPrenom: raw.nomPrenom ?? '',
      numCIN: toNumber(raw.numCIN),
      numTelephone: toNumber(raw.numTelephone),
      type: raw.type ?? '',
      dateCreation: raw.dateCreation ? new Date(String(raw.dateCreation)).toISOString() : undefined,
      nombreCaisses: toNumber(raw.nombreCaisses),
      quantiteOlive: toNumber(raw.quantiteOlive),
      quantiteHuile: toNumber(raw.quantiteHuile),
      kattou3: toNumber(raw.kattou3),
      nisba: toNumber(raw.nisba),
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8170/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(text || 'Erreur lors de l’ajout')
      }

      const created = await res.json().catch(() => null)
      alert('Client ajouté avec succès')
      if (onAdded) onAdded(created)
      form.reset()
      onHide()
      if (typeof onClientSaved === 'function') onClientSaved()
    } catch (err) {
      console.error(err)
      alert('Impossible d’ajouter le client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Ajouter un nouveau client</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Container fluid>
            {/* Informations Client */}
            <h5>Informations Client</h5>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom et prénom</Form.Label>
                  <Form.Control type="text" name="nomPrenom" placeholder="Nom et prénom" required />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Num CIN</Form.Label>
                  <Form.Control type="number" name="numCIN" placeholder="Carte d'identité" required />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Num Tél</Form.Label>
                  <Form.Control type="number" name="numTelephone" placeholder="Ex: 96 458 362" required />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="type" required defaultValue="">
                    <option value="">Type</option>
                    <option value="فلاح">فلاح</option>
                    <option value="كيال">كيال</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date création</Form.Label>
                  <Flatpickr
                    className="form-control"
                    name="dateCreation"
                    options={{ dateFormat: 'Y-m-d' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Quantité Olive (collapsible) */}
            <div
              className="d-flex justify-content-between align-items-center mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenOlive((s) => !s)}
            >
              <h6 className="mb-0">Quantité d'olive</h6>
              {openOlive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {openOlive && (
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Nombre des caisses utilisées</Form.Label>
                    <Form.Control type="number" name="nombreCaisses" placeholder="Ex: 25" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Quantité d'olive (KG)</Form.Label>
                    <Form.Control type="number" name="quantiteOlive" placeholder="Ex: 320" />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* Quantité Huile (collapsible) */}
            <div
              className="d-flex justify-content-between align-items-center mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenHuile((s) => !s)}
            >
              <h6 className="mb-0">Quantité d'huile</h6>
              {openHuile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {openHuile && (
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité d'huile (L)</Form.Label>
                    <Form.Control type="number" name="quantiteHuile" placeholder="Ex: 50" />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>القطوع (%)</Form.Label>
                    <Form.Control type="number" name="kattou3" placeholder="Ex: 5" />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>النسبة (%)</Form.Label>
                    <Form.Control type="number" name="nisba" placeholder="Ex: 20" />
                  </Form.Group>
                </Col>
              </Row>
            )}
          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? 'Envoi...' : 'Ajouter'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default CustomerModal
