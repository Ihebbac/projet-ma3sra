'use client'

import React, { useEffect, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'

type Props = {
  show: boolean
  onHide: () => void
  apiHost: string
  employeId: string
  date: string
  due: number
  onPaid: () => void
}

export default function PayDayModal({ show, onHide, apiHost, employeId, date, due, onPaid }: Props) {
  const [mode, setMode] = useState<'CAISSE' | 'NOTE'>('CAISSE')
  const [montant, setMontant] = useState<number>(due)
  const [commentaire, setCommentaire] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return
    setMode('CAISSE')
    setMontant(due)
    setCommentaire('')
    setError(null)
    setLoading(false)
  }, [show, due])

  const submit = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${apiHost}/employes/${employeId}/paiement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          mode,
          montant: Number(montant || 0),
          commentaire: commentaire?.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message
        throw new Error(typeof msg === 'string' ? msg : 'Erreur paiement')
      }

      onPaid()
      onHide()
    } catch (e: any) {
      setError(e?.message || 'Erreur paiement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Payer — {date}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="mb-2 text-muted">
          Reste à payer : <b>{due.toFixed(3)} DT</b>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Mode</Form.Label>
          <div className="d-flex gap-3">
            <Form.Check
              type="radio"
              name="mode"
              label="Déduire caisse"
              checked={mode === 'CAISSE'}
              onChange={() => setMode('CAISSE')}
            />
            <Form.Check
              type="radio"
              name="mode"
              label="Noter payé"
              checked={mode === 'NOTE'}
              onChange={() => setMode('NOTE')}
            />
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Montant</Form.Label>
          <Form.Control
            type="number"
            step={0.001}
            min={0}
            value={Number.isFinite(montant) ? montant : 0}
            onChange={(e) => setMontant(parseFloat(e.target.value || '0'))}
          />
          <small className="text-muted">Par défaut = “reste à payer”.</small>
        </Form.Group>

        <Form.Group>
          <Form.Label>Commentaire (optionnel)</Form.Label>
          <Form.Control value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={loading}>
          Annuler
        </Button>
        <Button variant="primary" onClick={submit} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" /> Paiement...
            </>
          ) : (
            'Valider'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}