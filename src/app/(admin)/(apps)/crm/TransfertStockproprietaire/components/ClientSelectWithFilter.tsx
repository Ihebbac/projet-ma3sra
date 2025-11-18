import { useState } from 'react'
import { TbSearch, TbX } from 'react-icons/tb'
import { ClientType } from '../types'

const ClientSelectWithFilter = ({ 
  clients, 
  selectedClientId, 
  onSelectClient 
}: { 
  clients: ClientType[]
  selectedClientId: string
  onSelectClient: (clientId: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase()
    
    return (
      client.nomPrenom.toLowerCase().includes(searchLower) ||
      (client.numTelephone && client.numTelephone.toString().includes(searchTerm)) 
     
    )
  })

  const selectedClient = clients.find(c => c._id === selectedClientId)

  return (
    <div className="position-relative">
      <div className="input-group">
        <span className="input-group-text">
          <TbSearch />
        </span>
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher un client..."
          value={selectedClient ? selectedClient.nomPrenom : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            if (!e.target.value) onSelectClient('')
          }}
          onFocus={() => setIsOpen(true)}
        />
        {selectedClientId && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              onSelectClient('')
              setSearchTerm('')
            }}
          >
            <TbX />
          </button>
        )}
      </div>
      
      {isOpen && searchTerm && filteredClients.length > 0 && (
        <div className="position-absolute w-100 mt-1 bg-white border rounded shadow-lg" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
          <div className="list-group list-group-flush">
            {filteredClients.map(client => (
              <button
                key={client._id}
                className="list-group-item list-group-item-action"
                onClick={() => {
                  onSelectClient(client._id)
                  setSearchTerm('')
                  setIsOpen(false)
                }}
              >
                <div className="fw-bold">{client.nomPrenom}</div>
                <small className="text-muted">
                  {client.numTelephone && `📞 ${client.numTelephone}`}
                  
                </small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientSelectWithFilter