'use client'

import React, { useEffect, useState } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type EditEmployeModalProps = {
  show: boolean
  onHide: () => void
  employe: any
  onSubmit: (data: any) => void
}

const EditEmployeModal = ({ show, onHide, employe, onSubmit }: EditEmployeModalProps) => {
  const [form, setForm] = useState<any>(employe)

  useEffect(() => {
    setForm(employe)
  }, [employe])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev: any) => ({
      ...prev,
      [name]:
        name === 'montantJournalier' || name === 'montantHeure'
          ? parseFloat(value || '0')
          : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
    onHide()
  }

  if (!form) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier un employé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Nom</FormLabel>
                <FormControl name="nom" value={form.nom || ''} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Prénom</FormLabel>
                <FormControl name="prenom" value={form.prenom || ''} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <FormControl name="numTel" value={form.numTel || ''} onChange={handleChange} />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Poste</FormLabel>
                <FormControl name="poste" value={form.poste || ''} onChange={handleChange} />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Journalier (DT)</FormLabel>
                <FormControl
                  name="montantJournalier"
                  type="number"
                  step={0.001}
                  value={Number.isFinite(form.montantJournalier) ? form.montantJournalier : 0}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Heure (DT)</FormLabel>
                <FormControl
                  name="montantHeure"
                  type="number"
                  step={0.001}
                  value={Number.isFinite(form.montantHeure) ? form.montantHeure : 0}
                  onChange={handleChange}
                />
              </FormGroup>
            </Col>

            <Col xs={12}>
              <FormGroup className="mt-2">
                <Form.Check
                  type="switch"
                  id="estActif"
                  name="estActif"
                  label={form.estActif ? 'Employé actif' : 'Employé inactif'}
                  checked={!!form.estActif}
                  onChange={(e: any) => setForm((prev: any) => ({ ...prev, estActif: e.target.checked }))}
                />
              </FormGroup>
              <small className="text-muted">
                Le pointage (jours travaillés / HS / paiement) se fait maintenant dans la <b>Feuille du jour</b>.
              </small>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default EditEmployeModal
