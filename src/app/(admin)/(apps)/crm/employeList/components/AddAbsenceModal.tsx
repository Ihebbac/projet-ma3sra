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

export default function AddAbsenceModal({ show, onHide, employe, apiHost, onDone }: Props) {
  const [date, setDate] = useState(toYMD(new Date()))
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    if (!employe) return 'Absence'
    return `Absence — ${employe.prenom} ${employe.nom}`
  }, [employe])

  useEffect(() => {
    if (!show) return
    setDate(toYMD(new Date()))
    setMotif('')
    setSaving(false)
    setError(null)
  }, [show])

  const submit = async () => {
    if (!employe) return
    try {
      setSaving(true)
      setError(null)

      const res = await fetch(`${apiHost}/employes/${employe._id}/absence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, motif: motif?.trim() || undefined }),
      })
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message
        throw new Error(msg || "Erreur lors de l'ajout de l'absence.")
      }

      onDone()
      onHide()
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'ajout de l'absence.")
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

        <Form.Group>
          <Form.Label>Motif (optionnel)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex: malade, congé, déplacement..."
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={saving}>
          Annuler
        </Button>
        <Button variant="danger" onClick={submit} disabled={saving || !employe}>
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" /> Enregistrement...
            </>
          ) : (
            'Marquer absent'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}