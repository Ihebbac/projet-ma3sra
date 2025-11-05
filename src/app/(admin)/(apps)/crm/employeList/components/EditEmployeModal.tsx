'use client'
import { toNumber } from 'lodash'
import React, { useState, useEffect } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl, Table } from 'react-bootstrap'

type JourTravaille = {
  date: string
  heuresSup?: number
}

type EditEmployeModalProps = {
  show: boolean
  onHide: () => void
  employe: any
  onSubmit: (data: any) => void
}

const joursSemaine = [
  { id: 'lundi', nom: 'Lundi', index: 1 },
  { id: 'mardi', nom: 'Mardi', index: 2 },
  { id: 'mercredi', nom: 'Mercredi', index: 3 },
  { id: 'jeudi', nom: 'Jeudi', index: 4 },
  { id: 'vendredi', nom: 'Vendredi', index: 5 },
  { id: 'samedi', nom: 'Samedi', index: 6 },
  { id: 'dimanche', nom: 'Dimanche', index: 0 },
]

const EditEmployeModal = ({ show, onHide, employe, onSubmit }: EditEmployeModalProps) => {
  const [form, setForm] = useState(employe)
  const [moisSelectionne, setMoisSelectionne] = useState<string>('')
  const [joursTravaillesManuels, setJoursTravaillesManuels] = useState<string[]>([])

  useEffect(() => {
    setForm(employe)
    const aujourdHui = new Date()
    setMoisSelectionne(`${aujourdHui.getFullYear()}-${(aujourdHui.getMonth() + 1).toString().padStart(2, '0')}`)
  }, [employe])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev: any) => ({ ...prev, [name]: name === 'montantJournalier' ? parseFloat(value) : value }))
  }

  const ajouterDateSpecifique = () => {
    const dateInput = document.getElementById('dateSpecifique') as HTMLInputElement
    const dateValue = dateInput?.value

    if (dateValue) {
      const nouvelleDate = new Date(dateValue + 'T00:00:00').toISOString()
      const datesExistantes: JourTravaille[] = form.joursTravailles || []

      if (!datesExistantes.some((j: JourTravaille) => j.date === nouvelleDate)) {
        setForm((prev: any) => ({
          ...prev,
          joursTravailles: [...datesExistantes, { date: nouvelleDate, heuresSup: 0 }],
        }))
      }
      dateInput.value = ''
    }
  }

  const toggleJourManuel = (dateISO: string) => {
    setJoursTravaillesManuels((prev: any) => (prev.includes(dateISO) ? prev.filter((d: any) => d !== dateISO) : [...prev, dateISO]))
  }

  const ajouterJoursManuels = () => {
    if (joursTravaillesManuels.length === 0) return
    const datesExistantes: JourTravaille[] = form.joursTravailles || []
    const nouvellesDates = [...datesExistantes]

    joursTravaillesManuels.forEach((dateISO) => {
      if (!nouvellesDates.some((j) => j.date === dateISO)) {
        nouvellesDates.push({ date: dateISO, heuresSup: 0 })
      }
    })

    setForm((prev: any) => ({ ...prev, joursTravailles: nouvellesDates }))
    setJoursTravaillesManuels([])
  }

  const supprimerDate = (index: number) => {
    const nouvellesDates = form.joursTravailles.filter((_: any, i: number) => i !== index)
    setForm((prev: any) => ({ ...prev, joursTravailles: nouvellesDates }))
  }

  const updateHeuresSup = (index: number, value: number) => {
    setForm((prev: any) => {
      const updated = [...prev.joursTravailles]
      updated[index].heuresSup = value
      return { ...prev, joursTravailles: updated }
    })
  }

  const payerFunction = async (index: number) => {
    const { date, heuresSup } = form.joursTravailles[index]

    try {
      const res = await fetch(`http://92.112.181.241:8170/employes/${form._id}/payer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, heuresSup }),
      })

      if (res.ok) {
        setForm((prev: any) => ({
          ...prev,
          joursPayes: [...prev.joursPayes, date],
        }))
        const montantTotal = toNumber(form.montantJournalier) + heuresSup * form.montantHeure

        const body = {
          motif: `Paiement Employé`,
          montant: montantTotal,
          type: 'debit',
          date: new Date().toISOString(),
          commentaire: `Paiement de ${form.nom} ${form.prenom} pour le ${new Date(date).toLocaleDateString('fr-FR')}`,
        }

        await fetch('http://92.112.181.241:8170/caisse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        alert('Erreur lors du paiement !')
      }
    } catch (error) {
      console.error('Erreur de connexion :', error)
      alert('Erreur de connexion !')
    }
  }

  const getJoursDuMois = () => {
    if (!moisSelectionne) return []
    const [annee, mois] = moisSelectionne.split('-').map(Number)
    const dernierJour = new Date(annee, mois, 0)
    const jours = []
    for (let jour = 1; jour <= dernierJour.getDate(); jour++) jours.push(new Date(annee, mois - 1, jour))
    return jours
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
    onHide()
  }

  if (!form) return null

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier un employé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* --- Infos Employé --- */}
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Nom</FormLabel>
                <FormControl name="nom" value={form.nom} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Prénom</FormLabel>
                <FormControl name="prenom" value={form.prenom} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>

            {/* --- Salaire & Mois --- */}
            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Journalier (DT)</FormLabel>
                <FormControl name="montantJournalier" type="number" value={form.montantJournalier} onChange={(e: any) => handleChange(e)} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Heure (DT)</FormLabel>
                <FormControl name="montantHeure" type="number" value={form.montantHeure} onChange={(e: any) => handleChange(e)} />
              </FormGroup>
            </Col>

            <Col xs={12}>
              <hr />
              <h6>Jours de travail et heures supplémentaires</h6>

              <Row className="mb-3">
                <Col md={6}>
                  <FormLabel>Mois :</FormLabel>
                  <FormControl type="month" value={moisSelectionne} onChange={(e) => setMoisSelectionne(e.target.value)} />
                </Col>
              </Row>

              {/* --- Sélection jours --- */}
              {moisSelectionne && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <FormLabel>Sélectionner manuellement les jours :</FormLabel>
                    <div className="d-flex flex-wrap gap-1">
                      {getJoursDuMois().map((date, index) => {
                        const dateISO = date.toISOString()
                        const estTravaille = form.joursTravailles?.some((j: JourTravaille) => j.date === dateISO)
                        const estSelectionne = joursTravaillesManuels.includes(dateISO)
                        return (
                          <div
                            key={index}
                            onClick={() => !estTravaille && toggleJourManuel(dateISO)}
                            className={`p-2 border rounded text-center ${
                              estTravaille ? 'bg-success text-white' : estSelectionne ? 'bg-primary text-white' : 'bg-light'
                            }`}
                            style={{ width: '40px', cursor: estTravaille ? 'not-allowed' : 'pointer' }}>
                            {date.getDate()}
                          </div>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="mt-2"
                      onClick={ajouterJoursManuels}
                      disabled={joursTravaillesManuels.length === 0}>
                      Ajouter les jours sélectionnés
                    </Button>
                  </Col>
                </Row>
              )}

              {/* --- Liste jours enregistrés --- */}
              <Row>
                <Col xs={12}>
                  <FormLabel>Jours travaillés :</FormLabel>
                  {form.joursTravailles && form.joursTravailles.length > 0 ? (
                    <Table striped bordered size="sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Jour</th>
                          <th>Heures sup.</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.joursTravailles.map((jour: JourTravaille, index: number) => {
                          const date = new Date(jour.date)
                          const jourSemaine = joursSemaine.find((j) => j.index === date.getDay())
                          const estPaye = form.joursPayes.includes(jour.date)
                          return (
                            <tr key={index}>
                              <td>{date.toLocaleDateString('fr-FR')}</td>
                              <td>{jourSemaine?.nom}</td>
                              <td>
                                <FormControl
                                  type="number"
                                  min={0}
                                  value={jour.heuresSup || 0}
                                  disabled={estPaye}
                                  onChange={(e) => updateHeuresSup(index, parseFloat(e.target.value) || 0)}
                                  style={{ maxWidth: '80px' }}
                                />
                              </td>
                              <td>
                                <Button variant="outline-danger" size="sm" onClick={() => supprimerDate(index)} disabled={estPaye}>
                                  Supprimer
                                </Button>{' '}
                                <Button
                                  variant={estPaye ? 'success' : 'outline-success'}
                                  size="sm"
                                  onClick={() => payerFunction(index)}
                                  disabled={estPaye}>
                                  {estPaye ? 'Payé' : 'Payer'}
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted">Aucun jour travaillé</p>
                  )}
                </Col>
              </Row>
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
