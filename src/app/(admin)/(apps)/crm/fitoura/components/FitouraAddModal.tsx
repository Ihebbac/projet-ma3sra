import React, { useState } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type FitouraAddModalProps = {
  show: boolean
  onHide: () => void
  onSubmit: (data: any) => void
}

const FitouraAddModal = ({ show, onHide, onSubmit }: FitouraAddModalProps) => {
  const [form, setForm] = useState({
    matriculeCamion: '',
    chauffeur: '',
    poidsEntree: null,
    prixUnitaire: null,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name.includes('poids') || name.includes('prix') ? parseFloat(value) : value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
    setForm({ matriculeCamion: '', chauffeur: '', poidsEntree: null, prixUnitaire: null })
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Fitoura Operation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Matricule Camion</FormLabel>
                <FormControl name="matriculeCamion" value={form.matriculeCamion} onChange={handleChange} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Chauffeur</FormLabel>
                <FormControl name="chauffeur" value={form.chauffeur} onChange={handleChange} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Poids Entrée (kg)</FormLabel>
                <FormControl name="poidsEntree" type="number" value={form.poidsEntree || 0} onChange={handleChange} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Prix Unitaire (DT/kg)</FormLabel>
                <FormControl name="prixUnitaire" type="number" value={form.prixUnitaire || 0} onChange={handleChange} required />
              </FormGroup>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Operation
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default FitouraAddModal
