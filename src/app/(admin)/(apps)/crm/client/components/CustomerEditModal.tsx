// CustomerEditModal.tsx
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
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Customer = {
  id?: string
  _id?: string
  nomPrenom?: string
  numCIN?: number | string
  numCin?: number | string
  numTelephone?: number | string
  dateCreation?: string
  type?: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
}

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  customer: Customer | null
  onUpdated?: (updated: any) => void
}

const toNumberOrUndefined = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

const CustomerEditModal = ({ show, onHide, customer, onUpdated, onClientSaved }: CustomerModalProps) => {
  const [loading, setLoading] = useState(false)
  const [openOlive, setOpenOlive] = useState(true)
  const [openHuile, setOpenHuile] = useState(true)

  if (!customer) return null

  const clientId = customer._id ?? customer.id
  const defaultDate = customer.dateCreation

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!clientId) {
      alert('ID client manquant')
      return
    }

    const raw = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, any>

    const body: Record<string, any> = {
      nomPrenom: raw.nomPrenom,
      numCIN: toNumberOrUndefined(raw.numCIN ?? raw.numCin),
      numTelephone: toNumberOrUndefined(raw.numTelephone),
      type: raw.type,
      dateCreation: raw.dateCreation ? new Date(String(raw.dateCreation)).toISOString() : undefined,
      nombreCaisses: toNumberOrUndefined(raw.nombreCaisses),
      quantiteOlive: toNumberOrUndefined(raw.quantiteOlive),
      quantiteHuile: toNumberOrUndefined(raw.quantiteHuile),
      kattou3: toNumberOrUndefined(raw.kattou3),
      nisba: toNumberOrUndefined(raw.nisba),
    }

    // Remove undefined keys (optional)
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k])

    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8170/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(text || 'Erreur lors de la modification')
      }

      const updated = await res.json().catch(() => null)
      alert('Client modifié avec succès')
      if (onUpdated) onUpdated(updated)
      onHide()
      if (typeof onClientSaved === 'function') onClientSaved()
    } catch (err) {
      console.error(err)
      alert('Impossible de modifier le client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Modifier un client</ModalTitle>
      </ModalHeader>

      <Form id="editCustomerForm" onSubmit={handleSubmit}>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Nom et prénom</FormLabel>
                <FormControl name="nomPrenom" defaultValue={customer.nomPrenom ?? ''} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Num CIN</FormLabel>
                <FormControl
                  type="number"
                  name="numCIN"
                  defaultValue={String(customer.numCIN ?? customer.numCin ?? '')}
                  required
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Num Tél</FormLabel>
                <FormControl name="numTelephone" defaultValue={String(customer.numTelephone ?? '')} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Type</FormLabel>
                <FormSelect name="type" defaultValue={customer.type ?? ''} required>
                  <option value="">Type</option>
                  <option value="فلاح">فلاح</option>
                  <option value="كيال">كيال</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Date de création</FormLabel>
                <Flatpickr
                  className="form-control"
                  name="dateCreation"
                  defaultValue={defaultDate}
                  options={{ dateFormat: 'Y-m-d' }}
                />
              </FormGroup>
            </Col>

            {/* Olive toggle */}
            <Col xs={12} className="mt-2">
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setOpenOlive((s) => !s)}
              >
                <h6 className="mb-0">Quantité d'olive</h6>
                {openOlive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </Col>

            {openOlive && (
              <>
                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Nombre des caisses utilisées</FormLabel>
                    <FormControl name="nombreCaisses" type="number" defaultValue={customer.nombreCaisses ?? ''} />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Quantité d'olive (KG)</FormLabel>
                    <FormControl name="quantiteOlive" type="number" defaultValue={customer.quantiteOlive ?? ''} />
                  </FormGroup>
                </Col>
              </>
            )}

            {/* Huile toggle */}
            <Col xs={12} className="mt-2">
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setOpenHuile((s) => !s)}
              >
                <h6 className="mb-0">Quantité d'huile</h6>
                {openHuile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </Col>

            {openHuile && (
              <>
                <Col md={4}>
                  <FormGroup>
                    <FormLabel>Quantité d'huile (L)</FormLabel>
                    <FormControl name="quantiteHuile" type="number" defaultValue={customer.quantiteHuile ?? ''} />
                  </FormGroup>
                </Col>

                <Col md={4}>
                  <FormGroup>
                    <FormLabel>القطوع (%)</FormLabel>
                    <FormControl name="kattou3" type="number" defaultValue={customer.kattou3 ?? ''} />
                  </FormGroup>
                </Col>

                <Col md={4}>
                  <FormGroup>
                    <FormLabel>النسبة (%)</FormLabel>
                    <FormControl name="nisba" type="number" defaultValue={customer.nisba ?? ''} />
                  </FormGroup>
                </Col>
              </>
            )}
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Modification...' : 'Modifier'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CustomerEditModal
