import React from 'react'
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  ModalHeader,
  ModalTitle,
  ModalBody,
  FormGroup,
  FormLabel,
  FormControl,
  FormSelect,
  ModalFooter,
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

type Customer = {
  id: string;
  numCin: string;
  nomPrenom: string;
  numTelephone: string;
  dateCreation: string; // format YYYY-MM-DD
  type: 'fallah' | 'kayyel';
}

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  customer: Customer
}

const CustomerEditModal = ({ show, onHide, customer }: CustomerModalProps) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Modifier un client</ModalTitle>
      </ModalHeader>

      <Form id="editCustomerForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="customerName">
                <FormLabel>Nom et prénom</FormLabel>
                <FormControl type="text" placeholder="Nom et prénom" defaultValue={customer?.nomPrenom} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="cin">
                <FormLabel>Num CIN</FormLabel>
                <FormControl type="number" placeholder="Carte d'identité nationale" defaultValue={customer?.numCin} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="phone">
                <FormLabel>Num Tél</FormLabel>
                <FormControl type="text" placeholder="exp : 96 458 362" defaultValue={customer?.numTelephone} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="type">
                <FormLabel>Type</FormLabel>
                <FormSelect required defaultValue={customer?.type || ''}>
                  <option value="">Type</option>
                  <option value="فلاح">فلاح</option>
                  <option value="كيال">كيال</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="joinedDate">
                <FormLabel>Date si besoin</FormLabel>
                <Flatpickr className="form-control" options={{ dateFormat: 'd M Y' }} defaultValue={customer?.dateCreation} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Modifier
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CustomerEditModal
