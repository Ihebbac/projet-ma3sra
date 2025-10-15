import React, { useState } from 'react'
import { Modal, Button, Table, Container, Row, Col, Card, Collapse, Badge } from 'react-bootstrap'
import { User, Calendar, Phone, Hash, Box, Droplet, Percent, Gauge, ChevronDown, ChevronUp, Calculator, Scale, Package, TrendingUp, BarChart3 } from 'lucide-react'

// Définitions de types (ajustées pour inclure tous les champs de l'API)
type CustomerType = {
  _id: string
  nomPrenom: string
  numCIN: number
  numTelephone: number
  type: 'fallah' | 'kayyel' | string
  dateCreation: string // format YYYY-MM-DD
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteOliveNet?: number 
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
  
  // Champs supplémentaires de calculs (selon votre exemple JSON)
  nisbaReelle?: number
  quantiteHuileTheorique?: number
  differenceHuile?: number
  nombreWiba?: number
  nombreQfza?: number
  huileParQfza?: number
  prixFinal?: number;
  prixKg?: number
}

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  customer: CustomerType | null
}

// Fonction pour formater la date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

/**
 * Fonction pour arrondir les nombres à 2 décimales et ajouter l'unité.
 */
const formatValueAndRound = (value: number | undefined, unit: string = '', decimalPlaces: number = 2) => {
  if (value === undefined || value === null) {
    return '-'
  }
  return `${value.toFixed(decimalPlaces)}${unit}`
}

// Fonction pour déterminer la couleur du badge type
const getTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'فلاح': return 'success'
    case 'كيال': return 'primary'
    default: return 'secondary'
  }
}

const CustomerModalViewDetail = ({ show, onHide, customer }: CustomerModalProps) => {
  const format = (v: number) => (v > 0 ? v.toFixed(2) : '')
  console.log("customer",customer)

  if (!customer) return null
  
  const [showAdvanced, setShowAdvanced] = useState(false) 

  // Constantes pour les messages d'aide dans les calculs
  const POIDS_CAISSE = 30
  const POIDS_WIBA = 27
  const WIBA_PAR_QFIZ = 16

  // Pré-calculs
  const quantiteOliveNet = customer.quantiteOliveNet ?? Math.max(0, (customer.quantiteOlive ?? 0) - ((customer.nombreCaisses ?? 0) * POIDS_CAISSE))
  const nombreWiba = customer.nombreWiba ?? (quantiteOliveNet > 0 ? quantiteOliveNet / POIDS_WIBA : 0)
  const nombreQfza = customer.nombreQfza ?? (nombreWiba > 0 ? nombreWiba / WIBA_PAR_QFIZ : 0)

  // Calcul de l'efficacité
  const efficacite = customer.nisbaReelle && customer.nisba ? 
    ((customer.nisbaReelle - customer.nisba) / customer.nisba * 100) : 0

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="customer-detail-modal">
      <Modal.Header closeButton className="bg-light border-bottom">
        <Modal.Title className="d-flex align-items-center">
          <User className="me-2 text-primary" size={24} />
          <div>
            <div className="fw-bold fs-4">{customer.nomPrenom}</div>
            <div className="text-muted fs-6">Détails du client</div>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        <Container fluid className="py-3">
          
          {/* Section 1: Informations du Client */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className=" border-bottom">
              <h5 className="mb-0 d-flex align-items-center">
                <User className="bg-whiteme-2 text-primary" size={20} />
                Informations Personnelles
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6} lg={4}>
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="bg-primary rounded-circle p-2 me-3">
                      <User size={16} className="text-white" />
                    </div>
                    <div>
                      <small className="text-muted d-block">Nom & Prénom</small>
                      <strong className="text-dark">{customer.nomPrenom}</strong>
                    </div>
                  </div>
                </Col>
{/*                 
                <Col md={6} lg={4}>
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="bg-success rounded-circle p-2 me-3">
                      <Hash size={16} className="text-white" />
                    </div>
                    <div>
                      <small className="text-muted d-block">CIN</small>
                      <strong className="text-dark">{customer.numCIN}</strong>
                    </div>
                  </div>
                </Col>
                 */}
                <Col md={6} lg={4}>
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="bg-info rounded-circle p-2 me-3">
                      <Phone size={16} className="text-white" />
                    </div>
                    <div>
                      <small className="text-muted d-block">Téléphone</small>
                      <strong className="text-dark">{customer.numTelephone}</strong>
                    </div>
                  </div>
                </Col>
                
                <Col md={6} lg={4}>
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="bg-warning rounded-circle p-2 me-3">
                      <Box size={16} className="text-white" />
                    </div>
                    <div>
                      <small className="text-muted d-block">Type</small>
                      <Badge bg={getTypeBadgeVariant(customer.type)} className="fs-6">
                        {customer.type}
                      </Badge>
                    </div>
                  </div>
                </Col>
                
                <Col md={6} lg={4}>
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="bg-secondary rounded-circle p-2 me-3">
                      <Calendar size={16} className="text-white" />
                    </div>
                    <div>
                      <small className="text-muted d-block">Date de Création</small>
                      <strong className="text-dark">{formatDate(customer.dateCreation)}</strong>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Section 2: Métriques Principales */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className=" border-bottom">
              <h5 className="mb-0 d-flex align-items-center">
                <BarChart3 className="me-2 text-success" size={20} />
                Métriques de Production
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                {/* Olive Brute et Caisses */}
                <Col md={6} lg={3}>
                  <Card className="border-start border-start-4 border-start-warning h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <Package className="text-warning me-3" size={24} />
                        <div>
                          <small className="text-muted d-block">Olive Brute</small>
                          <h4 className="mb-0">{formatValueAndRound(customer.quantiteOlive, ' kg')}</h4>
                          <small className="text-muted">
                            {customer.nombreCaisses ?? 0} caisses
                          </small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Olive Nette */}
                <Col md={6} lg={3}>
                  <Card className="border-start border-start-4 border-start-success h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <Scale className="text-success me-3" size={24} />
                        <div>
                          <small className="text-muted d-block">Olive Nette</small>
                          <h4 className="mb-0">{formatValueAndRound(quantiteOliveNet, ' kg')}</h4>
                          <small className="text-muted">
                            Net après caisses
                          </small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Huile Produite */}
                <Col md={6} lg={3}>
                  <Card className="border-start border-start-4 border-start-info h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <Droplet className="text-info me-3" size={24} />
                        <div>
                          <small className="text-muted d-block">Huile Produite</small>
                          <h4 className="mb-0">{formatValueAndRound(customer.quantiteHuile, ' kg')}</h4>
                          <small className="text-muted">
                            Production totale
                          </small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Nisba */}
                <Col md={6} lg={3}>
                  <Card className="border-start border-start-4 border-start-primary h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <Percent className="text-primary me-3" size={24} />
                        <div>
                          <small className="text-muted d-block">Nisba</small>
                          <h4 className="mb-0">{formatValueAndRound(customer.nisba, ' %')}</h4>
                          <small className="text-muted">
                            Rendement
                          </small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Section 3: Indicateurs de Performance */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className=" border-bottom">
              <h5 className="mb-0 d-flex align-items-center">
                <TrendingUp className="me-2 text-warning" size={20} />
                Performance du Rendement
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <div className="text-center p-3 border rounded">
                    <div className="fs-5 fw-bold text-primary">
                      {formatValueAndRound(customer.nisbaReelle, '%')}
                    </div>
                    <small className="text-muted">النسبة الفعلية</small>
                    <div className="mt-2">
                      <Badge bg={customer.nisbaReelle && customer.nisba && customer.nisbaReelle > customer.nisba ? 'success' : 'danger'}>
                        {customer.nisbaReelle && customer.nisba && customer.nisbaReelle > customer.nisba ? '+ ' : ''}
                        {formatValueAndRound(efficacite, '%')}
                      </Badge>
                    </div>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="text-center p-3 border rounded">
                    <div className="fs-5 fw-bold text-success">
                      {formatValueAndRound(customer.quantiteHuileTheorique, ' kg')}
                    </div>
                    <small className="text-muted">الزيت المتوقع</small>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="text-center p-3 border rounded">
                    <div className={`fs-5 fw-bold ${customer.differenceHuile && customer.differenceHuile > 0 ? 'text-success' : 'text-danger'}`}>
                      {customer.differenceHuile && customer.differenceHuile > 0 ? '+' : ''}
                      {formatValueAndRound(customer.differenceHuile, ' kg')}
                    </div>
                    <small className="text-muted">الفرق</small>
                  </div>
                </Col>
              </Row>
              <Row>
              <Col md={4}>
                  <div className="text-center p-3 border rounded">
                    <div className={`fs-5 fw-bold ${customer.prixKg && customer.prixKg > 0 ? 'text-success' : 'text-danger'}`}>
                      {customer.prixKg && customer.prixKg > 0 ? '+' : ''}
                      {format(customer.prixKg  )}
                    </div>
                    <small className="text-muted">Prix par Kg</small>
                  </div>
                </Col>
              <Col md={4}>
                  <div className="text-center p-3 border rounded">
                    <div className={`fs-5 fw-bold ${customer.prixFinal && customer.prixFinal > 0 ? 'text-success' : 'text-danger'}`}>
                      {customer.prixFinal && customer.prixFinal > 0 ? '+' : ''}
                      {format(customer.prixFinal)}
                    </div>
                    <small className="text-muted">Montant totale en Dinar</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Bouton Voir Plus / Voir Moins */}
          <div className="text-center mb-4">
            <Button 
              variant="outline-primary" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="d-inline-flex align-items-center"
            >
              <Calculator size={16} className="me-2" />
              {showAdvanced ? 'Masquer les détails techniques' : 'Afficher les détails techniques'}
              {showAdvanced ? <ChevronUp size={16} className="ms-2" /> : <ChevronDown size={16} className="ms-2" />}
            </Button>
          </div>

          {/* Section 4: Détails Techniques (Affichage conditionnel) */}
          <Collapse in={showAdvanced}>
            <div>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light border-bottom">
                  <h5 className="mb-0 d-flex align-items-center">
                    <Gauge className="me-2 text-secondary" size={20} />
                    Détails Techniques des Calculs
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Table bordered size="sm" className="mb-0">
                        <tbody>
                          <tr>
                            <td className="fw-bold bg-light" style={{width: '60%'}}> القطوع</td>
                            <td>{formatValueAndRound(customer.kattou3)}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold bg-light"> الزيت  في كل قفيز </td>
                            <td>{formatValueAndRound(customer.huileParQfza, ' L/Qfiz')}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold bg-light">عدد الويبات الجملي</td>
                            <td>{formatValueAndRound(customer.nombreWiba, '', 3)}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <Table bordered size="sm" className="mb-0">
                        <tbody>
                          <tr>
                            <td className="fw-bold bg-light" style={{width: '60%'}}>عدد القفزة</td>
                            <td>{formatValueAndRound(customer.nombreQfza, '', 3)}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold bg-light">وزن القاجو</td>
                            <td>{POIDS_CAISSE} kg</td>
                          </tr>
                          <tr>
                            <td className="fw-bold bg-light">وزن الويبة</td>
                            <td>{POIDS_WIBA} kg</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          </Collapse>
          
        </Container>
      </Modal.Body>

      <Modal.Footer className="bg-light border-top">
        <Button variant="outline-secondary" onClick={onHide}>
          Fermer
        </Button>
        <Button variant="primary">
          Exporter les Données
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default CustomerModalViewDetail