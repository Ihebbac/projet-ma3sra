'use client'
import { Button, Card, Col, Container, Form, Modal, Row, Spinner } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { useEffect, useState } from 'react'
import withReactContent from 'sweetalert2-react-content'
import Swal, { SweetAlertOptions } from 'sweetalert2'
import { ChevronDown, ChevronUp } from 'lucide-react'

const POIDS_CAISSE = 30
const WIBA_PAR_QFIZ = 16
const DENSITE_HUILE = 0.916
const POIDS_WIBA_DEFAUT = 27

interface CreateDealModalProps {
  show: boolean
  toggleModal: () => void
  onProprietaireCreated?: () => void
}

const CreateDealModal = ({ show, toggleModal, onProprietaireCreated }: CreateDealModalProps) => {
  const [openOlive, setOpenOlive] = useState(true)
  const [openHuile, setOpenHuile] = useState(true)
  const [loading, setLoading] = useState(false)
  const [poidsWiba, setPoidsWiba] = useState<number>(POIDS_WIBA_DEFAUT)
  const [prixKg, setPrixKilo] = useState<number>(0)
  
  // AJOUT: State pour la sync bidirectionnelle
  const [lastEdited, setLastEdited] = useState<'olive' | 'oliveNet' | null>(null)

  const getTodayDate = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  const getInitialFormData = () => ({
    nomPrenom: 'Propriétaire',
    type: 'proprietaire',
    dateCreation: getTodayDate(),
    nombreCaisses: 0,
    quantiteOlive: 0,
    quantiteHuile: 0,
    quantiteOliveNet: 0,
    kattou3: 0,
    nisba: 0,
    nisbaReelle: 0,
    quantiteHuileTheorique: 0,
    differenceHuile: 0,
    nombreWiba: 0,
    nombreQfza: 0,
    huileParQfza: 0,
  })

  const [formValues, setFormValues] = useState(getInitialFormData())

  useEffect(() => {
    if (show) {
      // Réinitialiser tous les états quand le modal s'ouvre
      setFormValues(getInitialFormData())
      setPoidsWiba(POIDS_WIBA_DEFAUT)
      setPrixKilo(0)
      setOpenOlive(true)
      setOpenHuile(true)
      // AJOUT: Reset lastEdited
      setLastEdited(null)
    }
  }, [show])

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

  // AJOUT: Sync bidirectionnelle olive ↔ oliveNet
  useEffect(() => {
    const olive = Number(formValues.quantiteOlive ?? 0)
    const oliveNet = Number(formValues.quantiteOliveNet ?? 0)
    const caisses = Number(formValues.nombreCaisses ?? 0)

    if (lastEdited === 'olive') {
      const computedNet = calculateNetQuantity(olive, caisses)
      if (computedNet !== oliveNet) {
        setFormValues((prev) => ({ ...prev, quantiteOliveNet: computedNet }))
      }
    } else if (lastEdited === 'oliveNet') {
      const computedOlive = oliveNet + caisses * POIDS_CAISSE
      if (computedOlive !== olive) {
        setFormValues((prev) => ({ ...prev, quantiteOlive: computedOlive }))
      }
    }
  }, [formValues.quantiteOlive, formValues.quantiteOliveNet, formValues.nombreCaisses, lastEdited])

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
    const prixFinal = calculatePrixFinal(oliveNet, prixKg)

    setFormValues((prev) => ({
      ...prev,
      // AJOUT: Respect de lastEdited pour la sync
      quantiteOliveNet: lastEdited === 'oliveNet' ? prev.quantiteOliveNet : oliveNet,
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
  }, [formValues.quantiteOlive, formValues.nombreCaisses, formValues.quantiteHuile, poidsWiba, prixKg, lastEdited])

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
    const isText = ['nomPrenom', 'type', 'dateCreation', 'numTelephone'].includes(name)

    // AJOUT: Sync bidirectionnelle
    if (name === 'quantiteOlive') {
      setLastEdited('olive')
      const numeric = parseFloat(value) || 0
      setFormValues((prev) => ({ ...prev, quantiteOlive: numeric }))
      return
    }
    if (name === 'quantiteOliveNet') {
      setLastEdited('oliveNet')
      const numeric = parseFloat(value) || 0
      setFormValues((prev) => ({ ...prev, quantiteOliveNet: numeric }))
      return
    }

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
      const response = await fetch('http://92.112.181.241:8170/proprietaires', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formValues,
          dateCreation: new Date(formValues.dateCreation).toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create proprietaire')
      }

      showAlert({
        icon: 'success',
        text: 'Propriétaire ajouté avec succès!',
        showConfirmButton: false,
        timer: 1500,
        position: 'top-end',
      })

      // Reset form
      setFormValues(getInitialFormData())
      setPoidsWiba(POIDS_WIBA_DEFAUT)
      setPrixKilo(0)

      toggleModal()

      // Callback pour rafraîchir les données
      if (onProprietaireCreated) {
        onProprietaireCreated()
      }
    } catch (error) {
      console.error('Error creating proprietaire:', error)
      showAlert({
        icon: 'error',
        text: "Erreur : impossible d'ajouter le propriétaire",
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
          <Modal.Title>Ajouter un propriétaire stock</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Container fluid>
            {/* --- Infos Client --- */}
            <h5>Informations du client</h5>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom & Prénom</Form.Label>
                  <Form.Control name="nomPrenom" value={formValues.nomPrenom} onChange={(e: any) => handleChange(e)} disabled />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Control
                    name="type"
                    defaultValue="proprietaire"
                    disabled
                    //    onChange={(e: any) => handleChange(e)}
                  ></Form.Control>
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
                      defaultDate: getTodayDate(),
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
                    {/* CHANGEMENT: Champ éditable pour la sync */}
                    <Form.Control 
                      type="number" 
                      name="quantiteOliveNet" 
                      value={formValues.quantiteOliveNet || ''} 
                      onChange={(e: any) => handleChange(e)} 
                    />
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
                  <Form.Label>🪣 Quantité Wiba (KG)</Form.Label>
                  <Form.Control type="number" value={poidsWiba} onChange={(e) => setPoidsWiba(parseFloat(e.target.value) || POIDS_WIBA_DEFAUT)} />
                  <Form.Text className="text-muted">Modifiable à tout moment</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* --- Résumé des valeurs --- */}
            <Card className="p-3 mb-4 shadow-sm border-success">
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
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Ajouter'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default CreateDealModal