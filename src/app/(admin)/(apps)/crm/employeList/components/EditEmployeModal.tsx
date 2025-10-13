'use client'
import React, { useState, useEffect } from "react";
import { Modal, Button, Row, Col, Form, FormGroup, FormLabel, FormControl, Table } from "react-bootstrap";

type EditEmployeModalProps = {
  show: boolean;
  onHide: () => void;
  employe: any;
  onSubmit: (data: any) => void;
};

const joursSemaine = [
  { id: 'lundi', nom: 'Lundi', index: 1 },
  { id: 'mardi', nom: 'Mardi', index: 2 },
  { id: 'mercredi', nom: 'Mercredi', index: 3 },
  { id: 'jeudi', nom: 'Jeudi', index: 4 },
  { id: 'vendredi', nom: 'Vendredi', index: 5 },
  { id: 'samedi', nom: 'Samedi', index: 6 },
  { id: 'dimanche', nom: 'Dimanche', index: 0 }
];

const EditEmployeModal = ({ show, onHide, employe, onSubmit }: EditEmployeModalProps) => {
  const [form, setForm] = useState(employe);
  const [moisSelectionne, setMoisSelectionne] = useState<string>('');
  const [joursTravaillesManuels, setJoursTravaillesManuels] = useState<string[]>([]);

  useEffect(() => {
    setForm(employe);
    const aujourdHui = new Date();
    setMoisSelectionne(`${aujourdHui.getFullYear()}-${(aujourdHui.getMonth() + 1).toString().padStart(2, '0')}`);
  }, [employe]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "montantJournalier" ? parseFloat(value) : value }));
  };

  const ajouterDateSpecifique = () => {
    const dateInput = document.getElementById('dateSpecifique') as HTMLInputElement;
    const dateValue = dateInput?.value;

    if (dateValue) {
      const nouvelleDate = new Date(dateValue + 'T00:00:00').toISOString();
      const datesExistantes = form.joursTravailles || [];

      if (!datesExistantes.includes(nouvelleDate)) {
        setForm(prev => ({
          ...prev,
          joursTravailles: [...datesExistantes, nouvelleDate]
        }));
      }
      dateInput.value = '';
    }
  };

  const toggleJourManuel = (dateISO: string) => {
    setJoursTravaillesManuels(prev =>
      prev.includes(dateISO)
        ? prev.filter(d => d !== dateISO)
        : [...prev, dateISO]
    );
  };

  const ajouterJoursManuels = () => {
    if (joursTravaillesManuels.length === 0) return;
    const datesExistantes = form.joursTravailles || [];
    const nouvellesDates = [...datesExistantes];

    joursTravaillesManuels.forEach(dateISO => {
      if (!nouvellesDates.includes(dateISO)) {
        nouvellesDates.push(dateISO);
      }
    });

    setForm(prev => ({ ...prev, joursTravailles: nouvellesDates }));
    setJoursTravaillesManuels([]);
  };

  const supprimerDate = (index: number) => {
    const nouvellesDates = form.joursTravailles.filter((_: any, i: number) => i !== index);
    setForm(prev => ({ ...prev, joursTravailles: nouvellesDates }));
  };
  const payerFunction = async (index: number) => {
    const datePayee = form.joursTravailles[index];
  
    try {
      const res = await fetch(`http://localhost:8170/employes/${form._id}/payer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: datePayee })
      });
  
      if (res.ok) {
        // Mise à jour locale si succès
        setForm(prev => ({
          ...prev,
          joursPayes: [...prev.joursPayes, datePayee]
        }));
      } else {
        console.error("Erreur HTTP :", res.status);
        alert("Erreur lors de la mise à jour du paiement !");
      }
    } catch (error) {
      console.error("Erreur lors du paiement :", error);
      alert("Erreur de connexion !");
    }
  };
  const getJoursDuMois = () => {
    if (!moisSelectionne) return [];
    const [annee, mois] = moisSelectionne.split('-').map(Number);
    const dernierJour = new Date(annee, mois, 0);
    const jours = [];

    for (let jour = 1; jour <= dernierJour.getDate(); jour++) {
      const date = new Date(annee, mois - 1, jour);
      jours.push(date);
    }
    return jours;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onHide();
  };

  if (!form) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier un employé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>Nom</FormLabel>
                <FormControl name="nom" value={form.nom} onChange={handleChange} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Prénom</FormLabel>
                <FormControl name="prenom" value={form.prenom} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Téléphone</FormLabel>
                <FormControl name="numTel" value={form.numTel} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Poste</FormLabel>
                <FormControl name="poste" value={form.poste} onChange={handleChange} required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Salaire Journalier (DT)</FormLabel>
                <FormControl
                  name="montantJournalier"
                  type="number"
                  value={form.montantJournalier}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
            </Col>

            <Col xs={12}>
              <hr />
              <h6>Jours de travail</h6>

              <Row className="mb-3">
                <Col md={6}>
                  <FormLabel>Mois :</FormLabel>
                  <FormControl
                    type="month"
                    value={moisSelectionne}
                    onChange={(e) => setMoisSelectionne(e.target.value)}
                  />
                </Col>
              </Row>

              {moisSelectionne && (
  <Row className="mb-3">
    <Col xs={12}>
      <FormLabel>Sélectionner manuellement les jours travaillés :</FormLabel>
      <div className="d-flex flex-wrap gap-1">
        {getJoursDuMois().map((date, index) => {
          const dateISO = date.toISOString();

          // Vérifie si la date fait déjà partie des jours travaillés
          const estTravaille = form.joursTravailles?.includes(dateISO);
          const estSelectionne = joursTravaillesManuels.includes(dateISO);

          return (
            <div
              key={index}
              onClick={() => !estTravaille && toggleJourManuel(dateISO)} // si déjà travaillé => non cliquable
              className={`p-2 border rounded text-center ${
                estTravaille
                  ? "bg-success text-white"
                  : estSelectionne
                  ? "bg-primary text-white"
                  : "bg-light"
              }`}
              style={{
                width: "40px",
                fontSize: "0.8rem",
                cursor: estTravaille ? "not-allowed" : "pointer",
                opacity: estTravaille ? 0.6 : 1,
              }}
              title={`${date.toLocaleDateString("fr-FR")} ${
                estTravaille ? "(déjà travaillé)" : ""
              }`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline-primary"
        size="sm"
        className="mt-2"
        onClick={ajouterJoursManuels}
        disabled={joursTravaillesManuels.length === 0}
      >
        Ajouter les jours sélectionnés
      </Button>
    </Col>
  </Row>
)}


              <Row className="mb-3">
                <Col xs={12}>
                  <FormLabel>Ajouter une date spécifique :</FormLabel>
                  <div className="d-flex gap-2">
                    <FormControl id="dateSpecifique" type="date" style={{ maxWidth: '200px' }} />
                    <Button variant="outline-secondary" size="sm" onClick={ajouterDateSpecifique}>
                      Ajouter
                    </Button>
                  </div>
                </Col>
              </Row>

              <Row>
                <Col xs={12}>
                  <FormLabel>Jours travaillés enregistrés :</FormLabel>
                  {form.joursTravailles && form.joursTravailles.length > 0 ? (
                    <Table striped bordered size="sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Jour</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.joursTravailles.map((dateStr: string, index: number) => {
                          const date = new Date(dateStr);
                          const jourSemaine = joursSemaine.find(j => j.index === date.getDay());
                          const estPaye = form.joursPayes.includes(dateStr);
                          return (
                            <tr key={index}>
                              <td>
                                {date.getDate().toString().padStart(2, '0')}/
                                {(date.getMonth() + 1).toString().padStart(2, '0')}/
                                {date.getFullYear()}
                              </td>
                              <td>{jourSemaine?.nom}</td>
                              <td>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => supprimerDate(index)}
                                  disabled={estPaye}
                                >
                                  Supprimer
                                </Button>
                              
                           
                                <Button
                                  variant={estPaye ? "success" : "outline-success"}
                                  size="sm"
                                  onClick={() => payerFunction(index)}
                                  disabled={estPaye}
                                >
                                  {estPaye ? "Payé" : "Payer"}
                                </Button>
                                </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted">Aucun jour travaillé enregistré</p>
                  )}
                </Col>
              </Row>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Annuler</Button>
          <Button type="submit" variant="primary">Enregistrer</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditEmployeModal;
