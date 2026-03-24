import React, { useMemo, useState } from 'react'
import { Modal, Button, Table, Badge, Row, Col } from 'react-bootstrap'

type FitouraAttachment = {
  _id?: string
  originalName?: string
  filename?: string
  path?: string
  mimetype?: string
  size?: number
  uploadedAt?: string
}

type FitouraType = {
  _id: string
  matriculeCamion?: string | null
  chauffeur?: string | null
  poidsEntree?: number | null
  poidsSortie?: number | null
  poidsNet?: number | null
  prixUnitaire?: number | null
  montantTotal?: number | null
  status: 'EN_COURS' | 'TERMINE'
  dateSortie?: string | null
  attachments?: FitouraAttachment[]
}

type FitouraDetailModalProps = {
  show: boolean
  onHide: () => void
  operation: FitouraType | null
  apiBaseUrl: string
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return Number(value).toFixed(3)
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('fr-FR')
}

const formatFileSize = (size?: number) => {
  if (!size || size <= 0) return '-'
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
  return `${(size / (1024 * 1024)).toFixed(2)} Mo`
}

const isImageFile = (attachment?: FitouraAttachment | null) => {
  const mimetype = String(attachment?.mimetype || '').toLowerCase()
  const path = String(attachment?.path || '').toLowerCase()

  return (
    mimetype.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].some((ext) => path.endsWith(ext))
  )
}

const isPdfFile = (attachment?: FitouraAttachment | null) => {
  const mimetype = String(attachment?.mimetype || '').toLowerCase()
  const path = String(attachment?.path || '').toLowerCase()

  return mimetype === 'application/pdf' || path.endsWith('.pdf')
}

const buildFileUrl = (apiBaseUrl: string, path?: string) => {
  if (!path) return ''
  const cleanBase = apiBaseUrl.replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  return `${cleanBase}/${cleanPath}`
}

const FitouraDetailModal = ({
  show,
  onHide,
  operation,
  apiBaseUrl,
}: FitouraDetailModalProps) => {
  const attachments = Array.isArray(operation?.attachments) ? operation?.attachments : []

  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectedAttachment =
    attachments.length > 0
      ? attachments[Math.min(selectedIndex, attachments.length - 1)]
      : null

  const selectedFileUrl = useMemo(() => {
    return selectedAttachment ? buildFileUrl(apiBaseUrl, selectedAttachment.path) : ''
  }, [apiBaseUrl, selectedAttachment])

  if (!operation) return null

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Détail de l’opération Fitoura</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Row className="g-3">
          <Col lg={5}>
            <Table bordered responsive className="align-middle mb-0">
              <tbody>
                <tr>
                  <th style={{ width: '42%' }}>Matricule camion</th>
                  <td>{operation.matriculeCamion || '-'}</td>
                </tr>
                <tr>
                  <th>Chauffeur</th>
                  <td>{operation.chauffeur || '-'}</td>
                </tr>
                <tr>
                  <th>Poids d’entrée (kg)</th>
                  <td>{formatNumber(operation.poidsEntree)}</td>
                </tr>
                <tr>
                  <th>Poids de sortie (kg)</th>
                  <td>{formatNumber(operation.poidsSortie)}</td>
                </tr>
                <tr>
                  <th>Poids net (kg)</th>
                  <td>{formatNumber(operation.poidsNet)}</td>
                </tr>
                <tr>
                  <th>Prix unitaire (DT/kg)</th>
                  <td>{formatNumber(operation.prixUnitaire)}</td>
                </tr>
                <tr>
                  <th>Montant total (DT)</th>
                  <td>{formatNumber(operation.montantTotal)}</td>
                </tr>
                <tr>
                  <th>Statut</th>
                  <td>
                    {operation.status === 'TERMINE' ? (
                      <Badge bg="success">Terminée</Badge>
                    ) : (
                      <Badge bg="warning" text="dark">
                        En cours
                      </Badge>
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Date de sortie</th>
                  <td>{formatDate(operation.dateSortie)}</td>
                </tr>
              </tbody>
            </Table>
          </Col>

          <Col lg={7}>
            <div className="border rounded p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div className="fw-semibold">Pièces jointes</div>
                {selectedAttachment && selectedFileUrl ? (
                  <a
                    href={selectedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-primary">
                    Ouvrir dans un nouvel onglet
                  </a>
                ) : null}
              </div>

              {attachments.length === 0 ? (
                <div className="text-muted">Aucune pièce jointe.</div>
              ) : (
                <>
                  {/* <div className="d-flex flex-wrap gap-2 mb-3">
                    {attachments.map((item, index) => {
                      const active = index === selectedIndex
                      return (
                        <button
                          key={item._id || `${item.filename}-${index}`}
                          type="button"
                          className={`btn btn-sm ${
                            active ? 'btn-primary' : 'btn-outline-secondary'
                          }`}
                          onClick={() => setSelectedIndex(index)}>
                          {item.originalName || `Pièce jointe ${index + 1}`}
                        </button>
                      )
                    })}
                  </div> */}

                  {selectedAttachment && (
                    <div className="mb-3 small text-muted">
                      <div>
                        <strong>Nom :</strong>{' '}
                        {selectedAttachment.originalName || selectedAttachment.filename || '-'}
                      </div>
                      <div>
                        <strong>Type :</strong> {selectedAttachment.mimetype || '-'}
                      </div>
                      <div>
                        <strong>Taille :</strong> {formatFileSize(selectedAttachment.size)}
                      </div>
                      <div>
                        <strong>Date d’ajout :</strong>{' '}
                        {formatDate(selectedAttachment.uploadedAt)}
                      </div>
                    </div>
                  )}

                  <div
                    className="border rounded bg-light overflow-hidden"
                    style={{ minHeight: '480px' }}>
                    {selectedAttachment && selectedFileUrl ? (
                      isImageFile(selectedAttachment) ? (
                        <div className="d-flex justify-content-center align-items-center h-100 p-3">
                          <img
                            src={selectedFileUrl}
                            alt={selectedAttachment.originalName || 'Pièce jointe'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '620px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                            }}
                          />
                        </div>
                      ) : isPdfFile(selectedAttachment) ? (
                        <iframe
                          src={selectedFileUrl}
                          title={selectedAttachment.originalName || 'Aperçu PDF'}
                          style={{
                            width: '100%',
                            height: '620px',
                            border: '0',
                            background: '#fff',
                          }}
                        />
                      ) : (
                        <div className="d-flex flex-column justify-content-center align-items-center h-100 p-4 text-center">
                          <div className="fw-semibold mb-2">
                            Aperçu non disponible pour ce type de fichier
                          </div>
                          <div className="text-muted mb-3">
                            Ce fichier ne peut pas être affiché directement dans le modal.
                          </div>
                          <a
                            href={selectedFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary">
                            Ouvrir le fichier
                          </a>
                        </div>
                      )
                    ) : (
                      <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                        Aucune pièce jointe sélectionnée.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default FitouraDetailModal