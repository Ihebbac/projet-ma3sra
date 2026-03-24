'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap'

type FitouraEditAllModalProps = {
  show: boolean
  onHide: () => void
  operation: any
  camionOptions: string[]
  chauffeurOptions: string[]
  apiBaseUrl: string
  onSaved: () => Promise<void> | void
  onError?: () => void
}

const FitouraEditAllModal = ({
  show,
  onHide,
  operation,
  camionOptions,
  chauffeurOptions,
  apiBaseUrl,
  onSaved,
  onError,
}: FitouraEditAllModalProps) => {
  const [form, setForm] = useState({
    matriculeCamion: '',
    chauffeur: '',
    poidsEntree: '',
    poidsSortie: '',
    prixUnitaire: '',
    status: 'EN_COURS',
  })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (operation) {
      setForm({
        matriculeCamion: operation.matriculeCamion || '',
        chauffeur: operation.chauffeur || '',
        poidsEntree:
          operation.poidsEntree !== null && operation.poidsEntree !== undefined
            ? String(operation.poidsEntree)
            : '',
        poidsSortie:
          operation.poidsSortie !== null && operation.poidsSortie !== undefined
            ? String(operation.poidsSortie)
            : '',
        prixUnitaire:
          operation.prixUnitaire !== null && operation.prixUnitaire !== undefined
            ? String(operation.prixUnitaire)
            : '',
        status: operation.status || 'EN_COURS',
      })
      setFiles([])
    }
  }, [operation])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const poidsEntree = form.poidsEntree !== '' ? Number(form.poidsEntree) : null
  const poidsSortie = form.poidsSortie !== '' ? Number(form.poidsSortie) : null
  const prixUnitaire = form.prixUnitaire !== '' ? Number(form.prixUnitaire) : null

  const preview = useMemo(() => {
    const poidsNet =
      poidsEntree !== null && poidsSortie !== null ? poidsSortie - poidsEntree : null
    const montantTotal =
      poidsNet !== null && prixUnitaire !== null ? poidsNet * prixUnitaire : null

    return { poidsNet, montantTotal }
  }, [poidsEntree, poidsSortie, prixUnitaire])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!operation?._id) return

    setSaving(true)

    try {
      const body: any = {
        matriculeCamion: form.matriculeCamion.trim() || null,
        chauffeur: form.chauffeur.trim() || null,
        poidsEntree: form.poidsEntree === '' ? null : Number(form.poidsEntree),
        poidsSortie: form.poidsSortie === '' ? null : Number(form.poidsSortie),
        prixUnitaire: form.prixUnitaire === '' ? null : Number(form.prixUnitaire),
        status: form.status,
      }

      const updateRes = await fetch(`${apiBaseUrl}/fitoura/modifier/${operation._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!updateRes.ok) {
        throw new Error('Échec de la mise à jour')
      }

      if (files.length > 0) {
        const fileData = new FormData()
        files.forEach((file) => fileData.append('attachments', file))

        const attachRes = await fetch(`${apiBaseUrl}/fitoura/${operation._id}/attachments`, {
          method: 'POST',
          body: fileData,
        })

        if (!attachRes.ok) {
          throw new Error("Échec de l'ajout des pièces jointes")
        }
      }

      await onSaved()
      onHide()
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la fitoura :', error)
      if (onError) onError()
    } finally {
      setSaving(false)
    }
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []))
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier l’opération Fitoura</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Matricule camion</FormLabel>
                <FormControl
                  name="matriculeCamion"
                  value={form.matriculeCamion}
                  onChange={handleChange}
                  placeholder="Matricule camion"
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Chauffeur</FormLabel>
                <FormControl
                  name="chauffeur"
                  value={form.chauffeur}
                  onChange={handleChange}
                  placeholder="Nom du chauffeur"
                />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Poids d’entrée (kg)</FormLabel>
                <FormControl
                  name="poidsEntree"
                  type="number"
                  step="0.001"
                  value={form.poidsEntree}
                  onChange={handleChange}
                />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Poids de sortie (kg)</FormLabel>
                <FormControl
                  name="poidsSortie"
                  type="number"
                  step="0.001"
                  value={form.poidsSortie}
                  onChange={handleChange}
                />
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
                <FormLabel>Ajouter des pièces jointes</FormLabel>
                <FormControl
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFilesChange}
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <div className="border rounded p-3 bg-light">
                <div className="fw-semibold mb-2">Aperçu calculé</div>
                <div>Poids net : {preview.poidsNet !== null ? preview.poidsNet.toFixed(3) : '-'}</div>
                <div>
                  Montant total :{' '}
                  {preview.montantTotal !== null ? preview.montantTotal.toFixed(3) : '-'}
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default FitouraEditAllModal