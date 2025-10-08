'use client'
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Modal, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { useState, useEffect } from 'react'

interface EditModalProps {
  show: boolean;
  toggleModal: () => void;
  data: CustomerType;
  onSave: (data: CustomerType) => void;
}

const EditModal = ({ show, toggleModal, data, onSave }: EditModalProps) => {
  const [formData, setFormData] = useState<CustomerType>(data)

  useEffect(() => {
    setFormData(data)
  }, [data])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (field: keyof CustomerType, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Modifier le Propriétaire</ModalTitle>
      </ModalHeader>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="g-3">
            <Col md={12}>
              <FormGroup controlId="editNomPrenom">
                <FormLabel>Propriétaire</FormLabel>
                <FormControl 
                  type="text" 
                  value={formData.nomPrenom}
                  onChange={(e) => handleChange('nomPrenom', e.target.value)}
                  required 
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="editNombreCaisses">
                <FormLabel>Nombre de caisses</FormLabel>
                <FormControl 
                  type="number" 
                  value={formData.nombreCaisses || 0}
                  onChange={(e) => handleChange('nombreCaisses', parseInt(e.target.value))}
                  min="0"
                  required 
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="editDateCreation">
                <FormLabel>Date création</FormLabel>
                <Flatpickr 
                  className="form-control" 
                  value={formData.dateCreation}
                  onChange={([date]) => handleChange('dateCreation', date.toISOString())}
                  options={{ 
                    dateFormat: "d-m-Y",
                  }}
                  required 
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="editQuantiteOlive">
                <FormLabel>Quantité Olive (kg)</FormLabel>
                <Form.Control 
                  type="number" 
                  value={formData.quantiteOlive || 0}
                  onChange={(e) => handleChange('quantiteOlive', parseFloat(e.target.value))}
                  min="0"
                  step="0.1"
                  required 
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="editQuantiteHuile">
                <FormLabel>Quantité Huile (L)</FormLabel>
                <Form.Control 
                  type="number" 
                  value={formData.quantiteHuile || 0}
                  onChange={(e) => handleChange('quantiteHuile', parseFloat(e.target.value))}
                  min="0"
                  step="0.1"
                  required 
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="editKattou3">
                <FormLabel>Kattou3 (%)</FormLabel>
                <Form.Control 
                  type="number" 
                  value={formData.kattou3 || 0}
                  onChange={(e) => handleChange('kattou3', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  required 
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="editNisba">
                <FormLabel>Nisba (%)</FormLabel>
                <Form.Control 
                  type="number" 
                  value={formData.nisba || 0}
                  onChange={(e) => handleChange('nisba', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  required 
                />
              </FormGroup>
            </Col>

            
          </Row>
        </Modal.Body>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal}>
            Annuler
          </Button>
          <Button variant="primary" type="submit">
            Enregistrer les modifications
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditModal