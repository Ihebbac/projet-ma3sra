import React from "react";
import { Modal, Button, Table } from "react-bootstrap";

type FitouraDetailModalProps = {
    show: boolean;
    onHide: () => void;
    operation: any;
};

const FitouraDetailModal = ({ show, onHide, operation }: FitouraDetailModalProps) => {
    if (!operation) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Fitoura Operation Detail</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Table bordered>
                    <tbody>
                        <tr>
                            <th>Matricule Camion</th>
                            <td>{operation.matriculeCamion}</td>
                        </tr>
                        <tr>
                            <th>Chauffeur</th>
                            <td>{operation.chauffeur}</td>
                        </tr>
                        <tr>
                            <th>Poids Entrée (kg)</th>
                            <td>{operation.poidsEntree}</td>
                        </tr>
                        <tr>
                            <th>Poids Sortie (kg)</th>
                            <td>{operation.poidsSortie ?? "-"}</td>
                        </tr>
                        <tr>
                            <th>Poids Net (kg)</th>
                            <td>{operation.poidsNet ?? "-"}</td>
                        </tr>
                        <tr>
                            <th>Prix Unitaire (DT/kg)</th>
                            <td>{operation.prixUnitaire}</td>
                        </tr>
                        <tr>
                            <th>Montant Total (DT)</th>
                            <td>{operation.montantTotal ?? "-"}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td>{operation.status}</td>
                        </tr>
                        <tr>
                            <th>Date Sortie</th>
                            <td>{operation.dateSortie ? new Date(operation.dateSortie).toLocaleString() : "-"}</td>
                        </tr>
                    </tbody>
                </Table>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="light" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default FitouraDetailModal;
