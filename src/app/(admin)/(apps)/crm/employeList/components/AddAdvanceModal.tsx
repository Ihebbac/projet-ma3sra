'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'

type Employe = {
  _id: string
  nom: string
  prenom: string
}

type Props = {
  show: boolean
  onHide: () => void
  employe: Employe | null
  apiHost: string // ex: http://192.168.1.15:8170
  onDone: () => void // refresh list
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export default function AddAdvanceModal({ show, onHide, employe, apiHost, onDone }: Props) {
  const [date, setDate] = useState(toYMD(new Date()))
  const [montant, setMontant] = useState<number>(0)
  const [mode, setMode] = useState<'CAISSE' | 'NOTE'>('CAISSE')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    if (!employe) return 'Avance'
    return `Avance — ${employe.prenom} ${employe.nom}`
  }, [employe])

  useEffect(() => {
    if (!show) return
    setDate(toYMD(new Date()))
    setMontant(0)
    setMode('CAISSE')
    setNote('')
    setSaving(false)
    setError(null)
  }, [show])

  const submit = async () => {
    if (!employe) return
    if (!montant || montant <= 0) {
      setError('Montant invalide.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const res = await fetch(`${apiHost}/employes/${employe._id}/avance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          montant,
          mode,
          note: note?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message
        throw new Error(msg || "Erreur lors de l'ajout de l'avance.")
      }

      onDone()
      onHide()
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'ajout de l'avance.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form.Group className="mb-3">
          <Form.Label>Date</Form.Label>
          <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Montant (DT)</Form.Label>
          <Form.Control
            type="number"
            step={0.001}
            min={0}
            value={Number.isFinite(montant) ? montant : 0}
            onChange={(e) => setMontant(parseFloat(e.target.value || '0'))}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Mode</Form.Label>
          <div className="d-flex gap-3">
            <Form.Check
              type="radio"
              name="modeAvance"
              id="modeCaisse"
              label="Déduire de la caisse الآن"
              checked={mode === 'CAISSE'}
              onChange={() => setMode('CAISSE')}
            />
            <Form.Check
              type="radio"
              name="modeAvance"
              id="modeNote"
              label="Juste noter (pas caisse)"
              checked={mode === 'NOTE'}
              onChange={() => setMode('NOTE')}
            />
          </div>
          <small className="text-muted">
            CAISSE = tu veux que ça soit comptabilisé comme sortie caisse. NOTE = juste enregistré chez l’employé.
          </small>
        </Form.Group>

        <Form.Group>
          <Form.Label>Note (optionnel)</Form.Label>
          <Form.Control as="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={saving}>
          Annuler
        </Button>
        <Button variant="warning" onClick={submit} disabled={saving || !employe}>
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" /> Enregistrement...
            </>
          ) : (
            'Ajouter avance'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}