import { Modal, Button, Alert, Badge, Table, Form } from 'react-bootstrap'
import { TbHistory, TbSearch } from 'react-icons/tb'
import { useState } from 'react'
import StockDisplay from './StockDisplay'
import { ProprietaireType, TransactionType } from '../types'

const HistoriqueModal = ({ 
  show, 
  onHide, 
  proprietaire,
  transactions
}: { 
  show: boolean
  onHide: () => void
  proprietaire: ProprietaireType
  transactions: TransactionType[]
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState('')

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      transaction.clientNom.toLowerCase().includes(searchLower) ||
      transaction.motif.toLowerCase().includes(searchLower) ||
      (transaction.details && transaction.details.toLowerCase().includes(searchLower))
    
    const matchesDate = !filterDate || 
      (transaction.date && transaction.date.startsWith(filterDate))
    const matchesType = !filterType || transaction.typeStock === filterType
    
    return matchesSearch && matchesDate && matchesType
  })

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <TbHistory className="me-2" />
          Historique des transactions - {proprietaire.nomPrenom}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <StockDisplay proprietaire={proprietaire} />
        
        {/* Filtres */}
        <div className="row mb-3">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Recherche</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <TbSearch />
                </span>
                <Form.Control
                  type="text"
                  placeholder="Client, motif, détails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Type de stock</Form.Label>
              <Form.Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Tous les types</option>
                <option value="olive">Olive</option>
                <option value="huile">Huile</option>
              </Form.Select>
            </Form.Group>
          </div>
        </div>

        <h6 className="mb-3">Dernières transactions ({filteredTransactions.length})</h6>
        {filteredTransactions.length === 0 ? (
          <Alert variant="info">Aucune transaction trouvée</Alert>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Client</th>
                  <th>Motif</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <Badge bg={t.typeStock === 'olive' ? 'success' : 'warning'}>
                        {t.typeStock === 'olive' ? '🫒 Olive' : '🫙 Huile'}
                      </Badge>
                    </td>
                    <td className="fw-bold">{t.quantite} {t.typeStock === 'olive' ? 'kg' : 'L'}</td>
                    <td>{t.clientNom}</td>
                    <td><Badge bg="info">{t.motif}</Badge></td>
                    <td><small className="text-muted">{t.details}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Fermer</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default HistoriqueModal