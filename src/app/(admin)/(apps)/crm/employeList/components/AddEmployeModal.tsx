'use client'
import React, { useState } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type AddEmployeModalProps = {
  show: boolean
  onHide: () => void
  onSubmit: (data: any) => void
}

const AddEmployeModal = ({ show, onHide, onSubmit }: AddEmployeModalProps) => {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    numTel: '',
    poste: '',
    montantHeure: null,
    montantJournalier: null,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'salaireJournalier' ? parseFloat(value) : value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter un employé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Nom</FormLabel>
                <FormControl name="nom" value={form.nom} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Prénom</FormLabel>
                <FormControl name="prenom" value={form.prenom} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <FormControl name="numTel" value={form.numTel} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Poste</FormLabel>
                <FormControl name="poste" value={form.poste} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Journalier (DT)</FormLabel>
                <FormControl
                  name="montantJournalier"
                  type="number"
                  value={form?.montantJournalier || 0}
                  onChange={(e: any) => handleChange(e)}
                  required
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Heure (DT)</FormLabel>
                <FormControl name="montantHeure" type="number" value={form?.montantHeure || 0} onChange={(e: any) => handleChange(e)} />
              </FormGroup>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Ajouter
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default AddEmployeModal
