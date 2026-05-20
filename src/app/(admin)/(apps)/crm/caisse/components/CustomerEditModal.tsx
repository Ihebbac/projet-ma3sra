import React, { useState } from 'react'
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  ModalHeader,
  ModalTitle,
  ModalBody,
  FormGroup,
  FormLabel,
  FormControl,
  FormSelect,
  ModalFooter,
  Spinner,
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

type Props = {
  show: boolean
  onHide: () => void
  caisse: any | null
  onUpdated?: () => void
  isCaissier: any
}

const toNumberOrUndefined = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

const CaisseEditModal = ({ show, onHide, caisse, onUpdated, isCaissier }: Props) => {
  const [loading, setLoading] = useState(false)

  if (!caisse) return null
  const id = caisse._id ?? caisse.id

  const defaultDate = caisse.date
    ? String(caisse.date).split('T')[0]
    : undefined

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id) {
      return
    }

    const raw = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, any>

    let finalDate: string | undefined = undefined

    if (raw.date) {
        const selectedDateString = String(raw.date)
        const now = new Date()
        const [year, month, day] = selectedDateString.split('-').map(p => parseInt(p, 10))
        now.setFullYear(year, month - 1, day)
        finalDate = now.toISOString()
    }

    const body: Record<string, any> = {
      motif: raw.motif,
      montant: toNumberOrUndefined(raw.montant),
      type: raw.type,
      date: finalDate,
      commentaire: raw.commentaire ?? '',
    }

    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k])

    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8170/caisse/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(text || 'Erreur lors de la modification')
      }

      await res.json().catch(() => null)
      onHide()
      onUpdated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <ModalHeader closeButton className="bg-warning-subtle border-warning">
        <ModalTitle as="h5">Modifier une caisse</ModalTitle>
      </ModalHeader>

      <Form id="editCaisseForm" onSubmit={handleSubmit}>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Motif <span className="text-danger">*</span></FormLabel>
                <FormControl name="motif" defaultValue={caisse.motif ?? ''} required />
              </FormGroup>
            </Col>

            <Col md={3}>
              <FormGroup>
                <FormLabel>Montant (DT) <span className="text-danger">*</span></FormLabel>
                <FormControl name="montant" type="number" step="0.01" defaultValue={String(caisse.montant ?? '')} required />
              </FormGroup>
            </Col>

            <Col md={3}>
              <FormGroup>
                <FormLabel>Type <span className="text-danger">*</span></FormLabel>
                <FormSelect name="type" defaultValue={caisse.type ?? ''} required>
                  <option value="">Sélectionner...</option>
                  <option value="credit">Crédit (+)</option>
                  <option value="debit">Débit (-)</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Date</FormLabel>
                <Flatpickr
                  className="form-control"
                  name="date"
                  defaultValue={defaultDate}
                  options={{ dateFormat: 'Y-m-d' }}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Commentaire</FormLabel>
                <FormControl as="textarea" name="commentaire" rows={3} defaultValue={caisse.commentaire ?? ''} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="warning" disabled={loading} className="px-4">
            {loading ? <><Spinner size="sm" animation="border" className="me-1" /> Modification...</> : 'Modifier'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CaisseEditModal
