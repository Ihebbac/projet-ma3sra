'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Row, Col, Form, Spinner } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { User, Phone, Tag, Calendar, MessageSquare, Box, Scale, Droplet, Percent, Gauge, DollarSign, Weight } from 'lucide-react'

const POIDS_CAISSE = 30
const POIDS_WIBA_DEFAUT = 27

type Customer = {
  _id?: string
  nomPrenom?: string
  numTelephone?: number | string
  dateCreation?: string
  type?: string
  commentaire?: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  poidsWiba?: number
  prixKg?: number
}

type Props = {
  show: boolean
  onHide: () => void
  customer: Customer | null
  onUpdated?: (updated: any) => void
  onClientSaved?: () => void
}

const toNumber = (v: any): number | undefined => {
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

const styles = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.customer-card {
  border: none;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: all 0.2s ease;
}
.customer-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}
.card-accent-blue { border-left: 3px solid #3b82f6; }
.card-accent-green { border-left: 3px solid #22c55e; }
.card-accent-orange { border-left: 3px solid #f59e0b; }
.summary-bar {
  background: linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%);
  border-radius: 10px;
  border-left: 3px solid #3b82f6;
}
.total-box {
  background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}
`

const CustomerEditModal: React.FC<Props> = ({ show, onHide, customer, onUpdated, onClientSaved }) => {
  const [loading, setLoading] = useState(false)
  const [lastEdited, setLastEdited] = useState<'olive' | 'oliveNet' | null>(null)

  const getTodayDate = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  const getInitialFormData = (c: Customer) => {
    const qOlive = toNumber(c.quantiteOlive) ?? 0
    const nCaisses = toNumber(c.nombreCaisses) ?? 0
    const qHuile = toNumber(c.quantiteHuile) ?? 0
    const net = Math.max(0, qOlive - (nCaisses * POIDS_CAISSE))

    return {
      nomPrenom: c.nomPrenom || '',
      numTelephone: c.numTelephone || '',
      type: c.type || '',
      commentaire: c.commentaire || '',
      dateCreation: c.dateCreation ? c.dateCreation.split('T')[0] : getTodayDate(),
      nombreCaisses: nCaisses,
      quantiteOlive: qOlive,
      quantiteOliveNet: net,
      quantiteHuile: qHuile,
      nisba: 0,
      kattou3: 0,
      prixKg: c.prixKg || 0,
      poidsWiba: c.poidsWiba || POIDS_WIBA_DEFAUT,
    }
  }

  const [formValues, setFormValues] = useState(getInitialFormData({}))

  useEffect(() => {
    if (customer) {
      setFormValues(getInitialFormData(customer))
      setLastEdited(null)
    }
  }, [customer])

  const getComputed = () => {
    const { nombreCaisses, quantiteOlive, quantiteOliveNet, quantiteHuile, prixKg, poidsWiba } = formValues
    const olive = Number(quantiteOlive || 0)
    const net = Number(quantiteOliveNet || 0)
    const huile = Number(quantiteHuile || 0)
    const wiba = Number(poidsWiba || POIDS_WIBA_DEFAUT)

    const nisba = net > 0 && huile > 0 ? (huile / net) * 100 : 0
    const nWiba = net > 0 && wiba > 0 ? net / wiba : 0
    const nQfza = nWiba / 16
    const huileLitres = huile / 0.916
    const kattou3 = nQfza > 0 ? (huileLitres / nQfza / 10) : 0
    const prixFinal = Math.round(net * (Number(prixKg) || 0))

    return { net, nisba, nWiba, nQfza, kattou3, prixFinal }
  }

  const computed = getComputed()

  if (!customer) return null

  const clientId = customer._id

  const handleChange = (e: any) => {
    const { name, value } = e.target
    const isText = ['nomPrenom', 'type', 'commentaire'].includes(name)

    if (name === 'quantiteOlive') {
      setLastEdited('olive')
      const numeric = parseFloat(value) || 0
      setFormValues((prev) => ({
        ...prev,
        quantiteOlive: numeric,
        quantiteOliveNet: Math.max(0, numeric - (Number(prev.nombreCaisses || 0) * POIDS_CAISSE)),
      }))
      return
    }

    if (name === 'quantiteOliveNet') {
      setLastEdited('oliveNet')
      const numeric = parseFloat(value) || 0
      setFormValues((prev) => ({
        ...prev,
        quantiteOliveNet: numeric,
        quantiteOlive: numeric + (Number(prev.nombreCaisses || 0) * POIDS_CAISSE),
      }))
      return
    }

    if (name === 'nombreCaisses') {
      const caisses = parseFloat(value) || 0
      setFormValues((prev) => ({
        ...prev,
        nombreCaisses: caisses,
        quantiteOliveNet: Math.max(0, Number(prev.quantiteOlive || 0) - (caisses * POIDS_CAISSE)),
      }))
      return
    }

    setFormValues((prev) => ({
      ...prev,
      [name]: isText ? value : parseFloat(value as string) || 0,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!clientId) return

    setLoading(true)

    try {
      const body = {
        nomPrenom: formValues.nomPrenom,
        numTelephone: Number(formValues.numTelephone) || 0,
        type: formValues.type,
        dateCreation: formValues.dateCreation,
        commentaire: formValues.commentaire,
        nombreCaisses: Number(formValues.nombreCaisses) || 0,
        quantiteOlive: Number(formValues.quantiteOlive) || 0,
        quantiteOliveNet: computed.net,
        quantiteHuile: Number(formValues.quantiteHuile) || 0,
        nisba: Number(formValues.nisba) || computed.nisba,
        kattou3: Number(formValues.kattou3) || computed.kattou3,
        prixKg: Number(formValues.prixKg) || 0,
        prixFinal: computed.prixFinal,
        poidsWiba: Number(formValues.poidsWiba) || POIDS_WIBA_DEFAUT,
      }

      const res = await fetch(`http://localhost:8170/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())
      await res.json()
      onUpdated?.(body)
      onClientSaved?.()
      onHide()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="border-0 pb-0">
            <div>
              <Modal.Title>Modifier le client</Modal.Title>
              <div className="small text-body-secondary mt-1">{customer.nomPrenom}</div>
            </div>
          </Modal.Header>

          <Modal.Body className="py-3">
            <Row className="g-3">
              {/* Infos Client */}
              <Col xs={12}>
                <div className="customer-card card-accent-blue p-3" style={{ animation: 'fadeInUp 0.3s ease 0.05s both' }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="d-flex" style={{ color: '#3b82f6' }}><User size={16} /></div>
                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>Informations client</span>
                  </div>
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small text-secondary">Nom & Prénom</Form.Label>
                        <Form.Control name="nomPrenom" value={formValues.nomPrenom} onChange={handleChange} size="sm" required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Phone size={12} className="me-1" />Téléphone</Form.Label>
                        <Form.Control name="numTelephone" type="number" value={formValues.numTelephone || ''} onChange={handleChange} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Tag size={12} className="me-1" />Type</Form.Label>
                        <Form.Select name="type" value={formValues.type} onChange={handleChange} size="sm">
                          <option value="فلاح">فلاح</option>
                          <option value="كيال">كيال</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Calendar size={12} className="me-1" />Date</Form.Label>
                        <Flatpickr
                          className="form-control form-control-sm"
                          value={formValues.dateCreation}
                          onChange={(dates: Date[]) => {
                            if (dates[0]) {
                              const d = dates[0]
                              setFormValues((prev) => ({ ...prev, dateCreation: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }))
                            }
                          }}
                          options={{ dateFormat: 'Y-m-d' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><MessageSquare size={12} className="me-1" />Commentaire</Form.Label>
                        <Form.Control as="textarea" rows={1} name="commentaire" value={formValues.commentaire || ''} onChange={handleChange} size="sm" />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              </Col>

              {/* Production + Prix */}
              <Col md={7}>
                <div className="customer-card card-accent-green p-3 h-100" style={{ animation: 'fadeInUp 0.3s ease 0.1s both' }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="d-flex" style={{ color: '#22c55e' }}><Scale size={16} /></div>
                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>Production</span>
                  </div>
                  <Row className="g-2">
                    <Col xs={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Box size={12} className="me-1" />Caisses</Form.Label>
                        <Form.Control type="number" name="nombreCaisses" value={formValues.nombreCaisses || ''} onChange={handleChange} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary">Olive brute</Form.Label>
                        <Form.Control type="number" name="quantiteOlive" value={formValues.quantiteOlive || ''} onChange={handleChange} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary">Olive net</Form.Label>
                        <Form.Control type="number" name="quantiteOliveNet" value={formValues.quantiteOliveNet || ''} onChange={handleChange} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Droplet size={12} className="me-1" />Huile (kg)</Form.Label>
                        <Form.Control type="number" name="quantiteHuile" value={formValues.quantiteHuile || ''} onChange={handleChange} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Percent size={12} className="me-1" />Nisba %</Form.Label>
                        <Form.Control type="number" step="0.01" name="nisba" value={formValues.nisba || ''} onChange={handleChange} placeholder={computed.nisba.toFixed(1)} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={4}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Gauge size={12} className="me-1" />Kattou3</Form.Label>
                        <Form.Control type="number" step="0.01" name="kattou3" value={formValues.kattou3 || ''} onChange={handleChange} placeholder={computed.kattou3.toFixed(1)} size="sm" />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              </Col>

              <Col md={5}>
                <div className="customer-card card-accent-orange p-3 h-100" style={{ animation: 'fadeInUp 0.3s ease 0.15s both' }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="d-flex" style={{ color: '#f59e0b' }}><DollarSign size={16} /></div>
                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>Prix</span>
                  </div>
                  <Row className="g-2">
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><DollarSign size={12} className="me-1" />Prix du kg (DT)</Form.Label>
                        <Form.Control type="number" step="0.1" value={formValues.prixKg} onChange={(e) => setFormValues((prev) => ({ ...prev, prixKg: parseFloat(e.target.value) || 0 }))} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label className="small text-secondary"><Weight size={12} className="me-1" />Poids Wiba (kg)</Form.Label>
                        <Form.Control type="number" value={formValues.poidsWiba} onChange={(e) => setFormValues((prev) => ({ ...prev, poidsWiba: parseFloat(e.target.value) || POIDS_WIBA_DEFAUT }))} size="sm" />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <div className="total-box p-2 mt-1 text-center">
                        <div className="small text-secondary">Total à payer</div>
                        <div className="fw-bold fs-5" style={{ color: '#d97706' }}>{Math.round(computed.prixFinal)} <span className="small fw-normal">TND</span></div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>

            {/* Résumé */}
            <div className="summary-bar p-3 mt-3" style={{ animation: 'fadeInUp 0.3s ease 0.2s both' }}>
              <Row className="text-center g-2">
                {[
                  { label: 'Olive net', value: `${computed.net.toFixed(1)} kg`, icon: Scale },
                  { label: 'Huile', value: `${Number(formValues.quantiteHuile || 0).toFixed(1)} kg`, icon: Droplet },
                  { label: 'Nisba', value: `${computed.nisba.toFixed(1)}%`, icon: Percent },
                  { label: 'Kattou3', value: `${computed.kattou3.toFixed(1)}`, icon: Gauge },
                  { label: 'Wiba', value: `${computed.nWiba.toFixed(1)}`, icon: Weight },
                  { label: 'Prix total', value: `${Math.round(computed.prixFinal)} TND`, icon: DollarSign },
                ].map((item, i) => (
                  <Col xs={4} md={2} key={i}>
                    <div className="d-flex align-items-center justify-content-center gap-1 text-secondary mb-1" style={{ fontSize: '0.7rem' }}>
                      <item.icon size={11} />
                      <span>{item.label}</span>
                    </div>
                    <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>{item.value}</div>
                  </Col>
                ))}
              </Row>
            </div>
          </Modal.Body>

          <Modal.Footer className="border-0 pt-0 d-flex justify-content-between">
            <Button variant="light" onClick={onHide} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={loading} className="px-4">
              {loading ? <Spinner size="sm" animation="border" className="me-1" /> : null}
              {loading ? 'Modification...' : 'Enregistrer'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default CustomerEditModal
