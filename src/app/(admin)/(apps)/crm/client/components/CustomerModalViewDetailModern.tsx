'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Modal, Button, Container, Row, Col, Card, Badge, Accordion, Table, Alert } from 'react-bootstrap'
import { User, Phone, Calendar, Box, Package, Scale, Droplet, Percent, TrendingUp, Gauge, Calculator, Hash } from 'lucide-react'

type CustomerType = {
  _id: string
  nomPrenom: string
  numCIN: number
  commentaire: string
  numTelephone: number
  type: string
  dateCreation: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteOliveNet?: number
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
  nisbaReelle?: number
  quantiteHuileTheorique?: number
  differenceHuile?: number
  nombreWiba?: number
  nombreQfza?: number
  huileParQfza?: number
  prixFinal?: number
  prixKg?: number
  nomutilisatuer: string
}

type Props = { show: boolean; onHide: () => void; customer: CustomerType | null }

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatDate = (s: string) => {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}
const formatValue = (v?: number, unit = '', dec = 2) => (typeof v === 'number' ? `${v.toFixed(dec)}${unit}` : '-')
const format3 = (v?: number) => (typeof v === 'number' ? v.toFixed(3) : '0.000')
const getTypeBadgeVariant = (type: string) => {
  if (type === 'فلاح' || type === 'fallah') return 'success'
  if (type === 'كيال' || type === 'kayyel') return 'primary'
  return 'secondary'
}

function Kpi({ label, value, sub, icon }: any) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between">
          <div>
            <div className="text-body-secondary small">{label}</div>
            <div className="fw-bold fs-5">{value}</div>
            {sub ? <div className="text-body-secondary small">{sub}</div> : null}
          </div>
          <div className="rounded-3 border px-2 py-1 text-primary">{icon}</div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default function CustomerModalViewDetailModern({ show, onHide, customer }: Props) {
  const [techOpen, setTechOpen] = useState(false)

  useEffect(() => {
    if (show) setTechOpen(false)
  }, [show])

  const POIDS_CAISSE = 30
  const POIDS_WIBA = 27
  const WIBA_PAR_QFIZ = 16
  const masseVolumiqueHuile = 0.918

  const computed = useMemo(() => {
    if (!customer) return { oliveNet: 0, wiba: 0, qfza: 0, galba: '-', effic: 0 }
    const oliveNet =
      customer.quantiteOliveNet ?? Math.max(0, (customer.quantiteOlive ?? 0) - (customer.nombreCaisses ?? 0) * POIDS_CAISSE)
    const wiba = customer.nombreWiba ?? (oliveNet > 0 ? oliveNet / POIDS_WIBA : 0)
    const qfza = customer.nombreQfza ?? (wiba > 0 ? wiba / WIBA_PAR_QFIZ : 0)
    const huileKg = customer.quantiteHuile ?? 0
    const huileL = huileKg / masseVolumiqueHuile
    const totalGalba = huileL / 10
    const g = Math.floor(totalGalba)
    const r = (totalGalba - g).toFixed(1)
    const galba = `${g} GALBA (${r} فاصل)`
    const effic =
      customer.nisbaReelle && customer.nisba ? ((customer.nisbaReelle - customer.nisba) / customer.nisba) * 100 : 0
    return { oliveNet, wiba, qfza, galba, effic }
  }, [customer])

  if (!customer) return null

  const typeVariant = getTypeBadgeVariant(customer.type)
  const addedBy = customer.nomutilisatuer?.split('@')?.[0] || 'Non défini'

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="bg-body-tertiary border-bottom">
        <div className="w-100 d-flex flex-wrap justify-content-between gap-2">
          <div className="d-flex align-items-start gap-2">
            <div className="rounded-4 bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
              <User size={20} />
            </div>
            <div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="fw-bold fs-4">{customer.nomPrenom}</div>
                <Badge bg={typeVariant}>{customer.type}</Badge>
              </div>
              <div className="text-body-secondary small d-flex flex-wrap gap-3 mt-1">
                <span className="d-flex align-items-center gap-1"><Phone size={14} /> {customer.numTelephone}</span>
                <span className="d-flex align-items-center gap-1"><Hash size={14} /> CIN: {customer.numCIN}</span>
                <span className="d-flex align-items-center gap-1"><Calendar size={14} /> {formatDate(customer.dateCreation)}</span>
                <span className="d-flex align-items-center gap-1"><Box size={14} /> Ajouté par: {addedBy}</span>
              </div>
            </div>
          </div>
          <Badge bg="secondary">ID: {customer._id}</Badge>
        </div>
      </Modal.Header>

      <Modal.Body className="bg-body">
        <Container fluid>
          <Row className="g-3 mb-3">
            <Col md={6} lg={3}>
              <Kpi label="Olive brute" value={formatValue(customer.quantiteOlive, ' kg')} sub={`${customer.nombreCaisses ?? 0} caisses`} icon={<Package size={18} />} />
            </Col>
            <Col md={6} lg={3}>
              <Kpi label="Olive nette" value={formatValue(computed.oliveNet, ' kg')} sub="Après caisses" icon={<Scale size={18} />} />
            </Col>
            <Col md={6} lg={3}>
              <Kpi label="Huile" value={formatValue(customer.quantiteHuile, ' kg')} sub="Production" icon={<Droplet size={18} />} />
            </Col>
            <Col md={6} lg={3}>
              <Kpi label="Nisba" value={formatValue(customer.nisba, ' %')} sub={`GALBA: ${computed.galba}`} icon={<Percent size={18} />} />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={5}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="fw-semibold mb-2">Commentaire</div>
                  <div className="p-3 rounded border bg-body">{customer.commentaire || '-'}</div>
                  <div className="text-body-secondary small mt-2">
                    Wiba: <b>{formatValue(customer.nombreWiba ?? computed.wiba, '', 3)}</b> — Qfza: <b>{formatValue(customer.nombreQfza ?? computed.qfza, '', 3)}</b>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={7}>
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-warning" />
                    <div className="fw-semibold">Performance</div>
                  </div>

                  <Row className="g-2">
                    <Col md={4}>
                      <div className="p-3 border rounded text-center bg-body">
                        <div className="text-body-secondary small">النسبة الفعلية</div>
                        <div className="fw-bold fs-5">{formatValue(customer.nisbaReelle, '%')}</div>
                        <Badge bg={(customer.nisbaReelle ?? 0) > (customer.nisba ?? 0) ? 'success' : 'danger'} className="mt-2">
                          {formatValue(computed.effic, '%')}
                        </Badge>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="p-3 border rounded text-center bg-body">
                        <div className="text-body-secondary small">الزيت المتوقع</div>
                        <div className="fw-bold fs-5">{formatValue(customer.quantiteHuileTheorique, ' kg')}</div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="p-3 border rounded text-center bg-body">
                        <div className="text-body-secondary small">الفرق</div>
                        <div className={`fw-bold fs-5 ${(customer.differenceHuile ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {(customer.differenceHuile ?? 0) > 0 ? '+' : ''}
                          {formatValue(customer.differenceHuile, ' kg')}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="fw-semibold mb-2">Prix</div>
                  <Row className="g-2">
                    <Col md={6}>
                      <div className="p-3 border rounded bg-body">
                        <div className="text-body-secondary small">Prix par Kg</div>
                        <div className="fw-bold fs-5">{format3(customer.prixKg)}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 border rounded bg-body">
                        <div className="text-body-secondary small">Montant total (DT)</div>
                        <div className="fw-bold fs-5">{format3(customer.prixFinal)}</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Accordion activeKey={techOpen ? '0' : undefined}>
                <Accordion.Item eventKey="0">
                  <Accordion.Header onClick={() => setTechOpen((v) => !v)}>
                    <div className="d-flex align-items-center gap-2">
                      <Gauge size={18} className="text-secondary" />
                      <span className="fw-semibold">Détails techniques</span>
                      <Badge bg="secondary" className="ms-2">optionnel</Badge>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="bg-body">
                    <Table bordered size="sm" className="mb-0">
                      <tbody>
                        <tr><td className="fw-bold bg-body-tertiary">القطوع</td><td>{customer.kattou3 ?? '-'}</td></tr>
                        <tr><td className="fw-bold bg-body-tertiary">الزيت في كل قفيز</td><td>{customer.huileParQfza ?? '-'}</td></tr>
                        <tr><td className="fw-bold bg-body-tertiary">عدد الويبات</td><td>{formatValue(customer.nombreWiba ?? computed.wiba, '', 3)}</td></tr>
                        <tr><td className="fw-bold bg-body-tertiary">عدد القفزة</td><td>{formatValue(customer.nombreQfza ?? computed.qfza, '', 3)}</td></tr>
                      </tbody>
                    </Table>
                    <Alert variant="info" className="mt-3 mb-0">
                      هذه التفاصيل تقنية فقط — التلخيص موجود في الأعلى.
                    </Alert>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Col>
          </Row>
        </Container>
      </Modal.Body>

      <Modal.Footer className="bg-body-tertiary border-top">
        <Button variant="outline-secondary" onClick={onHide}>Fermer</Button>
        <Button variant="primary" disabled>Exporter</Button>
      </Modal.Footer>
    </Modal>
  )
}