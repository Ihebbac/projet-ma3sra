'use client'

import React, { useEffect, useState } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type FitouraEditModalProps = {
  show: boolean
  onHide: () => void
  operation: any
  onSubmit: (id: string, data: { poidsSortie?: number | null }) => Promise<void> | void
}

const FitouraEditModal = ({ show, onHide, operation, onSubmit }: FitouraEditModalProps) => {
  const [poidsSortie, setPoidsSortie] = useState('')

  useEffect(() => {
    if (operation) {
      setPoidsSortie(
        operation.poidsSortie !== null && operation.poidsSortie !== undefined
          ? String(operation.poidsSortie)
          : '',
      )
    }
  }, [operation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!operation?._id) return

    await onSubmit(operation._id, {
      poidsSortie: poidsSortie === '' ? null : Number(poidsSortie),
    })

    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Enregistrer la sortie</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col md={12}>
              <FormGroup>
                <FormLabel>Poids de sortie (kg)</FormLabel>
                <FormControl
                  name="poidsSortie"
                  type="number"
                  step="0.001"
                  value={poidsSortie}
                  onChange={(e) => setPoidsSortie(e.target.value)}
                  placeholder="Saisir le poids de sortie"
                />
              </FormGroup>
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

export default FitouraEditModal