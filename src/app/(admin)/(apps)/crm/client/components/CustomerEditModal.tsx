'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  Container,
  Card,
  Spinner,
  ModalHeader,
  ModalTitle,
  ModalBody,
  FormGroup,
  FormLabel,
  FormControl,
  FormSelect,
  ModalFooter,
  FormText,
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { ChevronDown, ChevronUp } from 'lucide-react'

// === CONSTANTES (Importées du modal Add) ===
const POIDS_CAISSE = 30
const WIBA_PAR_QFIZ = 16
const DENSITE_HUILE = 0.916
const POIDS_WIBA_DEFAUT = 27
// ===================

// Type pour les données du client (étendu pour inclure les données potentiellement stockées)
type Customer = {
  id?: string
  _id?: string
  nomPrenom?: string
  numTelephone?: number | string
  dateCreation?: string
  type?: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  poidsWiba?: number
  prixKg?: number
}

// Type pour les props du modal
type CustomerModalProps = {
  show: boolean
  onHide: () => void
  customer: Customer | null
  onUpdated?: (updated: any) => void
  onClientSaved?: () => void
}

// Type pour les valeurs du formulaire étendu avec les champs calculés
type FormValues = {
  nomPrenom: string
  numTelephone: string | number
  type: string
  dateCreation: string
  nombreCaisses: number
  quantiteOlive: number
  quantiteHuile: number
  quantiteOliveNet: number
  kattou3: number
  nisba: number
  nisbaReelle: number
  quantiteHuileTheorique: number
  differenceHuile: number
  nombreWiba: number
  nombreQfza: number
  huileParQfza: number
  prixFinal: number
}

// Fonction utilitaire pour convertir en nombre ou undefined
const toNumber = (v: any): number | undefined => {
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

const format = (v: number) => (v > 0 ? v.toFixed(2) : '')

// === FORMULES (Importées du modal Add) ===
const calculateNetQuantity = (olive: number, caisses: number) =>
  Math.max(0, olive - caisses * POIDS_CAISSE)

const calculateWibaAndQfza = (oliveNet: number, wiba: number) => {
  const nWiba = oliveNet > 0 && wiba > 0 ? oliveNet / wiba : 0
  const nQfza = nWiba / WIBA_PAR_QFIZ
  return { nWiba, nQfza }
}

const calculateNisba = (huile: number, oliveNet: number) =>
  oliveNet > 0 && huile > 0 ? (huile / oliveNet) * 100 : 0

const calculateHuileTheorique = (oliveNet: number, nisba: number) =>
  (oliveNet * nisba) / 100

const calculateKattou3 = (huile: number, oliveNet: number, wiba: number) => {
  if (oliveNet <= 0 || huile <= 0 || wiba <= 0) return 0
  const huileLitres = huile / DENSITE_HUILE
  const { nWiba, nQfza } = calculateWibaAndQfza(oliveNet, wiba)
  if (nQfza <= 0) return 0
  return (huileLitres / nQfza) / 10
}

const calculateHuileParQfza = (huile: number, oliveNet: number, wiba: number) => {
  const { nQfza } = calculateWibaAndQfza(oliveNet, wiba)
  return nQfza > 0 ? huile / nQfza : 0
}

const calculatePrixFinal = (oliveNet: number, prixKg: number) => 
  oliveNet > 0 && prixKg > 0 ? oliveNet * prixKg : 0

// ======================================

const CustomerEditModal: React.FC<CustomerModalProps> = ({ show, onHide, customer, onUpdated, onClientSaved }) => {
  // --- Tous les Hooks doivent être appelés en haut et inconditionnellement ---
  const [openOlive, setOpenOlive] = useState(true) 
  const [openHuile, setOpenHuile] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const [poidsWiba, setPoidsWiba] = useState<number>(
    customer?.poidsWiba && toNumber(customer.poidsWiba) !== undefined ? toNumber(customer.poidsWiba)! : POIDS_WIBA_DEFAUT
  ) 
  const [prixKg, setPrixKilo] = useState<number>(
    customer?.prixKg && toNumber(customer.prixKg) !== undefined ? toNumber(customer.prixKg)! : 0
  ) 

  // Fonction pour initialiser l'état du formulaire avec les données du client
  const initializeFormValues = (c: Customer, initialPoidsWiba: number, initialPrixKilo: number): FormValues => {
    const qOlive = toNumber(c.quantiteOlive) ?? 0
    const nCaisses = toNumber(c.nombreCaisses) ?? 0
    const qHuile = toNumber(c.quantiteHuile) ?? 0

    const oliveNet = calculateNetQuantity(qOlive, nCaisses)
    const { nWiba, nQfza } = calculateWibaAndQfza(oliveNet, initialPoidsWiba)
    const nisba = calculateNisba(qHuile, oliveNet)
    const kattou3 = calculateKattou3(qHuile, oliveNet, initialPoidsWiba)
    const huileTheorique = calculateHuileTheorique(oliveNet, nisba)
    const diff = qHuile - huileTheorique
    const huileParQfza = calculateHuileParQfza(qHuile, oliveNet, initialPoidsWiba)
    const prixFinal = calculatePrixFinal(oliveNet, initialPrixKilo)

    return {
      nomPrenom: c.nomPrenom ?? '',
      numTelephone: c.numTelephone ?? '',
      type: c.type ?? '',
      dateCreation: c.dateCreation ? c.dateCreation.split('T')[0] : new Date().toISOString().split('T')[0],
      nombreCaisses: nCaisses,
      quantiteOlive: qOlive,
      quantiteHuile: qHuile,
      
      quantiteOliveNet: oliveNet,
      kattou3: kattou3,
      nisba: nisba,
      nisbaReelle: nisba,
      quantiteHuileTheorique: huileTheorique,
      differenceHuile: diff,
      nombreWiba: nWiba,
      nombreQfza: nQfza,
      huileParQfza: huileParQfza,
      prixFinal: prixFinal,
    }
  }

  const [formValues, setFormValues] = useState<FormValues>(
    customer ? initializeFormValues(customer, poidsWiba, prixKg) : {} as FormValues
  )

  // Hook 7 : Mise à jour de l'état lorsque le client change
  useEffect(() => {
    if (customer) {
      const newPoidsWiba = customer.poidsWiba && toNumber(customer.poidsWiba) !== undefined ? toNumber(customer.poidsWiba)! : POIDS_WIBA_DEFAUT
      const newPrixKilo = customer.prixKg && toNumber(customer.prixKg) !== undefined ? toNumber(customer.prixKg)! : 0
      setPoidsWiba(newPoidsWiba)
      setPrixKilo(newPrixKilo)
      
      setFormValues(initializeFormValues(customer, newPoidsWiba, newPrixKilo))
    }
  }, [customer]) // eslint-disable-line react-hooks/exhaustive-deps


  // Hook 8 : RE-CALCUL AUTOMATIQUE (Déplacé ici pour être inconditionnel)
  useEffect(() => {
    const { quantiteOlive, nombreCaisses, quantiteHuile } = formValues

    const oliveNet = calculateNetQuantity(quantiteOlive, nombreCaisses)
    const { nWiba, nQfza } = calculateWibaAndQfza(oliveNet, poidsWiba)
    const nisba = calculateNisba(quantiteHuile, oliveNet)
    const kattou3 = calculateKattou3(quantiteHuile, oliveNet, poidsWiba)
    const huileTheorique = calculateHuileTheorique(oliveNet, nisba)
    const diff = quantiteHuile - huileTheorique
    const huileParQfza = calculateHuileParQfza(quantiteHuile, oliveNet, poidsWiba)
    const prixFinal = calculatePrixFinal(oliveNet, prixKg) 

    setFormValues((prev) => ({
      ...prev,
      quantiteOliveNet: oliveNet,
      nisba,
      kattou3,
      nombreWiba: nWiba,
      nombreQfza: nQfza,
      quantiteHuileTheorique: huileTheorique,
      differenceHuile: diff,
      huileParQfza,
      nisbaReelle: nisba,
      prixFinal,
    }))
  }, [
    formValues.quantiteOlive,
    formValues.nombreCaisses,
    formValues.quantiteHuile,
    poidsWiba,
    prixKg,
  ])
  // --- Fin des Hooks ---


  // L'instruction conditionnelle doit être après tous les appels de Hooks
  if (!customer) return null

  const clientId = customer._id ?? customer.id

  // === GESTION DES CHANGEMENTS INPUTS (Identique au modal Add) ===
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const isText = ['nomPrenom', 'type', 'dateCreation'].includes(name)
    setFormValues((prev) => ({
      ...prev,
      [name]: isText ? value : parseFloat(value) || 0,
    } as FormValues)) 
  }

  const handleDateChange = (dates: Date[]) => {
    if (dates[0]) {
      setFormValues((p) => ({
        ...p,
        dateCreation: dates[0].toISOString().split('T')[0],
      }))
    }
  }

  // === SOUMISSION DU FORMULAIRE (Adapté pour PATCH) ===
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!clientId) {
      alert('ID client manquant')
      return
    }

    setLoading(true)

    try {
      const body = {
        nomPrenom: formValues.nomPrenom,
        numTelephone: toNumber(formValues.numTelephone),
        type: formValues.type,
        dateCreation: formValues.dateCreation
          ? new Date(formValues.dateCreation).toISOString()
          : undefined,
        nombreCaisses: formValues.nombreCaisses,
        quantiteOlive: formValues.quantiteOlive,
        quantiteHuile: formValues.quantiteHuile,
        
        quantiteOliveNet: formValues.quantiteOliveNet,
        nisba: formValues.nisba,
        kattou3: formValues.kattou3,
        prixKg: prixKg,
        poidsWiba: poidsWiba
      }

      const res = await fetch(`http://localhost:8170/clients/${clientId}`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      alert('✅ Client modifié avec succès')
      onUpdated?.(updated)
      onClientSaved?.()
      onHide()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur : impossible de modifier le client')
    } finally {
      setLoading(false)
    }
  }


  // === INTERFACE UTILISATEUR (Adaptée du modal Add) ===
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>✏️ Modifier le client</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Container fluid>
            
            {/* --- Infos Client --- */}
            <h5>Informations du client</h5>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom & Prénom</Form.Label>
                  <Form.Control
                    name="nomPrenom"
                    value={formValues.nomPrenom}
                    onChange={handleChange}
                    placeholder="Ex: Ahmed Trabelsi"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Téléphone</Form.Label>
                  <Form.Control
                    name="numTelephone"
                    type="number" 
                    value={formValues.numTelephone || ''}
                    onChange={handleChange}
                    placeholder="Ex: 96 458 362"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="type" value={formValues.type} onChange={handleChange}>
                    <option value="">Sélectionner...</option>
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
                    value={formValues.dateCreation}
                    onChange={handleDateChange}
                    options={{
                      dateFormat: 'Y-m-d',
                      defaultDate: formValues.dateCreation, 
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* --- Section Olive --- */}
            <div
              className="d-flex justify-content-between align-items-center mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenOlive(!openOlive)}
            >
              <h4>🍃 Quantité d’olive</h4>
              {openOlive ? <ChevronUp /> : <ChevronDown />}
            </div>

            {openOlive && (
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Nombre de caisses</Form.Label>
                    <Form.Control
                      type="number"
                      name="nombreCaisses"
                      value={formValues.nombreCaisses || ''}
                      onChange={handleChange}
                    />
                    <Form.Text className="text-muted">
                      olive net = olive - (caisses × {POIDS_CAISSE})
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité Olive (kg)</Form.Label>
                    <Form.Control
                      type="number"
                      name="quantiteOlive"
                      value={formValues.quantiteOlive || ''}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité Olive(Net kg )الزيتون </Form.Label>
                    <Form.Control
                      type="text" 
                      name="quantiteOliveNet"
                      value={format(formValues.quantiteOliveNet)}
                      readOnly
                      disabled 
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* --- Section Huile --- */}
            <div
              className="d-flex justify-content-between align-items-center mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenHuile(!openHuile)}
            >
              <h4>🧴 Quantité d’huile & Rendement</h4>
              {openHuile ? <ChevronUp /> : <ChevronDown />}
            </div>

            {openHuile && (
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité Huile (NET kg) الزيت </Form.Label>
                    <Form.Control
                      type="number"
                      name="quantiteHuile"
                      value={formValues.quantiteHuile || ''}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Nisba % (النسبة) </Form.Label>
                    <Form.Control
                      type="text" 
                      name="nisba"
                      value={format(formValues.nisba)}
                      readOnly
                      disabled
                    />
                    <Form.Text className="text-muted">
                      = (huile / olive net) × 100
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Ktou3(القطوع)</Form.Label>
                    <Form.Control
                      type="text" 
                      name="kattou3"
                      value={format(formValues.kattou3)}
                      readOnly
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}
            
            {/* --- Prix et Wiba --- */}
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>💵 Prix du kilo (DT/kg)</Form.Label>
                  <Form.Control
                    type="number"
                    value={prixKg}
                    onChange={(e) => setPrixKilo(parseFloat(e.target.value) || 0)}
                  />
                  <Form.Text className="text-muted">
                    Modifiable à tout moment. Le prix total est recalculé automatiquement.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>🪣 Quantité Wiba (KG)</Form.Label>
                  <Form.Control
                    type="number"
                    value={poidsWiba}
                    onChange={(e) => setPoidsWiba(parseFloat(e.target.value) || 0)}
                  />
                  <Form.Text className="text-muted">
                    Modifiable à tout moment. La quantité total est recalculée automatiquement.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* --- Résumé des valeurs (Identique au modal Add) --- */}
            <Card className="p-3 mb-4 shadow-sm border-primary">
              <Row className="text-center">
                <Col>
                  <h6>Nom et prénom</h6>
                  <p className="fw-bold text-success">{(formValues.nomPrenom)}</p>
                </Col>
                <Col>
                  <h6>Olive Net</h6>
                  <p className="fw-bold text-success">{format(formValues.quantiteOliveNet)} kg</p>
                </Col>
                <Col>
                  <h6>Huile</h6>
                  <p className="fw-bold text-success">{format(formValues.quantiteHuile)} kg</p>
                </Col>
                <Col>
                  <h6>Nisba</h6>
                  <p className="fw-bold text-primary">{format(formValues.nisba)}%</p>
                </Col>
                <Col>
                  <h6>Kattou3</h6>
                  <p className="fw-bold text-info">{format(formValues.kattou3)}</p>
                </Col>
                <Col>
                  <h6>Prix Total</h6>
                  <p className="fw-bold text-danger">{format(formValues.prixFinal)} DT</p>
                </Col>
              </Row>
            </Card>

          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Modifier'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default CustomerEditModal