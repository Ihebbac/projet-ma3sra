'use client'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { TbRepeat, TbX } from 'react-icons/tb'
import { useState } from 'react'
import StockDisplay from './StockDisplay'
import ClientSelectWithFilter from './ClientSelectWithFilter'
import { ProprietaireType, ClientType } from '../types'

const TransfertModal = ({
  show,
  onHide,
  proprietaire,
  clients,
  onTransferComplete
}: {
  show: boolean
  onHide: () => void
  proprietaire: ProprietaireType
  clients: ClientType[]
  onTransferComplete: () => void
}) => {
  const [clientId, setClientId] = useState<string>('')
  const [typeStock, setTypeStock] = useState<'olive' | 'huile'>('olive')
  const [quantite, setQuantite] = useState<number>(0)
  const [motif, setMotif] = useState<string>('')
  const [details, setDetails] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const stockDisponible =
    typeStock === 'olive'
      ? proprietaire.quantiteOliveNet || 0
      : proprietaire.quantiteHuile || 0

  const selectedClient = clients.find(c => c._id === clientId)

  const handleReset = () => {
    setClientId('')
    setTypeStock('olive')
    setQuantite(0)
    setMotif('')
    setDetails('')
    setError('')
  }

  const handleTransfer = async () => {
    setError('')
    setLoading(true)

    if (!clientId) {
      setError('Veuillez sélectionner un client destinataire.')
      setLoading(false)
      return
    }

    if (quantite <= 0) {
      setError('La quantité doit être supérieure à 0.')
      setLoading(false)
      return
    }

    if (quantite > stockDisponible) {
      setError(
        `Stock insuffisant. Disponible: ${stockDisponible} ${typeStock === 'olive' ? 'kg' : 'L'}`
      )
      setLoading(false)
      return
    }

    if (!motif.trim()) {
      setError('Veuillez indiquer un motif pour ce transfert.')
      setLoading(false)
      return
    }

    try {
      const transactionData = {
        proprietaireId: proprietaire._id, // ✅ Correction ici
        clientId,
        clientNom: selectedClient?.nomPrenom,
        typeStock,
        quantite,
        motif,
        details,
        date: new Date().toISOString()
      }

      const transactionResponse = await fetch('http://192.168.1.15:8170/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      })

      const responseData = await transactionResponse.json()

      if (!transactionResponse.ok) {
        console.error('Erreur backend:', responseData)
        throw new Error(responseData.message || 'Erreur lors de la création de la transaction')
      }

      // ✅ Mettre à jour les stocks (répartition proportionnelle)
      const proprietairesResponse = await fetch('http://192.168.1.15:8170/proprietaires')
      if (proprietairesResponse.ok) {
        const proprietaires = await proprietairesResponse.json()
        for (const prop of proprietaires) {
          const stockProp = typeStock === 'olive' ? prop.quantiteOlive || 0 : prop.quantiteHuile || 0
          const proportion = stockProp / stockDisponible
          const quantiteARetirer = quantite * proportion

          if (quantiteARetirer > 0) {
            await fetch(`http://192.168.1.15:8170/proprietaires/${prop._id}/stock`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: typeStock,
                quantite: quantiteARetirer,
                operation: 'retrait'
              })
            })
          }
        }
      }

      alert('✅ Transfert effectué avec succès !')
      onTransferComplete()
      handleReset()
      onHide()
    } catch (err: any) {
      console.error('Erreur lors du transfert:', err)
      setError(err.message || 'Erreur lors du transfert. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <TbRepeat className="me-2" />
          Transfert de stock vers client
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <StockDisplay proprietaire={proprietaire} />

        <Form>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Client destinataire *</Form.Label>
            <ClientSelectWithFilter
              clients={clients}
              selectedClientId={clientId}
              onSelectClient={setClientId}
            />
            {selectedClient && (
              <div className="mt-2 p-3 bg-light rounded">
                <div className="fw-bold">{selectedClient.nomPrenom}</div>
                <small className="text-muted">
                  {selectedClient.numTelephone && `📞 ${selectedClient.numTelephone}`}
             
                </small>
              </div>
            )}
          </Form.Group>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Type de stock *</Form.Label>
                <Form.Select
                  value={typeStock}
                  onChange={e => setTypeStock(e.target.value as 'olive' | 'huile')}
                  size="lg"
                >
                  <option value="olive">🫒 Olive (kg)</option>
                  <option value="huile">🫙 Huile (litres)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Stock disponible :{' '}
                  <strong className="text-primary">{stockDisponible}</strong>{' '}
                  {typeStock === 'olive' ? 'kg' : 'L'}
                </Form.Text>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Quantité à transférer *</Form.Label>
                <Form.Control
                  type="number"
                  value={quantite}
                  onChange={e => setQuantite(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={stockDisponible}
                  step={0.01}
                  size="lg"
                  placeholder="0.00"
                />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Motif du transfert *</Form.Label>
            <Form.Select
              value={motif}
              onChange={e => setMotif(e.target.value)}
              size="lg"
            >
              <option value="">-- Sélectionnez un motif --</option>
              <option value="Vente">Vente</option>
              <option value="Vente export">Vente export</option>
              <option value="Vente locale">Vente locale</option>
              <option value="Livraison commande">Livraison commande</option>
              <option value="Échange">Échange</option>
              <option value="Don">Don</option>
              <option value="Échantillon">Échantillon</option>
              <option value="Autre">Autre</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Détails supplémentaires</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Numéro de facture, commande, informations complémentaires..."
            />
          </Form.Group>

          {quantite > 0 && clientId && motif && (
            <Alert variant="success">
              <strong>📋 Résumé du transfert :</strong>
              <ul className="mb-0 mt-2">
                <li>
                  Quantité : <strong>{quantite} {typeStock === 'olive' ? 'kg d\'olive' : 'L d\'huile'}</strong>
                </li>
                <li>Destinataire : <strong>{selectedClient?.nomPrenom}</strong></li>
                <li>Motif : <strong>{motif}</strong></li>
                <li>
                  Nouveau stock total :{' '}
                  <strong className="text-danger">
                    {(stockDisponible - quantite).toFixed(2)} {typeStock === 'olive' ? 'kg' : 'L'}
                  </strong>
                </li>
              </ul>
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => {
            handleReset()
            onHide()
          }}
          disabled={loading}
        >
          <TbX className="me-1" /> Annuler
        </Button>
        <Button variant="primary" onClick={handleTransfer} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Transfert en cours...
            </>
          ) : (
            <>
              <TbRepeat className="me-1" /> Effectuer le transfert
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default TransfertModal
