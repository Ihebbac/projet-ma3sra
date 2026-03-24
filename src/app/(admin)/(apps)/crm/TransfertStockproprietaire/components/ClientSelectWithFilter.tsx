import { useMemo, useState } from 'react'
import { TbSearch, TbX } from 'react-icons/tb'
import { ClientType } from '../types'

const normalizeClientName = (value: string) => {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/\(\d+\)\s*$/g, '')
    .replace(/\b\d+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const ClientSelectWithFilter = ({
  clients,
  selectedClientId,
  onSelectClient,
}: {
  clients: ClientType[]
  selectedClientId: string
  onSelectClient: (clientId: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const uniqueClients = useMemo(() => {
    const map = new Map<string, ClientType>()

    for (const client of clients || []) {
      const key = normalizeClientName(client.nomPrenom)

      if (!map.has(key)) {
        map.set(key, client)
      }
    }

    return Array.from(map.values())
  }, [clients])

  const filteredClients = useMemo(() => {
    const searchLower = normalizeClientName(searchTerm)

    return uniqueClients.filter((client) => {
      const normalizedName = normalizeClientName(client.nomPrenom)
      const phone = client.numTelephone ? client.numTelephone.toString() : ''

      return (
        normalizedName.includes(searchLower) ||
        client.nomPrenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm)
      )
    })
  }, [uniqueClients, searchTerm])

  const selectedClient = clients.find((c) => c._id === selectedClientId)

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

            if (!e.target.value) {
              onSelectClient('')
            }
          }}
          onFocus={() => setIsOpen(true)}
        />

        {selectedClientId && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              onSelectClient('')
              setSearchTerm('')
              setIsOpen(false)
            }}
          >
            <TbX />
          </button>
        )}
      </div>

      {isOpen && searchTerm && filteredClients.length > 0 && (
        <div
          className="position-absolute w-100 mt-1 bg-white border rounded shadow-lg"
          style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}
        >
          <div className="list-group list-group-flush">
            {filteredClients.map((client) => (
              <button
                type="button"
                key={client._id}
                className="list-group-item list-group-item-action"
                onClick={() => {
                  onSelectClient(client._id)
                  setSearchTerm('')
                  setIsOpen(false)
                }}
              >
                <div className="fw-bold">{normalizeClientName(client.nomPrenom)
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}</div>

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