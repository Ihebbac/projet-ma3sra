import React from "react";
import {
    Modal,
    Button,
    Row,
    Col,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
    Image,
} from "react-bootstrap";

type CustomerType = {
    id: string;
    numCin: string;
    nomPrenom: string;
    numTelephone: string;
    dateCreation: string; // format YYYY-MM-DD
    type: 'fallah' | 'kayyel';
};

type CustomerModalProps = {
    show: boolean;
    onHide: () => void;
    customer: CustomerType | null;
};

const CustomerModalViewDetail = ({ show, onHide, customer }: CustomerModalProps) => {
    if (!customer) return null; // nothing if no customer selected
console.log("custmer", customer)
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <ModalHeader closeButton>
                <ModalTitle as="h5">Détail client</ModalTitle>
            </ModalHeader>

            <ModalBody>
                <Row className="g-4">
                    <Col md={3} className="text-center">
                        {/* <Image
                            src={customer.avatar.src}
                            alt={customer.name}
                            roundedCircle
                            width={100}
                            height={100}
                        /> */}
                        <h5 className="mt-3">{customer.nomPrenom}</h5>
                        <span className="badge bg-info">{customer.type}</span>
                    </Col>

                    <Col md={9}>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Nom et prénom:</strong></Col>
                            <Col sm={8}>{customer.nomPrenom}</Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Phone:</strong></Col>
                            <Col sm={8}>{customer.numTelephone}</Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>CIN:</strong></Col>
                            <Col sm={8}>{customer.numCin}</Col>
                        </Row>
                        {/* <Row className="mb-2">
                            <Col sm={4}><strong>Country:</strong></Col>
                            <Col sm={8}>
                                <img src={customer.countryFlag} alt={customer.countryLabel} width={20} className="me-2"/>
                                {customer.countryLabel}
                            </Col>
                        </Row> */}
                        <Row className="mb-2">
                            <Col sm={4}><strong>date:</strong></Col>
                            <Col sm={8}><span className="badge bg-warning">{customer.dateCreation}</span></Col>
                        </Row>
                        {/* <Row className="mb-2">
                            <Col sm={4}><strong>Joined:</strong></Col>
                            <Col sm={8}>{customer.joined}</Col>
                        </Row> */}
                    </Col>
                </Row>
            </ModalBody>

            <ModalFooter>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CustomerModalViewDetail;
