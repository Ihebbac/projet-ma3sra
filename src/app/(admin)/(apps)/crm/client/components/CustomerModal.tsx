import React from "react";
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
} from "react-bootstrap";
import Flatpickr from 'react-flatpickr'

type CustomerModalProps = {
    show: boolean;
    onHide: () => void;
};

const CustomerModal = ({ show, onHide }: CustomerModalProps) => {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Ajouter un nouveau client</ModalTitle>
            </ModalHeader>

            <Form id="addCustomerForm">
                <ModalBody>
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup controlId="customerName">
                                <FormLabel>Nom et prénom</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Nom et prénom"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="email">
                                <FormLabel>Num CIN</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Carte d'identité national"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="phone">
                                <FormLabel>Num Tél</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="exp : 96 458 362"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        {/* <Col md={6}>
                            <FormGroup controlId="company">
                                <FormLabel>Company</FormLabel>
                                <FormControl type="text" placeholder="Company name" />
                            </FormGroup>
                        </Col> */}

                        <Col md={6}>
                            <FormGroup controlId="country">
                                <FormLabel>Type</FormLabel>
                                <FormSelect required defaultValue="فلاح">
                                    <option value="">Type</option>
                                    <option value="US">فلاح</option>
                                    <option value="UK">كيال</option>
                                    
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        {/* <Col md={6}>
                            <FormGroup controlId="customerType">
                                <FormLabel>Customer Type</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select type</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Prospect">Prospect</option>
                                    <option value="Client">Client</option>
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="accountStatus">
                                <FormLabel>Account Status</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select status</option>
                                    <option value="Active">Active</option>
                                    <option value="Verification Pending">Verification Pending</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Blocked">Blocked</option>
                                </FormSelect>
                            </FormGroup>
                        </Col> */}

                        <Col md={6}>
                            <FormGroup controlId="joinedDate">
                                <FormLabel>Date si besoin</FormLabel>
                               <Flatpickr className="form-control" required options={{ dateFormat: "d M Y" }}/>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Ajouter
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default CustomerModal;
