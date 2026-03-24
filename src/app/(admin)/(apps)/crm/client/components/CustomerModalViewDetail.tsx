'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Modal, Button, Table, Container, Row, Col, Card, Badge, Accordion, Alert, Form } from 'react-bootstrap'
import { User, Calendar, Phone, Box, Droplet, Percent, Gauge, Calculator, Scale, Package, TrendingUp, BarChart3, Hash } from 'lucide-react'
import QRCode from 'qrcode'

type CustomerType = {
  _id: string
  nomPrenom: string
  numCIN: number
  commentaire: string
  numTelephone: number
  type: 'fallah' | 'kayyel' | string
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
  status?: 'payé' | 'non payé'
  publicTrackingToken?: string
  trackingEnabled?: boolean
}

type CustomerModalProps = {
  show: boolean
  onHide: () => void
  customer: CustomerType | null
  onPrintQr?: (customer: CustomerType) => void
  getPublicTrackingUrl?: (customer: CustomerType) => string
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}

const formatValueAndRound = (value: number | undefined, unit: string = '', decimalPlaces: number = 2) => {
  if (value === undefined || value === null) return '-'
  return `${value.toFixed(decimalPlaces)}${unit}`
}

const getTypeBadgeVariant = (type: string) => {
  if (type === 'فلاح' || type === 'fallah') return 'success'
  if (type === 'كيال' || type === 'kayyel') return 'primary'
  return 'secondary'
}

const format3 = (v?: number) => (typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(3) : '-')

function IconPill({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="d-flex align-items-center gap-2 text-body-secondary small">
      <span className="d-flex">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = 'primary',
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ReactNode
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'secondary'
}) {
  const toneMap: Record<string, string> = {
    primary: 'border-primary text-primary',
    success: 'border-success text-success',
    warning: 'border-warning text-warning',
    info: 'border-info text-info',
    danger: 'border-danger text-danger',
    secondary: 'border-secondary text-secondary',
  }

  return (
    <Card className="h-100 shadow-sm border-0 bg-body">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="text-body-secondary small">{label}</div>
            <div className="fs-5 fw-bold mt-1 text-body">{value}</div>
            {sub ? <div className="text-body-secondary small mt-1">{sub}</div> : null}
          </div>
          <div className={`d-flex align-items-center justify-content-center rounded-3 border ${toneMap[tone]} px-2 py-1`}>{icon}</div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default function CustomerModalViewDetail({ show, onHide, customer, onPrintQr, getPublicTrackingUrl }: CustomerModalProps) {
  const [techOpen, setTechOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (show) setTechOpen(false)
  }, [show])

  useEffect(() => {
    let mounted = true

    const generateQr = async () => {
      try {
        if (!customer || !getPublicTrackingUrl) {
          if (mounted) setQrCodeDataUrl('')
          return
        }

        const url = getPublicTrackingUrl(customer)
        if (!url) {
          if (mounted) setQrCodeDataUrl('')
          return
        }

        const dataUrl = await QRCode.toDataURL(url, {
          width: 260,
          margin: 1,
        })

        if (mounted) {
          setQrCodeDataUrl(dataUrl)
        }
      } catch (error) {
        console.error('Erreur génération QR:', error)
        if (mounted) setQrCodeDataUrl('')
      }
    }

    if (show) {
      void generateQr()
    } else {
      setQrCodeDataUrl('')
      setCopied(false)
    }

    return () => {
      mounted = false
    }
  }, [show, customer, getPublicTrackingUrl])

  const POIDS_CAISSE = 30
  const POIDS_WIBA = 27
  const WIBA_PAR_QFIZ = 16
  const masseVolumiqueHuile = 0.918

  const computed = useMemo(() => {
    if (!customer) {
      return {
        quantiteOliveNet: 0,
        nombreWiba: 0,
        nombreQfza: 0,
        GALBA: '-',
        efficacite: 0,
      }
    }

    const quantiteOliveNet = customer.quantiteOliveNet ?? Math.max(0, (customer.quantiteOlive ?? 0) - (customer.nombreCaisses ?? 0) * POIDS_CAISSE)

    const nombreWiba = customer.nombreWiba ?? (quantiteOliveNet > 0 ? quantiteOliveNet / POIDS_WIBA : 0)
    const nombreQfza = customer.nombreQfza ?? (nombreWiba > 0 ? nombreWiba / WIBA_PAR_QFIZ : 0)

    const huileKg = customer.quantiteHuile ?? 0
    const huileLitres = huileKg / masseVolumiqueHuile
    const totalGalba = huileLitres / 10
    const galbaEntier = Math.floor(totalGalba)
    const resteGalba = (totalGalba - galbaEntier).toFixed(1)
    const GALBA = `${galbaEntier} GALBA (${resteGalba} فاصل)`

    const efficacite = customer.nisbaReelle && customer.nisba ? ((customer.nisbaReelle - customer.nisba) / customer.nisba) * 100 : 0

    return { quantiteOliveNet, nombreWiba, nombreQfza, GALBA, efficacite }
  }, [customer])

  if (!customer) {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton className="bg-body-tertiary border-bottom">
          <Modal.Title>Détails du client</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-body">
          <Alert variant="secondary" className="mb-0">
            Aucun client sélectionné.
          </Alert>
        </Modal.Body>
        <Modal.Footer className="bg-body-tertiary border-top">
          <Button variant="secondary" onClick={onHide}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }

  const addedBy = customer.nomutilisatuer?.split('@')?.[0] || 'Non défini'
  const typeVariant = getTypeBadgeVariant(customer.type)
  const trackingUrl = getPublicTrackingUrl ? getPublicTrackingUrl(customer) : ''
  const trackingActive = customer.status !== 'payé' && customer.trackingEnabled !== false
  const statusHuile = Number(customer.quantiteHuile ?? 0) > 0 ? 'Prêt' : 'En cours'

  const handleCopyLink = async () => {
    if (!trackingUrl) return

    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Erreur copie lien:', error)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="bg-body-tertiary border-bottom">
        <div className="w-100 d-flex flex-wrap justify-content-between align-items-start gap-2">
          <div className="d-flex align-items-start gap-3">
            <div
              className="rounded-4 bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
              style={{ width: 44, height: 44 }}>
              <User size={20} />
            </div>

            <div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="fw-bold fs-4 text-body">{customer.nomPrenom}</div>
                <Badge bg={typeVariant} className="text-uppercase">
                  {customer.type}
                </Badge>
                <Badge bg={statusHuile === 'Prêt' ? 'success' : 'warning'} text={statusHuile === 'Prêt' ? undefined : 'dark'}>
                  Huile: {statusHuile}
                </Badge>
              </div>

              <div className="d-flex flex-wrap gap-3 mt-1">
                <IconPill icon={<Phone size={14} />} text={customer.numTelephone} />
                <IconPill icon={<Hash size={14} />} text={`CIN: ${customer.numCIN}`} />
                <IconPill icon={<Calendar size={14} />} text={formatDate(customer.dateCreation)} />
                <IconPill icon={<Box size={14} />} text={`Ajouté par: ${addedBy}`} />
              </div>
            </div>
          </div>

          <div className="text-end">
            <Badge bg="secondary">ID: {customer._id}</Badge>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="bg-body">
        <Container fluid>
          <Row className="g-3 mb-3">
            <Col md={6} lg={3}>
              <KpiCard
                label="Olive brute"
                value={formatValueAndRound(customer.quantiteOlive, ' kg')}
                sub={`${customer.nombreCaisses ?? 0} caisses`}
                icon={<Package size={18} />}
                tone="warning"
              />
            </Col>

            <Col md={6} lg={3}>
              <KpiCard
                label="Olive nette"
                value={formatValueAndRound(computed.quantiteOliveNet, ' kg')}
                sub="Après caisses"
                icon={<Scale size={18} />}
                tone="success"
              />
            </Col>

            <Col md={6} lg={3}>
              <KpiCard
                label="Huile produite"
                value={formatValueAndRound(customer.quantiteHuile, ' kg')}
                sub="Production"
                icon={<Droplet size={18} />}
                tone="info"
              />
            </Col>

            <Col md={6} lg={3}>
              <KpiCard
                label="Nisba"
                value={formatValueAndRound(customer.nisba, ' %')}
                sub={`GALBA: ${computed.GALBA}`}
                icon={<Percent size={18} />}
                tone="primary"
              />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={5}>
              <Card className="shadow-sm border-0 mb-3 bg-body">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <BarChart3 size={18} className="text-primary" />
                    <div className="fw-semibold text-body">Informations</div>
                  </div>

                  <div className="p-3 rounded bg-body border">
                    <div className="text-body-secondary small mb-1">Commentaire</div>
                    <div className="fw-semibold text-body">{customer.commentaire || '-'}</div>
                  </div>
                </Card.Body>
              </Card>
              <Col>
                <Card className="shadow-sm border-0 bg-body">
                  <Card.Body>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Calculator size={18} className="text-secondary" />
                      <div className="fw-semibold text-body">Conversion (lecture rapide)</div>
                    </div>

                    <Row className="g-2">
                      <Col xs={6}>
                        <div className="p-3 bg-body border rounded">
                          <div className="text-body-secondary small">Wiba (calc)</div>
                          <div className="fw-bold text-body">{formatValueAndRound(customer.nombreWiba ?? computed.nombreWiba, '', 3)}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="p-3 bg-body border rounded">
                          <div className="text-body-secondary small">Qfza (calc)</div>
                          <div className="fw-bold text-body">{formatValueAndRound(customer.nombreQfza ?? computed.nombreQfza, '', 3)}</div>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Card className="shadow-sm border-0 mb-3 bg-body">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Hash size={18} className="text-success" />
                    <div className="fw-semibold text-body">QR Code de suivi</div>
                  </div>

                  <div className="border rounded-3 p-3 text-center">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="QR Code suivi client" style={{ width: 220, height: 220, objectFit: 'contain' }} />
                    ) : (
                      <div className="text-muted small">QR indisponible</div>
                    )}

                    <div className="mt-3 d-flex justify-content-center gap-2 flex-wrap">
                      <Badge bg={trackingActive ? 'success' : 'danger'}>QR {trackingActive ? 'actif' : 'désactivé'}</Badge>
                      <Badge bg={customer.status === 'payé' ? 'success' : 'danger'}>
                        Paiement: {customer.status === 'payé' ? 'Payé' : 'Non payé'}
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <Form.Control value={trackingUrl} readOnly className="text-center small" />
                    </div>

                    <div className="mt-3 d-flex justify-content-center gap-2 flex-wrap">
                      <Button variant="outline-primary" size="sm" onClick={handleCopyLink} disabled={!trackingUrl}>
                        {copied ? 'Lien copié' : 'Copier lien'}
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => onPrintQr?.(customer)} disabled={!trackingUrl}>
                        Imprimer QR
                      </Button>
                    </div>

                    <div className="small text-muted mt-3">
                      {trackingActive ? 'Le client peut encore consulter ce lien.' : 'Le lien est fermé automatiquement après paiement.'}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={7}>
              <Card className="shadow-sm border-0 mb-3 bg-body">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-warning" />
                    <div className="fw-semibold text-body">Performance</div>
                  </div>

                  <Row className="g-2">
                    <Col md={4}>
                      <div className="p-3 bg-body border rounded h-100 text-center">
                        <div className="text-body-secondary small">النسبة الفعلية</div>
                        <div className="fw-bold fs-5 text-body">{formatValueAndRound(customer.nisbaReelle, '%')}</div>
                        <Badge bg={(customer.nisbaReelle ?? 0) > (customer.nisba ?? 0) ? 'success' : 'danger'} className="mt-2">
                          {formatValueAndRound(computed.efficacite, '%')}
                        </Badge>
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="p-3 bg-body border rounded h-100 text-center">
                        <div className="text-body-secondary small">الزيت المتوقع</div>
                        <div className="fw-bold fs-5 text-body">{formatValueAndRound(customer.quantiteHuileTheorique, ' kg')}</div>
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="p-3 bg-body border rounded h-100 text-center">
                        <div className="text-body-secondary small">الفرق</div>
                        <div className={`fw-bold fs-5 ${(customer.differenceHuile ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {(customer.differenceHuile ?? 0) > 0 ? '+' : ''}
                          {formatValueAndRound(customer.differenceHuile, ' kg')}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="shadow-sm border-0 bg-body">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <BarChart3 size={18} className="text-success" />
                    <div className="fw-semibold text-body">Prix</div>
                  </div>

                  <Row className="g-2">
                    <Col md={6}>
                      <div className="p-3 bg-body border rounded h-100">
                        <div className="text-body-secondary small">Prix par Kg</div>
                        <div className="fw-bold fs-5 text-body">{format3(customer.prixKg)}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 bg-body border rounded h-100">
                        <div className="text-body-secondary small">Montant total (DT)</div>
                        <div className="fw-bold fs-5 text-body">{format3(customer.prixFinal)}</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Accordion activeKey={techOpen ? '0' : undefined} className="mt-2">
                <Accordion.Item eventKey="0">
                  <Accordion.Header onClick={() => setTechOpen((v) => !v)}>
                    <div className="d-flex align-items-center gap-2">
                      <Gauge size={18} className="text-secondary" />
                      <span className="fw-semibold">Détails techniques (calculs)</span>
                      <Badge bg="secondary" className="ms-2">
                        optionnel
                      </Badge>
                    </div>
                  </Accordion.Header>

                  <Accordion.Body className="bg-body">
                    <Row className="g-3">
                      <Col md={6}>
                        <Table bordered size="sm" className="mb-0">
                          <tbody>
                            <tr>
                              <td className="fw-bold bg-body-tertiary" style={{ width: '60%' }}>
                                القطوع
                              </td>
                              <td className="text-body">{formatValueAndRound(customer.kattou3)}</td>
                            </tr>
                            <tr>
                              <td className="fw-bold bg-body-tertiary"> الزيت في كل قفيز </td>
                              <td className="text-body">{formatValueAndRound(customer.huileParQfza, ' L/Qfiz')}</td>
                            </tr>
                            <tr>
                              <td className="fw-bold bg-body-tertiary">عدد الويبات الجملي</td>
                              <td className="text-body">{formatValueAndRound(customer.nombreWiba ?? computed.nombreWiba, '', 3)}</td>
                            </tr>
                          </tbody>
                        </Table>
                      </Col>

                      <Col md={6}>
                        <Table bordered size="sm" className="mb-0">
                          <tbody>
                            <tr>
                              <td className="fw-bold bg-body-tertiary" style={{ width: '60%' }}>
                                عدد القفزة
                              </td>
                              <td className="text-body">{formatValueAndRound(customer.nombreQfza ?? computed.nombreQfza, '', 3)}</td>
                            </tr>
                            <tr>
                              <td className="fw-bold bg-body-tertiary">وزن القاجو</td>
                              <td className="text-body">{POIDS_CAISSE} kg</td>
                            </tr>
                            <tr>
                              <td className="fw-bold bg-body-tertiary">وزن الويبة</td>
                              <td className="text-body">{POIDS_WIBA} kg</td>
                            </tr>
                          </tbody>
                        </Table>
                      </Col>
                    </Row>

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

      <Modal.Footer className="bg-body-tertiary border-top d-flex justify-content-end">
        <Button variant="outline-secondary" onClick={onHide}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
