'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Alert, Spinner, Row, Col, Card, Form } from 'react-bootstrap'
import { TbHistory, TbRepeat, TbRefresh, TbFilter } from 'react-icons/tb'

import StockDisplay from './components/StockDisplay'
import HistoriqueModal from './components/HistoriqueModal'
import TransfertModal from './components/TransfertModal'
import ClientList from './components/ClientList'
import { ProprietaireType, ClientType, TransactionType } from './types'

const TransfertStockProprietaire = () => {
  const [proprietaire, setProprietaire] = useState<ProprietaireType | null>(null)
  const [clients, setClients] = useState<ClientType[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientType[]>([])
  const [transactions, setTransactions] = useState<TransactionType[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistorique, setShowHistorique] = useState(false)
  const [showTransfert, setShowTransfert] = useState(false)
  const [search, setSearch] = useState('')

  /** 🧩 Fetch propriétaire + total stock */
  const fetchProprietaire = useCallback(async () => {
    try {
      const res = await fetch('http://92.112.181.241:8170/proprietaires')
      if (!res.ok) throw new Error('Erreur de récupération des propriétaires')

      const data: ProprietaireType[] = await res.json()
      if (data.length === 0) return

      const stockTotal = data.reduce(
        (acc, prop) => ({
          quantiteOlive: acc.quantiteOlive + (prop.quantiteOliveNet || 0),
          quantiteHuile: acc.quantiteHuile + (prop.quantiteHuile || 0),
          nombreCaisses: acc.nombreCaisses + (prop.nombreCaisses || 0),
        }),
        { quantiteOlive: 0, quantiteHuile: 0, nombreCaisses: 0 }
      )

      setProprietaire({
        _id: '68e50decabc8b6c3f05aece6',
        nomPrenom: 'PROPRIÉTAIRE (Stock Total)',
        dateCreation: new Date().toISOString(),
        ...stockTotal,
      })
    } catch (err) {
      console.error(err)
    }
  }, [])

  /** 👥 Fetch clients */
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('http://92.112.181.241:8170/clients')
      if (!res.ok) throw new Error('Erreur de récupération des clients')

      const data: ClientType[] = await res.json()
      setClients(data)
      setFilteredClients(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  /** 🔁 Fetch transactions */
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('http://92.112.181.241:8170/transactions')
      if (!res.ok) throw new Error('Erreur de récupération des transactions')

      const data: TransactionType[] = await res.json()
      setTransactions(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  /** 🚀 Charger toutes les données */
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchProprietaire(), fetchClients(), fetchTransactions()])
    setLoading(false)
  }, [fetchProprietaire, fetchClients, fetchTransactions])

  /** 🧠 Filtrage des clients */
  useEffect(() => {
    const lowerSearch = search.toLowerCase().trim()
    if (lowerSearch === '') {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(
        (c) =>
          c.nomPrenom?.toLowerCase().includes(lowerSearch) ||
        c.numCIN?.includes(lowerSearch) ||
          c.numTelephone?.includes(lowerSearch)
      )
      setFilteredClients(filtered)
    }
  }, [search, clients])

  /** Initialisation */
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  /** 🌀 Chargement */
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-5">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Chargement des données...</p>
      </div>
    )
  }

  /** ⚠️ Aucun propriétaire trouvé */
  if (!proprietaire) {
    return (
      <Alert variant="warning" className="m-4">
        <Alert.Heading>Aucun propriétaire trouvé</Alert.Heading>
        <p>Veuillez créer un propriétaire avant de gérer les transferts.</p>
      </Alert>
    )
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1 fw-bold">Transfert de Stock</h2>
          <p className="text-muted">Gérez facilement les transferts vers vos clients</p>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" onClick={fetchAllData}>
            <TbRefresh className="me-1" /> Actualiser
          </Button>
        </Col>
      </Row>

      {/* Contenu principal */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm h-100 border-0">
            <Card.Header className="bg-primary text-white fw-semibold">
              📊 Stock Total Propriétaire
            </Card.Header>
            <Card.Body>
              <StockDisplay proprietaire={proprietaire} />
              <div className="d-grid gap-3 mt-4">
                <Button variant="outline-primary" size="lg" onClick={() => setShowHistorique(true)}>
                  <TbHistory className="me-2" /> Voir l'historique
                </Button>
                <Button variant="primary" size="lg" onClick={() => setShowTransfert(true)}>
                  <TbRepeat className="me-2" /> Effectuer un transfert
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Liste des clients avec filtre */}
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-light fw-semibold d-flex align-items-center justify-content-between">
              <span>👥 Liste des Clients</span>
              {/* <div className="d-flex align-items-center gap-2">
                <TbFilter className="text-secondary" />
                <Form.Control
                  type="text"
                  placeholder="Rechercher un client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 250 }}
                  size="sm"
                />
              </div> */}
            </Card.Header>
            <Card.Body>
              <ClientList clients={filteredClients} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <HistoriqueModal
        show={showHistorique}
        onHide={() => setShowHistorique(false)}
        proprietaire={proprietaire}
        transactions={transactions}
      />
      <TransfertModal
        show={showTransfert}
        onHide={() => setShowTransfert(false)}
        proprietaire={proprietaire}
        clients={clients}
        onTransferComplete={fetchAllData}
      />
    </div>
  )
}

export default TransfertStockProprietaire
