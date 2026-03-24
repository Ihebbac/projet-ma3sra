'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Row, Col, Card } from 'react-bootstrap'
import { TbCurrencyDollar, TbRepeat, TbX } from 'react-icons/tb'

import { ProprietaireType } from '../types'

const API_BASE_URL = 'http://192.168.1.15:8170'

type MotifType =
  | 'Vente'
  | 'Vente export'
  | 'Vente locale'
  | 'Don'
  | 'Échantillon'
  | 'Autre'

type Props = {
  show: boolean
  onHide: () => void
  proprietaire: ProprietaireType
  onTransferComplete: () => void
}

const formatNumber = (value?: number) => Number(value || 0).toFixed(2)

const TransfertModal = ({
  show,
  onHide,
  proprietaire,
  onTransferComplete,
}: Props) => {
  const [typeStock, setTypeStock] = useState<'olive' | 'huile'>('olive')
  const [quantite, setQuantite] = useState<number>(0)
  const [motif, setMotif] = useState<MotifType | ''>('')
  const [commentaire, setCommentaire] = useState('')
  const [prixFinal, setPrixFinal] = useState<number>(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const stockOlive = Number(
    proprietaire?.quantiteOliveNet || proprietaire?.quantiteOlive || 0
  )
  const stockHuile = Number(proprietaire?.quantiteHuile || 0)

  const stockDisponible = typeStock === 'olive' ? stockOlive : stockHuile

  const nomPrenomCompose = useMemo(() => {
    const safeMotif = motif?.trim() || 'Sans motif'
    const safeCommentaire = commentaire?.trim() || 'Sans commentaire'
    return `${safeMotif} | ${safeCommentaire} | Prix final: ${formatNumber(prixFinal)} DT`
  }, [motif, commentaire, prixFinal])

  const nouveauStockEstime = useMemo(() => {
    return Math.max(stockDisponible - Number(quantite || 0), 0)
  }, [stockDisponible, quantite])

  const handleReset = () => {
    setTypeStock('olive')
    setQuantite(0)
    setMotif('')
    setCommentaire('')
    setPrixFinal(0)
    setError('')
    setLoading(false)
  }

  const handleClose = () => {
    if (loading) return
    handleReset()
    onHide()
  }

  const handleTransfer = async () => {
    setError('')

    if (!motif) {
      setError('Veuillez sélectionner un motif.')
      return
    }

    if (quantite <= 0) {
      setError('La quantité doit être supérieure à 0.')
      return
    }

    if (quantite > stockDisponible) {
      setError(`Stock insuffisant. Disponible : ${formatNumber(stockDisponible)} kg`)
      return
    }

    if (prixFinal < 0) {
      setError('Le prix final ne peut pas être négatif.')
      return
    }

    setLoading(true)

    try {
      const now = new Date().toISOString()
      const commentaireNettoye = commentaire.trim() || 'Sans commentaire'

      const transactionData = {
        date: now,
        dateCreation: now,
        typeStock,
        type: typeStock,
        quantite: Number(quantite),
        operation: 'retrait',
        motif,
        commentaire: commentaireNettoye,
        details: commentaireNettoye,
        prix: Number(prixFinal),
        prixFinal: Number(prixFinal),
        clientNom: nomPrenomCompose,
        nomPrenom: nomPrenomCompose,
        proprietaireId: proprietaire._id,
      }

      const transactionResponse = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      })

      if (!transactionResponse.ok) {
        let errorMessage = 'Erreur lors de la création de la transaction'
        try {
          const errorData = await transactionResponse.json()
          errorMessage = errorData?.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      const stockNegatifData = {
        nomPrenom: nomPrenomCompose,
        dateCreation: now,
        type: 'proprietaire',
        nombreCaisses: 0,
        quantiteOlive: typeStock === 'olive' ? -Number(quantite) : 0,
        quantiteHuile: typeStock === 'huile' ? -Number(quantite) : 0,
        quantiteOliveNet: typeStock === 'olive' ? -Number(quantite) : 0,
        kattou3: 0,
        nisba: 0,
        stockRestant: 0,
        transactions: [
          {
            date: now,
            type: typeStock,
            quantite: Number(quantite),
            operation: 'retrait',
          },
        ],
      }

      const proprietaireResponse = await fetch(`${API_BASE_URL}/proprietaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockNegatifData),
      })

      if (!proprietaireResponse.ok) {
        let errorMessage = 'Erreur lors de la création de la fiche propriétaire'
        try {
          const errorData = await proprietaireResponse.json()
          errorMessage = errorData?.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      handleReset()
      onHide()
      onTransferComplete()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Une erreur est survenue lors du retrait.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      backdrop="static"
      contentClassName="bg-body text-body border"
    >
      <Modal.Header closeButton={!loading} className="border-bottom">
        <Modal.Title className="d-flex align-items-center">
          <TbRepeat className="me-2" />
          Retirer du stock propriétaire
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-body text-body">
        {error ? (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        <Row className="mb-3">
          <Col md={6} className="mb-3 mb-md-0">
            <Card className="border shadow-sm h-100 bg-body text-body">
              <Card.Body>
                <div className="small text-muted mb-1">Stock Olive</div>
                <div className="fs-4 fw-bold">{formatNumber(stockOlive)} kg</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="border shadow-sm h-100 bg-body text-body">
              <Card.Body>
                <div className="small text-muted mb-1">Stock Huile</div>
                <div className="fs-4 fw-bold">{formatNumber(stockHuile)} kg</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Type de stock *</Form.Label>
                <Form.Select
                  value={typeStock}
                  onChange={(e) => setTypeStock(e.target.value as 'olive' | 'huile')}
                  disabled={loading}
                  className="bg-body text-body"
                >
                  <option value="olive">Olive (kg)</option>
                  <option value="huile">Huile (kg)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Disponible : <strong>{formatNumber(stockDisponible)} kg</strong>
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Quantité à retirer *</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  max={stockDisponible}
                  step={0.01}
                  value={quantite}
                  onChange={(e) => setQuantite(parseFloat(e.target.value) || 0)}
                  disabled={loading}
                  className="bg-body text-body"
                  placeholder="0.00"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Motif *</Form.Label>
                <Form.Select
                  value={motif}
                  onChange={(e) => setMotif(e.target.value as MotifType | '')}
                  disabled={loading}
                  className="bg-body text-body"
                >
                  <option value="">-- Sélectionnez un motif --</option>
                  <option value="Vente">Vente</option>
                  <option value="Vente export">Vente export</option>
                  <option value="Vente locale">Vente locale</option>
                  <option value="Don">Don</option>
                  <option value="Échantillon">Échantillon</option>
                  <option value="Autre">Autre</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  {/* <TbCurrencyDollar className="me-1" /> */}
                  Prix final (DT)
                </Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step={0.001}
                  value={prixFinal}
                  onChange={(e) => setPrixFinal(parseFloat(e.target.value) || 0)}
                  disabled={loading}
                  className="bg-body text-body"
                  placeholder="0.000"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Commentaire / nom libre</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              disabled={loading}
              className="bg-body text-body"
              placeholder="Nom, remarque, facture, destination..."
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Nom fiche généré</Form.Label>
                <Form.Control
                  type="text"
                  value={nomPrenomCompose}
                  readOnly
                  className="bg-body text-body"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Nouveau stock estimé</Form.Label>
                <Form.Control
                  type="text"
                  value={`${formatNumber(nouveauStockEstime)} kg`}
                  readOnly
                  className="bg-body text-body"
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-top">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          <TbX className="me-1" />
          Annuler
        </Button>

        <Button variant="primary" onClick={handleTransfer} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Enregistrement...
            </>
          ) : (
            <>
              <TbRepeat className="me-1" />
              Enregistrer
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default TransfertModal