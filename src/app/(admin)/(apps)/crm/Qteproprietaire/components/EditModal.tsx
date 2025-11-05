'use client'
import { Button, Card, Col, Container, Form, Modal, Row, Spinner } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { useState, useEffect } from 'react'
import withReactContent from 'sweetalert2-react-content'
import Swal, { SweetAlertOptions } from 'sweetalert2'
import { ChevronDown, ChevronUp } from 'lucide-react'

const POIDS_CAISSE = 30
const WIBA_PAR_QFIZ = 16
const DENSITE_HUILE = 0.916
const POIDS_WIBA_DEFAUT = 27

interface CustomerType {
  _id?: string
  nomPrenom: string

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
}

interface EditModalProps {
  show: boolean
  toggleModal: () => void
  data: CustomerType
  onSave: (data: CustomerType) => void
}

const EditModal = ({ show, toggleModal, data, onSave }: any) => {
  const [openOlive, setOpenOlive] = useState(true)
  const [openHuile, setOpenHuile] = useState(true)
  const [loading, setLoading] = useState(false)
  const [poidsWiba, setPoidsWiba] = useState<number>(POIDS_WIBA_DEFAUT)
  const [prixKg, setPrixKilo] = useState<number>(0)
  const [formValues, setFormValues] = useState<CustomerType>(data)

  useEffect(() => {
    if (show && data) {
      setFormValues(data)
      setPoidsWiba(data.nombreWiba > 0 && data.quantiteOliveNet > 0 ? data.quantiteOliveNet / data.nombreWiba : POIDS_WIBA_DEFAUT)
    }
  }, [data, show])

  const calculateNetQuantity = (olive: number, caisses: number) => Math.max(0, olive - caisses * POIDS_CAISSE)

  const calculateWibaAndQfza = (oliveNet: number, wiba: number) => {
    const nWiba = oliveNet > 0 && wiba > 0 ? oliveNet / wiba : 0
    const nQfza = nWiba / WIBA_PAR_QFIZ
    return { nWiba, nQfza }
  }

  const calculateNisba = (huile: number, oliveNet: number) => (oliveNet > 0 && huile > 0 ? (huile / oliveNet) * 100 : 0)

  const calculateHuileTheorique = (oliveNet: number, nisba: number) => (oliveNet * nisba) / 100

  const calculateKattou3 = (huile: number, oliveNet: number, wiba: number) => {
    if (oliveNet <= 0 || huile <= 0 || wiba <= 0) return 0
    const huileLitres = huile / DENSITE_HUILE
    const { nWiba, nQfza } = calculateWibaAndQfza(oliveNet, wiba)
    if (nQfza <= 0) return 0
    return huileLitres / nQfza / 10
  }

  const calculateHuileParQfza = (huile: number, oliveNet: number, wiba: number) => {
    const { nQfza } = calculateWibaAndQfza(oliveNet, wiba)
    return nQfza > 0 ? huile / nQfza : 0
  }

  const calculatePrixFinal = (huile: number, prixKg: number) => (huile > 0 && prixKg > 0 ? huile * prixKg : 0)

  // === RE-CALCUL AUTOMATIQUE ===
  useEffect(() => {
    const { quantiteOlive, nombreCaisses, quantiteHuile } = formValues

    const oliveNet = calculateNetQuantity(quantiteOlive, nombreCaisses)
    const { nWiba, nQfza } = calculateWibaAndQfza(oliveNet, poidsWiba)
    const nisba = calculateNisba(quantiteHuile, oliveNet)
    const kattou3 = calculateKattou3(quantiteHuile, oliveNet, poidsWiba)
    const huileTheorique = calculateHuileTheorique(oliveNet, nisba)
    const diff = quantiteHuile - huileTheorique
    const huileParQfza = calculateHuileParQfza(quantiteHuile, oliveNet, poidsWiba)
    // const prixFinal = calculatePrixFinal(oliveNet, prixKg)

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
    }))
  }, [formValues.quantiteOlive, formValues.nombreCaisses, formValues.quantiteHuile, poidsWiba])

  const ReactSwal = withReactContent(Swal)

  const showAlert = (options: SweetAlertOptions) => {
    ReactSwal.fire({
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-primary mt-2' },
      ...options,
    })
  }

  // === CHANGEMENTS INPUT ===
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const isText = ['nomPrenom', 'type', 'dateCreation'].includes(name)
    setFormValues((prev) => ({
      ...prev,
      [name]: isText ? value : parseFloat(value) || 0,
    }))
  }

  const handleDateChange = (dates: Date[]) => {
    if (dates[0]) {
      const date = new Date(dates[0])
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      setFormValues((prev) => ({
        ...prev,
        dateCreation: formattedDate,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`http://92.112.181.241:8170/proprietaires/${formValues._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formValues,
          dateCreation: new Date(formValues.dateCreation).toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update proprietaire')
      }

      showAlert({
        icon: 'success',
        text: 'Propriétaire modifié avec succès!',
        showConfirmButton: false,
        timer: 1500,
        position: 'top-end',
      })

      toggleModal()
      onSave(formValues)
    } catch (error) {
      console.error('Error updating proprietaire:', error)
      showAlert({
        icon: 'error',
        text: 'Erreur : impossible de modifier le propriétaire',
        confirmButtonText: 'OK',
      })
    } finally {
      setLoading(false)
    }
  }

  const format = (v: number) => (v > 0 ? v.toFixed(2) : '')

  return (
    <Modal show={show} onHide={toggleModal} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier le Propriétaire</Modal.Title>
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
                    defaultValue="proprietaire"
                    // onChange={handleChange}
                    disabled
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="type" defaultValue="proprietaire" disabled></Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date création</Form.Label>
                  <Flatpickr
                    className="form-control"
                    value={formValues.dateCreation}
                    onChange={handleDateChange}
                    options={{
                      dateFormat: 'Y-m-d',
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* --- Section Olive --- */}
            <div
              className="d-flex justify-content-between align-items-center mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenOlive(!openOlive)}>
              <h5>🍃 Quantité d'olive</h5>
              {openOlive ? <ChevronUp /> : <ChevronDown />}
            </div>

            {openOlive && (
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Nombre de caisses</Form.Label>
                    <Form.Control type="number" name="nombreCaisses" value={formValues.nombreCaisses || ''} onChange={(e: any) => handleChange(e)} />
                    <Form.Text className="text-muted">olive net = olive - (caisses × 30)</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité Olive (kg)</Form.Label>
                    <Form.Control type="number" name="quantiteOlive" value={formValues.quantiteOlive || ''} onChange={(e: any) => handleChange(e)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité Olive Net (kg) الزيتون</Form.Label>
                    <Form.Control type="text" name="quantiteOliveNet" value={format(formValues.quantiteOliveNet)} readOnly />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* --- Section Huile --- */}
            <div
              className="d-flex justify-content-between align-items-center mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenHuile(!openHuile)}>
              <h5>🧴 Quantité d'huile & Rendement</h5>
              {openHuile ? <ChevronUp /> : <ChevronDown />}
            </div>

            {openHuile && (
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Quantité Huile (NET kg) الزيت</Form.Label>
                    <Form.Control type="number" name="quantiteHuile" value={formValues.quantiteHuile || ''} onChange={(e: any) => handleChange(e)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Nisba % (النسبة)</Form.Label>
                    <Form.Control type="text" name="nisba" value={format(formValues.nisba)} readOnly />
                    <Form.Text className="text-muted">= (huile / olive net) × 100</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Ktou3 (القطوع)</Form.Label>
                    <Form.Control type="text" name="kattou3" value={format(formValues.kattou3)} readOnly />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* --- Prix du kilo et Wiba --- */}
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>🪣 Poid Wiba (KG)</Form.Label>
                  <Form.Control type="number" value={poidsWiba} onChange={(e) => setPoidsWiba(parseFloat(e.target.value) || POIDS_WIBA_DEFAUT)} />
                  <Form.Text className="text-muted">Modifiable à tout moment</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* --- Résumé des valeurs --- */}
            <Card className="p-3 mb-4 shadow-sm border-primary">
              <Row className="text-center">
                <Col>
                  <h6>Nom et prénom</h6>
                  <p className="fw-bold text-success">{formValues.nomPrenom || '-'}</p>
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
              </Row>
            </Card>
          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={toggleModal} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Enregistrer les modifications'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default EditModal
