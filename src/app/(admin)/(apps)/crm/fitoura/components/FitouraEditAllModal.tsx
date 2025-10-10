'use client'

import React, { useState, useEffect } from "react";
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl } from "react-bootstrap";

type FitouraEditModalProps = {
  show: boolean;
  onHide: () => void;
  fitouraData: any; // données à modifier
  onUpdated: () => void; // callback pour refresh
};

const FitouraEditAllModal = ({ show, onHide, operation, onUpdated }: FitouraEditModalProps) => {
  const [form, setForm] = useState({
    matriculeCamion: "",
    chauffeur: "",
    poidsEntree: null,
    poidsSortie: null,
    prixUnitaire: null,
    status: "",
    dateSortie: "",
  });

  useEffect(() => {
    if (operation) {
      setForm({
        matriculeCamion: operation.matriculeCamion || "",
        chauffeur: operation.chauffeur || "",
        poidsEntree: operation.poidsEntree || null,
        poidsSortie: operation.poidsSortie || null,
        prixUnitaire: operation.prixUnitaire || null,
        status: operation.status || "EN_COURS",
        dateSortie: operation.dateSortie ? operation.dateSortie.split("T")[0] : "",
      });
    }
  }, [operation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes("poids") || name.includes("prix") ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        console.log("operation._id",operation._id)
      const res = await fetch(`http://localhost:8170/fitoura/modifier/${operation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        // onUpdated();
        onHide();
      } else {
        console.error("Erreur lors de la mise à jour de la Fitoura");
      }
    } catch (err) {
      console.error("Erreur réseau :", err);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier l’opération Fitoura</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Matricule Camion</FormLabel>
                <FormControl
                  name="matriculeCamion"
                  value={form.matriculeCamion}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Chauffeur</FormLabel>
                <FormControl
                  name="chauffeur"
                  value={form.chauffeur}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Poids Entrée (kg)</FormLabel>
                <FormControl
                  name="poidsEntree"
                  type="number"
                  value={form.poidsEntree}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>
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
            <Col md={6}>
              <FormGroup>
                <FormLabel>Prix Unitaire (DT/kg)</FormLabel>
                <FormControl
                  name="prixUnitaire"
                  type="number"
                  value={form.prixUnitaire}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Status</FormLabel>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="EN_COURS">EN_COURS</option>
                  <option value="TERMINE">TERMINE</option>
                </Form.Select>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Date Sortie</FormLabel>
                <FormControl
                  type="date"
                  name="dateSortie"
                  value={form.dateSortie}
                  onChange={handleChange}
                />
              </FormGroup>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Mettre à jour
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default FitouraEditAllModal;
