import { useState } from 'react'
import { Form, Alert } from 'react-bootstrap'
import { TbSearch } from 'react-icons/tb'
import { ClientType } from '../types'

const ClientList = ({ clients }: { clients: ClientType[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      client.nomPrenom.toLowerCase().includes(searchLower) ||
      (client.numTelephone && client.numTelephone.toString().includes(searchTerm)) ||
      (client.email && client.email.toLowerCase().includes(searchLower)) ||
      (client.numCIN && client.numCIN.toString().includes(searchTerm))
    
    const matchesDate = !filterDate || 
      (client.dateCreation && client.dateCreation.startsWith(filterDate))
    
    return matchesSearch && matchesDate
  })

  return (
    <div className="card shadow-sm h-100">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">👥 Clients ({filteredClients.length})</h5>
      </div>
      <div className="card-body">
        {/* Filtres */}
        <div className="row mb-3">
          <div className="col-md-6">
            <Form.Group>
              <Form.Label>Recherche</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <TbSearch />
                </span>
                <Form.Control
                  type="text"
                  placeholder="Nom, téléphone, email, CIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Form.Group>
          </div>
          <div className="col-md-6">
            <Form.Group>
              <Form.Label>Date de création</Form.Label>
              <Form.Control
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </Form.Group>
          </div>
        </div>

        {/* Liste des clients */}
        <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {filteredClients.map(client => (
            <div key={client._id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold">{client.nomPrenom}</div>
                  <small className="text-muted">
                    {client.numTelephone && `📞 ${client.numTelephone}`}
                    {client.numCIN && ` | 🆔 ${client.numCIN}`}
                    {client.dateCreation && ` | 📅 ${new Date(client.dateCreation).toLocaleDateString('fr-FR')}`}
                  </small>
                </div>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <Alert variant="info" className="mb-0">Aucun client trouvé</Alert>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientList