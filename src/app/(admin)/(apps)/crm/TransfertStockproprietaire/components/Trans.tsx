'use client'

import { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'

type CustomerType = {
  _id: string
  nomPrenom: string
  quantiteOlive?: number
  quantiteHuile?: number
}

type TransfertModalProps = {
  show: boolean
  toggleModal: () => void
  proprietaireSource: CustomerType
  allProprietaires: CustomerType[]
  onTransferComplete: () => void
}

const TransfertModal = ({
  show,
  toggleModal,
  proprietaireSource,
  allProprietaires,
  onTransferComplete
}: TransfertModalProps) => {
  const [proprietaireCibleId, setProprietaireCibleId] = useState<string>('')
  const [typeStock, setTypeStock] = useState<'olive' | 'huile'>('olive')
  const [quantite, setQuantite] = useState<number>(0)
  const [error, setError] = useState<string>('')

  const handleTransfer = async () => {
    setError('')

    if (!proprietaireCibleId) {
      setError('Veuillez sélectionner un propriétaire cible.')
      return
    }

    if (quantite <= 0) {
      setError('La quantité doit être supérieure à 0.')
      return
    }

    const stockSource = typeStock === 'olive' ? proprietaireSource.quantiteOlive || 0 : proprietaireSource.quantiteHuile || 0
    if (quantite > stockSource) {
      setError(`Stock insuffisant. Disponible: ${stockSource}`)
      return
    }

    try {
      // Mettre à jour le propriétaire source
      await fetch(`http://localhost:8170/proprietaires/${proprietaireSource._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: typeStock, quantite: -quantite })
      })

      // Mettre à jour le propriétaire cible
      await fetch(`http://localhost:8170/proprietaires/${proprietaireCibleId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: typeStock, quantite })
      })

      onTransferComplete()
      toggleModal()
      setQuantite(0)
      setProprietaireCibleId('')
    } catch (err) {
      console.error('Erreur lors du transfert:', err)
      setError('Erreur lors du transfert, réessayez.')
    }
  }

  return (
    <Modal show={show} onHide={toggleModal}>
      <Modal.Header closeButton>
        <Modal.Title>Transfert de stock</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Propriétaire source</Form.Label>
            <Form.Control type="text" value={proprietaireSource.nomPrenom} readOnly />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Propriétaire cible</Form.Label>
            <Form.Select value={proprietaireCibleId} onChange={(e) => setProprietaireCibleId(e.target.value)}>
              <option value="">Sélectionnez un propriétaire</option>
              {allProprietaires
                .filter(p => p._id !== proprietaireSource._id)
                .map(p => (
                  <option key={p._id} value={p._id}>
                    {p.nomPrenom}
                  </option>
                ))
              }
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Type de stock</Form.Label>
            <Form.Select value={typeStock} onChange={(e) => setTypeStock(e.target.value as 'olive' | 'huile')}>
              <option value="olive">Olive (kg)</option>
              <option value="huile">Huile (L)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Quantité à transférer</Form.Label>
            <Form.Control
              type="number"
              value={quantite}
              onChange={(e) => setQuantite(parseFloat(e.target.value))}
              min={0}
              step={0.01}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={toggleModal}>Annuler</Button>
        <Button variant="primary" onClick={handleTransfer}>Transférer</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default TransfertModal
