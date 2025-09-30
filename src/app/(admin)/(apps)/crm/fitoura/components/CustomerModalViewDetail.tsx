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
    name: string;
    email: string;
    avatar: string;
    phone: string;
    country: string;
    countryLabel: string;
    countryFlag: string;
    joined: string;
    type: string;
    company: string;
    status: string;
};

type CustomerModalProps = {
    show: boolean;
    onHide: () => void;
    customer: CustomerType | null;
};

const CustomerModalViewDetail = ({ show, onHide, customer }: CustomerModalProps) => {
    if (!customer) return null; // nothing if no customer selected

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <ModalHeader closeButton>
                <ModalTitle as="h5">Customer Details</ModalTitle>
            </ModalHeader>

            <ModalBody>
                <Row className="g-4">
                    <Col md={3} className="text-center">
                        <Image
                            src={customer.avatar}
                            alt={customer.name}
                            roundedCircle
                            width={100}
                            height={100}
                        />
                        <h5 className="mt-3">{customer.name}</h5>
                        <span className="badge bg-info">{customer.type}</span>
                    </Col>

                    <Col md={9}>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Email:</strong></Col>
                            <Col sm={8}>{customer.email}</Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Phone:</strong></Col>
                            <Col sm={8}>{customer.phone}</Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Company:</strong></Col>
                            <Col sm={8}>{customer.company}</Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Country:</strong></Col>
                            <Col sm={8}>
                                <img src={customer.countryFlag} alt={customer.countryLabel} width={20} className="me-2"/>
                                {customer.countryLabel}
                            </Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Status:</strong></Col>
                            <Col sm={8}><span className="badge bg-warning">{customer.status}</span></Col>
                        </Row>
                        <Row className="mb-2">
                            <Col sm={4}><strong>Joined:</strong></Col>
                            <Col sm={8}>{customer.joined}</Col>
                        </Row>
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
