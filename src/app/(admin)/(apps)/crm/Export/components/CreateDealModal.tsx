'use client'
import { Button, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

const CreateDealModal = ({ show, toggleModal }: { show: boolean; toggleModal: () => void }) => {
  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Create New Deal</ModalTitle>
      </ModalHeader>

      <Form id="createDealForm">
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
            <FormGroup controlId="stage">
                <FormLabel> client</FormLabel>
                <FormSelect required>
                  <option value="">Choisir nom client</option>
                  <option value="Qualification">salah ben ali</option>
                  <option value="Proposal Sent">youssef salhi</option>
                  <option value="Negotiation">xyz</option>
                  <option value="Won">rty</option>
                  <option value="Lost">qsd</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="companyName">
                <FormLabel>caisses plastiques utilisées</FormLabel>
                <FormControl type="text" placeholder="Quantité de caisses plastiques utilisées" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="amount">
                <FormLabel>Amount (USD)</FormLabel>
                <Form.Control type="number" placeholder="e.g. 100000" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="stage">
                <FormLabel>Stage</FormLabel>
                <FormSelect required>
                  <option value="">Select stage</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="probability">
                <FormLabel>Probability (%)</FormLabel>
                <Form.Control type="number" min={0} max={100} placeholder="e.g. 75" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="closingDate">
                <FormLabel>Expected Closing Date</FormLabel>
                <Flatpickr className="form-control" required />
              </FormGroup>
            </Col>
          </Row>
        </Modal.Body>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save Deal
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CreateDealModal
