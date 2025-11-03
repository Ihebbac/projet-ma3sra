import React from 'react'
import { Modal, Button, ModalHeader, ModalTitle, ModalBody, Table, ModalFooter } from 'react-bootstrap'

type Caisse = {
  _id?: string
  motif?: string
  montant?: number | string
  type?: string
  date?: string | null
  commentaire?: string
  nomutilisatuer:string
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

export default function CaisseViewModal({ show, onHide, caisse }: { show: boolean; onHide: () => void; caisse: Caisse | null }) {
  if (!caisse) return null

  return (
    <Modal show={show} onHide={onHide}>
      <ModalHeader closeButton>
        <ModalTitle as="h5">Détails de la caisse</ModalTitle>
     
      </ModalHeader>
      <ModalBody>
        <Table borderless className="mb-0">
          <tbody>
            <tr>
              <th style={{ width: 160 }}>Ajouter Par : </th>
              <td>{caisse.nomutilisatuer.split('@')[0] || '-'}</td>
            </tr>
            <tr>
              <th style={{ width: 160 }}>Motif</th>
              <td>{caisse.motif || '-'}</td>
            </tr>
            <tr>
              <th>Montant</th>
              <td>{typeof caisse.montant === 'number' ? caisse.montant.toFixed(2) : caisse.montant || '-'} DT</td>
            </tr>
            <tr>
              <th>Type</th>
              <td>{caisse.type || '-'}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>{formatDateDDMMYYYY(caisse.date)}</td>
            </tr>
            <tr>
              <th>Commentaire</th>
              <td>{caisse.commentaire || '-'}</td>
            </tr>
          </tbody>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onHide}>
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  )
}
