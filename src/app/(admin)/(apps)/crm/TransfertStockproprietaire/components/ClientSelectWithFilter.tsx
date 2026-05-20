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

const cleanPhone = (value: string | number | undefined | null) =>
  (value ?? '').toString().replace(/\s+/g, '')

const styles = `
@keyframes dropDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.client-dropdown {
  animation: dropDown 0.15s ease;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.client-dropdown::-webkit-scrollbar { width: 5px; }
.client-dropdown::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.client-dropdown-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.12s ease;
}
.client-dropdown-item:hover { background: #eef2ff; }
.client-dropdown-item:not(:last-child) { border-bottom: 1px solid #f3f4f6; }
.client-dropdown-item.active {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}
.client-dropdown-name { color: #1f2937; font-weight: 600; font-size: 0.85rem; }
.client-dropdown-phone { color: #6b7280; font-size: 0.75rem; }
.client-dropdown-type {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 4px;
  display: inline-block;
}
.client-dropdown-type.fellah { background: #dcfce7; color: #15803d; }
.client-dropdown-type.kayyel { background: #fef3c7; color: #b45309; }
`

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
    const searchPhone = cleanPhone(searchTerm)
    const searchRaw = searchTerm.toLowerCase()

    return uniqueClients.filter((client) => {
      const normalizedName = normalizeClientName(client.nomPrenom)
      const name = client.nomPrenom.toLowerCase()
      const phone = cleanPhone(client.numTelephone)
      const id = (client._id || '').toLowerCase()

      const matchName = (
        searchLower.length > 0 &&
        (normalizedName.includes(searchLower) || name.includes(searchRaw))
      )
      const matchPhone = searchPhone.length > 0 && phone.includes(searchPhone)
      const matchId = id.includes(searchRaw)

      return matchName || matchPhone || matchId
    })
  }, [uniqueClients, searchTerm])

  const selectedClient = clients.find((c) => c._id === selectedClientId)

  return (
    <>
      <style>{styles}</style>
      <div className="position-relative">
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-white">
            <TbSearch size={14} />
          </span>

          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Nom, téléphone ou ID..."
            value={selectedClient ? selectedClient.nomPrenom : searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)

              if (!e.target.value) {
                onSelectClient('')
              }
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 180)}
          />

          {selectedClientId && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                onSelectClient('')
                setSearchTerm('')
                setIsOpen(false)
              }}
            >
              <TbX size={14} />
            </button>
          )}
        </div>

        {isOpen && searchTerm && (
          <div className="position-absolute w-100 mt-1 bg-white shadow-sm client-dropdown" style={{ zIndex: 1060 }}>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <button
                  type="button"
                  key={client._id}
                  className={`client-dropdown-item ${client._id === selectedClientId ? 'active' : ''}`}
                  onMouseDown={() => {
                    onSelectClient(client._id)
                    setSearchTerm('')
                    setIsOpen(false)
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="client-dropdown-name">
                      {normalizeClientName(client.nomPrenom)
                        .split(' ')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                    {client.type && (
                      <span className={`client-dropdown-type ${client.type === 'فلاح' ? 'fellah' : 'kayyel'}`}>
                        {client.type === 'فلاح' ? 'Fellah' : 'Kayyel'}
                      </span>
                    )}
                  </div>
                  {client.numTelephone && (
                    <div className="client-dropdown-phone mt-1 d-flex align-items-center gap-2">
                      <span>{client.numTelephone}</span>
                      <button
                        type="button"
                        title="Copier l'ID"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard?.writeText(client._id || '')
                        }}
                        style={{
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          borderRadius: 3,
                          padding: '0 5px',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          color: '#6b7280',
                          lineHeight: '16px',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = '#f9fafb'; }}
                      >
                        {client._id ? `${client._id.slice(0, 4)}..` : ''} Copier
                      </button>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-3" style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                Aucun client trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default ClientSelectWithFilter
