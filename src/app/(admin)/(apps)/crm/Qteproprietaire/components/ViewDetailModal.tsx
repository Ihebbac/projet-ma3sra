'use client'
import { Button, Col, Modal, ModalFooter, ModalHeader, ModalTitle, Row, Table } from 'react-bootstrap'

interface ViewDetailModalProps {
  show: boolean;
  toggleModal: () => void;
  data: CustomerType;
}

const ViewDetailModal = ({ show, toggleModal, data }: ViewDetailModalProps) => {
  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Détails du Propriétaire</ModalTitle>
      </ModalHeader>

      <Modal.Body>
        <Table striped bordered responsive>
          <tbody>
            <tr>
              <td className="fw-semibold" style={{ width: '30%' }}>Propriétaire</td>
              <td>{data.nomPrenom}</td>
            </tr>
            <tr>
              <td className="fw-semibold">Nombre de caisses</td>
              <td>{data.nombreCaisses || 0}</td>
            </tr>
            <tr>
              <td className="fw-semibold">Quantité Olive (kg)</td>
              <td>{data.quantiteOlive || 0} kg</td>
            </tr>
            <tr>
              <td className="fw-semibold">Quantité Huile (L)</td>
              <td>{data.quantiteHuile || 0} L</td>
            </tr>
            <tr>
              <td className="fw-semibold">Kattou3</td>
              <td>{(data.kattou3).toFixed(2) || 0} %</td>
            </tr>
            <tr>
              <td className="fw-semibold">Nisba</td>
              <td>{(data.nisba).toFixed(2) || 0} %</td>
            </tr>
            <tr>
              <td className="fw-semibold">Date création</td>
              <td>{new Date(data.dateCreation).toLocaleDateString('fr-FR')}</td>
            </tr>
            {data.numCIN && (
              <tr>
                <td className="fw-semibold">Numéro CIN</td>
                <td>{data.numCIN}</td>
              </tr>
            )}
            {data.numTelephone && (
              <tr>
                <td className="fw-semibold">Téléphone</td>
                <td>{data.numTelephone}</td>
              </tr>
            )}
            {data.type && (
              <tr>
                <td className="fw-semibold">Type</td>
                <td>{data.type}</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Modal.Body>

      <ModalFooter>
        <Button variant="primary" onClick={toggleModal}>
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default ViewDetailModal