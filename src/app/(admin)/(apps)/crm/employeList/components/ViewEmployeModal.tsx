'use client'
import React, { useMemo } from 'react'
import { Modal, Button, Row, Col, Badge, Table, Accordion } from 'react-bootstrap'

type JourTravaille = { date: string; heuresSup: number }
type Employe = {
  _id: string
  nom: string
  prenom: string
  numTel: string
  poste: string
  montantJournalier: number
  montantHeure: number
  joursPayes: string[]
  joursTravailles: JourTravaille[]
}

type ViewEmployeModalProps = {
  show: boolean
  onHide: () => void
  employe: Employe | null | undefined
}

function fmtMoney(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthLabel(d: Date) {
  return d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
}

const ViewEmployeModal = ({ show, onHide, employe }: ViewEmployeModalProps) => {
  // ✅ Protection : si employe n’existe pas, retourne un Set vide
  const paidSet = useMemo(() => {
    if (!employe?.joursPayes) return new Set<string>()
    const s = new Set<string>()
    employe.joursPayes.forEach((iso) => s.add(new Date(iso).toDateString()))
    return s
  }, [employe?.joursPayes])

  // ✅ Normalisation sécurisée
  const entries = useMemo(() => {
    if (!employe?.joursTravailles) return []
    const list = employe.joursTravailles.map((jt) => {
      const d = new Date(jt.date)
      const base = employe.montantJournalier || 0
      const hs = jt.heuresSup || 0
      const overtimePay = hs * (employe.montantHeure || 0)
      return {
        key: d.toISOString(),
        date: d,
        dateStr: d.toLocaleDateString('fr-FR'),
        weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        heuresSup: hs,
        base,
        overtimePay,
        total: base + overtimePay,
        isPaid: paidSet.has(d.toDateString()),
      }
    })
    return list.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [employe?.joursTravailles, employe?.montantJournalier, employe?.montantHeure, paidSet])

  // ✅ Groupement par mois
  const byMonth = useMemo(() => {
    const map: Record<
      string,
      {
        label: string
        items: typeof entries
        totals: { base: number; overtimePay: number; total: number; paidDays: number; hours: number }
      }
    > = {}

    entries.forEach((e) => {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) {
        const anyDate = new Date(e.date.getFullYear(), e.date.getMonth(), 1)
        map[key] = {
          label: monthLabel(anyDate),
          items: [],
          totals: { base: 0, overtimePay: 0, total: 0, paidDays: 0, hours: 0 },
        }
      }
      map[key].items.push(e)
      map[key].totals.base += e.base
      map[key].totals.overtimePay += e.overtimePay
      map[key].totals.total += e.total
      map[key].totals.paidDays += e.isPaid ? 1 : 0
      map[key].totals.hours += e.heuresSup
    })

    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, v]) => ({ key, ...v }))
  }, [entries])

  // ✅ Totaux globaux
  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc.days += 1
        acc.paidDays += e.isPaid ? 1 : 0
        acc.base += e.base
        acc.overtimePay += e.overtimePay
        acc.hours += e.heuresSup
        acc.total += e.total
        return acc
      },
      { days: 0, paidDays: 0, base: 0, overtimePay: 0, total: 0, hours: 0 },
    )
  }, [entries])

  // ✅ Empêche le rendu si employe est null
  if (!employe) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Détails de l&apos;employé</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Informations employé */}
        <Row className="g-3 mb-3">
          <Col xs={12} md={6}>
            <strong>Nom :</strong> {employe.nom}
          </Col>
          <Col xs={12} md={6}>
            <strong>Prénom :</strong> {employe.prenom}
          </Col>
          <Col xs={12} md={6}>
            <strong>Téléphone :</strong> {employe.numTel}
          </Col>
          <Col xs={12} md={6}>
            <strong>Poste :</strong> {employe.poste}
          </Col>
          <Col xs={12} md={6}>
            <strong>Taux journalier :</strong> {fmtMoney(employe.montantJournalier)} DT
          </Col>
          <Col xs={12} md={6}>
            <strong>Taux heure supp. :</strong> {fmtMoney(employe.montantHeure)} DT
          </Col>
        </Row>

        {/* Résumé global */}
        <Row className="g-3 mb-4">
          <Col xs={6} md={4} lg={2}>
            <div className="p-2 border rounded text-center">
              <div className="text-muted small">Jours travaillés</div>
              <div className="fs-5 fw-bold">{totals.days}</div>
            </div>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <div className="p-2 border rounded text-center">
              <div className="text-muted small">Jours payés</div>
              <div className="fs-5 fw-bold text-success">{totals.paidDays}</div>
            </div>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <div className="p-2 border rounded text-center">
              <div className="text-muted small">Jours impayés</div>
              <div className="fs-5 fw-bold text-danger">{totals.days - totals.paidDays}</div>
            </div>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <div className="p-2 border rounded text-center">
              <div className="text-muted small">Heures supp.</div>
              <div className="fs-5 fw-bold">{totals.hours}</div>
            </div>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <div className="p-2 border rounded text-center">
              <div className="text-muted small">Base (DT)</div>
              <div className="fs-5 fw-bold">{fmtMoney(totals.base)}</div>
            </div>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <div className="p-2 border rounded text-center">
              <div className="text-muted small">HS (DT)</div>
              <div className="fs-5 fw-bold">{fmtMoney(totals.overtimePay)}</div>
            </div>
          </Col>
          <Col xs={12} className="mt-2">
            <div className="p-2 border rounded text-center bg-light">
              <div className="text-muted small">Total à payer (Base + HS)</div>
              <div className="fs-4 fw-bold">{fmtMoney(totals.total)} DT</div>
            </div>
          </Col>
        </Row>

        {/* Détails par mois */}
        {entries.length === 0 ? (
          <p className="text-muted">Aucun jour travaillé enregistré.</p>
        ) : (
          <Accordion alwaysOpen>
            {byMonth.map((m, idx) => (
              <Accordion.Item eventKey={String(idx)} key={m.key}>
                <Accordion.Header>{m.label}</Accordion.Header>
                <Accordion.Body>
                  <div className="table-responsive">
                    <Table bordered hover size="sm" className="align-middle mb-3">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Jour</th>
                          <th>Heures supp.</th>
                          <th>Paie base (DT)</th>
                          <th>Paie HS (DT)</th>
                          <th>Total jour (DT)</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.items.map((e) => (
                          <tr key={e.key}>
                            <td>{e.dateStr}</td>
                            <td className="text-capitalize">{e.weekday}</td>
                            <td>{e.heuresSup}</td>
                            <td>{fmtMoney(e.base)}</td>
                            <td>{fmtMoney(e.overtimePay)}</td>
                            <td className="fw-bold">{fmtMoney(e.total)}</td>
                            <td>
                              {e.isPaid ? (
                                <Badge bg="success">Payé</Badge>
                              ) : (
                                <Badge bg="warning" text="dark">
                                  À payer
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="table-success">
                          <td colSpan={3} className="fw-bold">
                            Total {m.label}
                          </td>
                          <td className="fw-bold">{fmtMoney(m.totals.base)}</td>
                          <td className="fw-bold">{fmtMoney(m.totals.overtimePay)}</td>
                          <td className="fw-bold">{fmtMoney(m.totals.total)}</td>
                          <td className="fw-bold">
                            {m.totals.paidDays}/{m.items.length} jours payés
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                  <div className="small text-muted">
                    <span className="me-3">
                      <Badge bg="success" className="me-1">
                        &nbsp;
                      </Badge>
                      Payé
                    </span>
                    <span>
                      <Badge bg="warning" text="dark" className="me-1">
                        &nbsp;
                      </Badge>
                      À payer
                    </span>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ViewEmployeModal
