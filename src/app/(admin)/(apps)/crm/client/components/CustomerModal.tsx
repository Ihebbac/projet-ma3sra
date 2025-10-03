import ComponentCard from '@/components/cards/ComponentCard'
import React, { useState } from 'react'
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  Container,
  Collapse,
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

type CustomerModalProps = {
  show: boolean
  onHide: () => void
}

const CustomerModal = ({ show, onHide }: CustomerModalProps) => {
  const [openOlive, setOpenOlive] = useState(false)
  const [openHuile, setOpenHuile] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    console.log("data envoyé à l'API:", data)

    try {
      const res = await fetch('http://localhost:8170/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          numCIN: Number(data.numCIN),
          numTelephone: Number(data.numTelephone),
          nombreCaisses: Number(data.nombreCaisses || 0),
          quantiteOlive: Number(data.quantiteOlive || 0),
          quantiteHuile: Number(data.quantiteHuile || 0),
          kattou3: Number(data.kattou3 || 0),
          nisba: Number(data.nisba || 0),
          dateCreation: data.dateCreation
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l’ajout')
      alert('Client ajouté avec succès')
      onHide()
    } catch (err) {
      console.error(err)
      alert('Impossible d’ajouter le client')
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
            <ComponentCard title="Nouveau Client">
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
                    <Flatpickr className="form-control" name="dateCreation" options={{ dateFormat: 'Y-m-d' }} />
                  </Form.Group>
                </Col>
              </Row>

              {/* Quantité Olive */}
              <h5
                className="d-flex justify-content-between align-items-center"
                onClick={() => setOpenOlive(!openOlive)}
                style={{ cursor: 'pointer' }}
              >
                Quantité d'olive
                <span>{openOlive ? '▲' : '▼'}</span>
              </h5>
              <Collapse in={openOlive}>
                <div className="mb-3">
                  <Row className="g-3">
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
                </div>
              </Collapse>

              {/* Quantité Huile */}
              <h5
                className="d-flex justify-content-between align-items-center"
                onClick={() => setOpenHuile(!openHuile)}
                style={{ cursor: 'pointer' }}
              >
                Quantité d'huile
                <span>{openHuile ? '▲' : '▼'}</span>
              </h5>
              <Collapse in={openHuile}>
                <div className="mb-3">
                  <Row className="g-3">
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
                </div>
              </Collapse>
            </ComponentCard>
          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Annuler</Button>
          <Button type="submit" variant="success">Ajouter</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default CustomerModal
