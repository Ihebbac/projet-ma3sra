import React, { useState, useEffect } from "react";
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from "react-bootstrap";

type FitouraEditModalProps = {
    show: boolean;
    onHide: () => void;
    operation: any;
    onSubmit: (id: string, data: any) => void;
};

const FitouraEditModal = ({ show, onHide, operation, onSubmit }: FitouraEditModalProps) => {
    const [form, setForm] = useState({
        poidsSortie: 0
    });

    useEffect(() => {
        if (operation) setForm({ poidsSortie: operation.poidsSortie || 0 });
    }, [operation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: parseFloat(value) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (operation?._id) {
            onSubmit(operation._id, form);
        }
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Fitoura Operation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup>
                                <FormLabel>Poids Sortie (kg)</FormLabel>
                                <FormControl
                                    name="poidsSortie"
                                    type="number"
                                    value={form.poidsSortie}
                                    onChange={handleChange}
                                    required
                                />
                            </FormGroup>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={onHide}>Cancel</Button>
                    <Button type="submit" variant="primary">Update Operation</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default FitouraEditModal;
