'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type EditEmployeModalProps = {
  show: boolean
  onHide: () => void
  employe: any
  onSubmit: (data: any) => void
}

function toYMDOrEmpty(v: any): string {
  if (!v) return ''
  // si déjà YYYY-MM-DD
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const EditEmployeModal = ({ show, onHide, employe, onSubmit }: EditEmployeModalProps) => {
  const [form, setForm] = useState<any>(employe)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employe) return
    // ✅ normalise dates pour inputs type="date"
    setForm({
      ...employe,
      estActif: employe.estActif ?? true,
      dateDebutPresence: toYMDOrEmpty(employe.dateDebutPresence),
      dateFinPresence: toYMDOrEmpty(employe.dateFinPresence),
    })
    setError(null)
  }, [employe])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev: any) => ({
      ...prev,
      [name]: name === 'montantJournalier' || name === 'montantHeure' ? parseFloat(value || '0') : value,
    }))
  }

  const dateCheckError = useMemo(() => {
    const start = form?.dateDebutPresence ? new Date(`${form.dateDebutPresence}T00:00:00`) : null
    const end = form?.dateFinPresence ? new Date(`${form.dateFinPresence}T00:00:00`) : null

    if (start && isNaN(start.getTime())) return 'Date début invalide.'
    if (end && isNaN(end.getTime())) return 'Date fin invalide.'
    if (start && end && end.getTime() < start.getTime()) return 'La date de fin ne peut pas être avant la date de début.'
    return null
  }, [form?.dateDebutPresence, form?.dateFinPresence])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const err = dateCheckError
    if (err) {
      setError(err)
      return
    }

    // ✅ si champ vide => null (propre backend)
    const payload = {
      ...form,
      dateDebutPresence: form?.dateDebutPresence ? form.dateDebutPresence : null,
      dateFinPresence: form?.dateFinPresence ? form.dateFinPresence : null,
    }

    onSubmit(payload)
    onHide()
  }

  if (!form) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier un employé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Nom</FormLabel>
                <FormControl name="nom" value={form.nom || ''} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Prénom</FormLabel>
                <FormControl name="prenom" value={form.prenom || ''} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <FormControl name="numTel" value={form.numTel || ''} onChange={handleChange} />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Poste</FormLabel>
                <FormControl name="poste" value={form.poste || ''} onChange={handleChange} />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Journalier (DT)</FormLabel>
                <FormControl
                  name="montantJournalier"
                  type="number"
                  step={0.001}
                  value={Number.isFinite(form.montantJournalier) ? form.montantJournalier : 0}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Heure (DT)</FormLabel>
                <FormControl
                  name="montantHeure"
                  type="number"
                  step={0.001}
                  value={Number.isFinite(form.montantHeure) ? form.montantHeure : 0}
                  onChange={handleChange}
                />
              </FormGroup>
            </Col>

            {/* ✅ NOUVEAU : Début / fin de comptage */}
            <Col md={6}>
              <FormGroup>
                <FormLabel>Début comptage présence</FormLabel>
                <FormControl name="dateDebutPresence" type="date" value={form.dateDebutPresence || ''} onChange={handleChange} />
                <small className="text-muted">Date à partir de laquelle on commence à compter la présence (utile pour employés anciens).</small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Fin comptage (arrêt / fin saison)</FormLabel>
                <FormControl name="dateFinPresence" type="date" value={form.dateFinPresence || ''} onChange={handleChange} />
                <small className="text-muted">Si renseignée, l’employé ne sera plus compté après cette date pour l’année / la saison.</small>
              </FormGroup>
            </Col>

            <Col xs={12}>
              <FormGroup className="mt-2">
                <Form.Check
                  type="switch"
                  id="estActif"
                  name="estActif"
                  label={form.estActif ? 'Employé actif' : 'Employé inactif'}
                  checked={!!form.estActif}
                  onChange={(e: any) => setForm((prev: any) => ({ ...prev, estActif: e.target.checked }))}
                />
              </FormGroup>

              <small className="text-muted">
                ✅ Pointage simple : l’employé est <b>présent par défaut</b>, tu marques seulement les <b>absences</b>.
                <br />
                Le calcul mensuel utilise <b>Début comptage</b> / <b>Fin comptage</b>.
              </small>
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
