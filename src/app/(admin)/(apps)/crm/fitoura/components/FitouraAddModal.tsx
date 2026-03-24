'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type FitouraAddModalProps = {
  show: boolean
  onHide: () => void
  onSubmit: (data: FormData) => Promise<void> | void
  camionOptions: string[]
  chauffeurOptions: string[]
}

type SearchableSelectProps = {
  label: string
  name: string
  value: string
  placeholder?: string
  options: string[]
  onChange: (name: string, value: string) => void
}

const SearchableSelect = ({ label, name, value, placeholder, options, onChange }: SearchableSelectProps) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const normalizedValue = value.trim().toLowerCase()

  const filteredOptions = useMemo(() => {
    const uniqueOptions = Array.from(new Set(options.filter(Boolean)))
    if (!normalizedValue) return uniqueOptions.slice(0, 8)

    return uniqueOptions.filter((item) => item.toLowerCase().includes(normalizedValue)).slice(0, 8)
  }, [options, normalizedValue])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <FormGroup>
      <FormLabel>{label}</FormLabel>

      <div ref={wrapperRef} className="position-relative">
        <FormControl
          name={name}
          value={value}
          onChange={(e) => {
            onChange(name, e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />

        {open && filteredOptions.length > 0 && (
          <div
            className="position-absolute start-0 end-0 border rounded shadow-sm mt-1"
            style={{
              zIndex: 2000,
              maxHeight: '220px',
              overflowY: 'auto',
              background: 'var(--bs-body-bg)',
              opacity: 1,
              borderColor: 'var(--bs-border-color)',
              boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.18)',
            }}>
            {filteredOptions.map((item) => (
              <button
                key={`${name}-${item}`}
                type="button"
                className="w-100 text-start border-0 px-3 py-2"
                style={{
                  cursor: 'pointer',
                  background: 'var(--bs-body-bg)',
                  color: 'var(--bs-body-color)',
                  opacity: 1,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bs-secondary-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bs-body-bg)'
                }}
                onClick={() => {
                  onChange(name, item)
                  setOpen(false)
                }}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </FormGroup>
  )
}

const FitouraAddModal = ({ show, onHide, onSubmit, camionOptions, chauffeurOptions }: FitouraAddModalProps) => {
  const [form, setForm] = useState({
    matriculeCamion: '',
    chauffeur: '',
    poidsEntree: '',
    poidsSortie: '',
    prixUnitaire: '',
    status: 'EN_COURS',
  })

  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!show) {
      setForm({
        matriculeCamion: '',
        chauffeur: '',
        poidsEntree: '',
        poidsSortie: '',
        prixUnitaire: '',
        status: 'EN_COURS',
      })
      setFiles([])
      setSubmitting(false)
    }
  }, [show])

  const handleFieldChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || [])
    setFiles(nextFiles)
  }

  const poidsEntree = form.poidsEntree !== '' ? Number(form.poidsEntree) : null
  const poidsSortie = form.poidsSortie !== '' ? Number(form.poidsSortie) : null
  const prixUnitaire = form.prixUnitaire !== '' ? Number(form.prixUnitaire) : null

  const preview = useMemo(() => {
    const poidsNet = poidsEntree !== null && poidsSortie !== null ? poidsSortie - poidsEntree : null

    const montantTotal = poidsNet !== null && prixUnitaire !== null ? poidsNet * prixUnitaire : null

    return { poidsNet, montantTotal }
  }, [poidsEntree, poidsSortie, prixUnitaire])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = new FormData()

      if (form.matriculeCamion.trim()) {
        payload.append('matriculeCamion', form.matriculeCamion.trim())
      }

      if (form.chauffeur.trim()) {
        payload.append('chauffeur', form.chauffeur.trim())
      }

      if (form.poidsEntree !== '') {
        payload.append('poidsEntree', form.poidsEntree)
      }

      if (form.poidsSortie !== '') {
        payload.append('poidsSortie', form.poidsSortie)
      }

      if (form.prixUnitaire !== '') {
        payload.append('prixUnitaire', form.prixUnitaire)
      }

      if (form.status) {
        payload.append('status', form.status)
      }

      files.forEach((file) => {
        payload.append('attachments', file)
      })

      await onSubmit(payload)
      onHide()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter une opération Fitoura</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <SearchableSelect
                label="Matricule camion"
                name="matriculeCamion"
                value={form.matriculeCamion}
                placeholder="Saisir ou choisir un matricule"
                options={camionOptions}
                onChange={handleFieldChange}
              />
            </Col>

            <Col md={6}>
              <SearchableSelect
                label="Chauffeur"
                name="chauffeur"
                value={form.chauffeur}
                placeholder="Saisir ou choisir un chauffeur"
                options={chauffeurOptions}
                onChange={handleFieldChange}
              />
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Poids d’entrée (kg)</FormLabel>
                <FormControl name="poidsEntree" type="number" step="0.001" value={form.poidsEntree} onChange={handleChange} placeholder="Ex : 1200" />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Poids de sortie (kg)</FormLabel>
                <FormControl name="poidsSortie" type="number" step="0.001" value={form.poidsSortie} onChange={handleChange} placeholder="Optionnel" />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Prix unitaire (DT/kg)</FormLabel>
                <FormControl
                  name="prixUnitaire"
                  type="number"
                  step="0.001"
                  value={form.prixUnitaire}
                  onChange={handleChange}
                  placeholder="Ex : 0.850"
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Statut</FormLabel>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="EN_COURS">En cours</option>
                  <option value="TERMINE">Terminée</option>
                </Form.Select>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Pièces jointes</FormLabel>
                <FormControl type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFilesChange} />
                <div className="text-muted small mt-1">Appareil photo, galerie ou fichiers selon l’appareil utilisé.</div>
              </FormGroup>
            </Col>

            <Col md={6}>
              <div
                className="border rounded p-3"
                style={{
                  backgroundColor: 'var(--bs-tertiary-bg)',
                  color: 'var(--bs-body-color)',
                  borderColor: 'var(--bs-border-color)',
                }}>
                <div className="fw-semibold mb-2">Aperçu calculé</div>
                <div>Poids net : {preview.poidsNet !== null ? preview.poidsNet.toFixed(3) : '-'}</div>
                <div>Montant total : {preview.montantTotal !== null ? preview.montantTotal.toFixed(3) : '-'}</div>
              </div>
            </Col>

            <Col md={6}>
              <div
                className="border rounded p-3"
                style={{
                  backgroundColor: 'var(--bs-tertiary-bg)',
                  color: 'var(--bs-body-color)',
                  borderColor: 'var(--bs-border-color)',
                }}>
                <div className="fw-semibold mb-2">Remarque</div>
                <div className="text-muted">Tu peux enregistrer avec des champs vides puis compléter plus tard dans la modification.</div>
              </div>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Enregistrement...' : 'Ajouter'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default FitouraAddModal
