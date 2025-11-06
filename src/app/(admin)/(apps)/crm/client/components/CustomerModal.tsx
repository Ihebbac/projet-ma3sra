'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Row, Col, Form, Container, Card, Spinner } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Swal, { SweetAlertOptions } from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

// === CONSTANTES ===
const POIDS_CAISSE = 30
const WIBA_PAR_QFIZ = 16
const DENSITE_HUILE = 0.916
const POIDS_WIBA_DEFAUT = 27
// ===================

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  onAdded?: (created: any) => void
  onClientSaved?: () => void
}

const toNumber = (v: any): number | undefined => {
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

const CustomerModal: React.FC<any> = ({ show, onHide, onAdded, onClientSaved, user }) => {
  const [openOlive, setOpenOlive] = useState(true)
  const [openHuile, setOpenHuile] = useState(true)
  const [loading, setLoading] = useState(false)
  const [poidsWiba, setPoidsWiba] = useState<number>(POIDS_WIBA_DEFAUT)
  const [prixKg, setPrixKilo] = useState<number>(0)
  const [autoDate, setAutoDate] = useState<boolean>(true)

  const getTodayDate = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  // dateCreation séparée pour éviter re-render Flatpickr
  const [dateCreation, setDateCreation] = useState<string>(getTodayDate())

  // dernier champ édité pour la sync bidirectionnelle
  const [lastEdited, setLastEdited] = useState<'olive' | 'oliveNet' | null>(null)

  // État initial du formulaire (dateCreation est géré séparément)
  const getInitialFormData = () => ({
    nomPrenom: '',
    prixKg: 0,
    numTelephone: '',
    type: '',
    // dateCreation retiré d'ici (géré dans dateCreation)
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
    prixFinal: 0,
    nomutilisatuer: user?.email,
  })

  const [formValues, setFormValues] = useState(getInitialFormData())

  // Récupération automatique de la date via API si autoDate est activé
  const fetchInternetDate = async () => {
    try {
      const response = await fetch('https://worldtimeapi.org/api/timezone/Africa/Tunis')
      if (!response.ok) throw new Error("Erreur de l'API WorldTime")
      const data = await response.json()
      const date = new Date(data.datetime)
      return date.toISOString().substring(0, 10)
    } catch (error) {
      console.error("Impossible de récupérer la date d'Internet, utilisant la date locale:", error)
      const today = new Date()
      return today.toISOString().substring(0, 10)
    }
  }

  useEffect(() => {
    if (show) {
      setFormValues(getInitialFormData())
      setPoidsWiba(POIDS_WIBA_DEFAUT)
      setPrixKilo(0)
      setOpenOlive(true)
      setOpenHuile(true)
      ;(async () => {
        if (autoDate) {
          const apiDate = await fetchInternetDate()
          setDateCreation(apiDate)
        } else {
          setDateCreation(getTodayDate())
        }
      })()
      setLastEdited(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, autoDate])

  // === FORMULES (inchangées) ===
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

  const calculatePrixFinal = (huile: number, prixKg: number) => Math.round(huile > 0 && prixKg > 0 ? huile * prixKg : 0)

  // ---- Sync bidirectionnelle : si user édite olive ou oliveNet ----
  // Quand lastEdited === 'olive' => calcule quantiteOliveNet
  // Quand lastEdited === 'oliveNet' => calcule quantiteOlive
  useEffect(() => {
    // on lit les valeurs actuelles
    const olive = Number(formValues.quantiteOlive ?? 0)
    const oliveNet = Number(formValues.quantiteOliveNet ?? 0)
    const caisses = Number(formValues.nombreCaisses ?? 0)

    if (lastEdited === 'olive') {
      const computedNet = calculateNetQuantity(olive, caisses)
      // n'écrase que si c'est différent (évite rerender inutile)
      if (computedNet !== oliveNet) {
        setFormValues((prev) => ({ ...prev, quantiteOliveNet: computedNet }))
      }
    } else if (lastEdited === 'oliveNet') {
      const computedOlive = oliveNet + caisses * POIDS_CAISSE
      if (computedOlive !== olive) {
        setFormValues((prev) => ({ ...prev, quantiteOlive: computedOlive }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues.quantiteOlive, formValues.quantiteOliveNet, formValues.nombreCaisses, lastEdited])

  // === RE-CALCUL AUTOMATIQUE (inchangé sauf qu'on respecte lastEdited pour quantiteOliveNet) ===
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
      // Si l'utilisateur vient de modifier oliveNet manuellement, on ne l'écrase pas ici
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
      prixKg: prixKg,
      nomutilisatuer: user?.email,
      // NB: on N'ÉCRASE PAS dateCreation ici (il est géré séparément)
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const isText = ['nomPrenom', 'type', 'dateCreation'].includes(name)

    // pour quantiteOlive ou quantiteOliveNet -> marquer lastEdited et set la valeur brute
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

    // autres champs
    setFormValues((prev) => ({
      ...prev,
      [name]: isText ? value : parseFloat((value as any) as string) || 0,
    }))
  }

  // Flatpickr handler : on change on met à jour la state séparée dateCreation (string)
  const handleDateChange = (dates: Date[]) => {
    if (dates[0]) {
      const date = new Date(dates[0])
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      setDateCreation(formattedDate)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const body = {
        ...formValues,
        numTelephone: toNumber(formValues.numTelephone),
        prixKg: toNumber(formValues.prixKg),
        dateCreation: dateCreation, // envoyer la date séparée
      }

      const res = await fetch('http://92.112.181.241:8170/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      showAlert({
        icon: 'success',
        text: 'Client ajouté avec succès!',
        showConfirmButton: false,
        timer: 1500,
        position: 'top-end',
      })
      onAdded?.(created)
      onClientSaved?.()
      onHide()
    } catch (err) {
      console.error(err)
      showAlert({
        icon: 'error',
        text: "Erreur : impossible d'ajouter le client",
        confirmButtonText: 'OK',
      })
    } finally {
      setLoading(false)
    }
  }

  const format = (v: number) => (v > 0 ? v.toFixed(2) : '')

  // === INTERFACE ===
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter un client</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Container fluid>
            {/* --- Infos Client --- */}
            <h5>Informations du client</h5>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom & Prénom</Form.Label>
                  <Form.Control name="nomPrenom" value={formValues.nomPrenom} onChange={(e: any) => handleChange(e)} placeholder="Ex: Ahmed Trabelsi" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Téléphone</Form.Label>
                  <Form.Control name="numTelephone" value={formValues.numTelephone} onChange={(e: any) => handleChange(e)} placeholder="Ex: 96 458 362" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select name="type" value={formValues.type} onChange={(e: any) => handleChange(e)}>
                    <option value="">Sélectionner...</option>
                    <option value="فلاح">فلاح</option>
                    <option value="كيال">كيال</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Check type="switch" id="autoDateSwitch" label="Date automatique (API)" checked={autoDate} onChange={(e) => setAutoDate(e.target.checked)} />
                  <Flatpickr className="form-control mt-2" value={dateCreation} onChange={handleDateChange} options={{ dateFormat: 'Y-m-d' }} disabled={autoDate} />
                </Form.Group>
              </Col>
            </Row>

            {/* --- Section Olive --- */}
            <div className="d-flex justify-content-between align-items-center mb-2" style={{ cursor: 'pointer' }} onClick={() => setOpenOlive(!openOlive)}>
              <h4>🍃 Quantité d'olive</h4>
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
                    <Form.Label>Quantité Olive(Net kg) الزيتون</Form.Label>
                    <Form.Control type="number" name="quantiteOliveNet" value={formValues.quantiteOliveNet || ''} onChange={(e: any) => handleChange(e)} />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* --- Section Huile --- */}
            <div className="d-flex justify-content-between align-items-center mb-2" style={{ cursor: 'pointer' }} onClick={() => setOpenHuile(!openHuile)}>
              <h4>🧴 Quantité d'huile & Rendement</h4>
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
                    <Form.Control type="number" name="nisba" value={format(formValues.nisba)} onChange={(e: any) => handleChange(e)} />
                    <Form.Text className="text-muted">= (huile / olive net) × 100</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Ktou3 (القطوع)</Form.Label>
                    <Form.Control type="number" name="kattou3" value={format(formValues.kattou3)} onChange={(e: any) => handleChange(e)} />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* --- Prix du kilo et Wiba --- */}
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>💵 Prix du kilo (DT/kg)</Form.Label>
                  <Form.Control type="number" value={prixKg} onChange={(e) => setPrixKilo(parseFloat(e.target.value) || 0)} />
                  <Form.Text className="text-muted">Modifiable à tout moment</Form.Text>
                </Form.Group>
              </Col>
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
                <Col>
                  <h6>Prix Total</h6>
                  <p className="fw-bold text-danger">{Math.round(formValues.prixFinal)} TND</p>
                </Col>
              </Row>
            </Card>
          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>
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

export default CustomerModal
