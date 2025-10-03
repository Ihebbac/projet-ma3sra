import React from 'react'
import { Modal, Button, Table } from 'react-bootstrap'

type CustomerType = {
  _id: string
  nomPrenom: string
  numCIN: number
  numTelephone: number
  type: 'fallah' | 'kayyel' | string
  dateCreation: string // format YYYY-MM-DD
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
}

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  customer: CustomerType | null
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

const CustomerModalViewDetail = ({ show, onHide, customer }: CustomerModalProps) => {
  if (!customer) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Détail client</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Table bordered hover responsive>
          <tbody>
            <tr>
              <th>Nom & Prénom</th>
              <td>{customer.nomPrenom}</td>
            </tr>
            <tr>
              <th>Téléphone</th>
              <td>{customer.numTelephone}</td>
            </tr>
            <tr>
              <th>CIN</th>
              <td>{customer.numCIN}</td>
            </tr>
            <tr>
              <th>Type</th>
              <td>{customer.type}</td>
            </tr>
            <tr>
              <th>Date de création</th>
              <td>{formatDate(customer.dateCreation)}</td>
            </tr>
            <tr>
              <th>Nombre Caisses</th>
              <td>{customer.nombreCaisses ?? '-'}</td>
            </tr>
            <tr>
              <th>Quantité Olive</th>
              <td>{customer.quantiteOlive ?? '-'}</td>
            </tr>
            <tr>
              <th>Quantité Huile</th>
              <td>{customer.quantiteHuile ?? '-'}</td>
            </tr>
            <tr>
              <th>Kattou3</th>
              <td>{customer.kattou3 ?? '-'}</td>
            </tr>
            <tr>
              <th>Nisba</th>
              <td>{customer.nisba ?? '-'}</td>
            </tr>
          </tbody>
        </Table>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default CustomerModalViewDetail
