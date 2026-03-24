'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap'

type ResumeItemRaw = any

type ResumeRow = {
  employeId: string
  nom: string
  prenom: string
  poste: string
  month: string

  plannedDays: number
  absences: number
  workedDays: number

  montantJournalier?: number

  brutTheorique: number
  advancesCaisse: number
  advancesNote: number
  netAPayer: number
  resteAvance: number

  hasVentilation: boolean
}

type Props = {
  show: boolean
  onHide: () => void
  apiHost: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const currentYM = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function moneyOrDash(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return v <= 0.0005 ? '—' : `${money(v)} DT`
}

function num(x: any) {
  const v = Number(x)
  return Number.isFinite(v) ? v : 0
}

function normalizeAdvances(raw: ResumeItemRaw) {
  // 1) backend déjà ventilé
  const advC = num(raw?.advancesCaisse)
  const advN = num(raw?.advancesNote)
  if (advC > 0 || advN > 0) {
    return { advancesCaisse: advC, advancesNote: advN, hasVentilation: true }
  }

  // 2) backend renvoie details.avances[]
  const list = Array.isArray(raw?.details?.avances) ? raw.details.avances : null
  if (list) {
    let c = 0
    let n = 0
    for (const a of list) {
      const montant = num(a?.montant ?? a?.amount)
      const mode = String(a?.mode ?? 'NOTE').toUpperCase()
      if (mode === 'CAISSE') c += montant
      else n += montant
    }
    if (c > 0 || n > 0) return { advancesCaisse: c, advancesNote: n, hasVentilation: true }
  }

  // 3) fallback: totalAdvances => considéré CAISSE
  const totalAdv = num(raw?.totalAdvances)
  if (totalAdv > 0) {
    return { advancesCaisse: totalAdv, advancesNote: 0, hasVentilation: false }
  }

  return { advancesCaisse: 0, advancesNote: 0, hasVentilation: false }
}

export default function MonthlySummaryModal({ show, onHide, apiHost }: Props) {
  const [month, setMonth] = useState(currentYM())
  const [loading, setLoading] = useState(false)
  const [rawItems, setRawItems] = useState<ResumeItemRaw[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async (m: string) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${apiHost}/employes/resume/all?month=${encodeURIComponent(m)}`, {
        cache: 'no-store',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        const msg = json?.message
        throw new Error(typeof msg === 'string' ? msg : 'Erreur chargement résumé.')
      }

      const arr = Array.isArray(json?.items) ? json.items : []
      setRawItems(arr)
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement résumé.')
      setRawItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!show) return
    const m = currentYM()
    setMonth(m)
    fetchSummary(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  const rows: ResumeRow[] = useMemo(() => {
    return rawItems.map((x) => {
      const employeId = String(x?.employeId ?? x?._id ?? '')
      const workedDays = num(x?.workedDays)
      const plannedDays = num(x?.plannedDays)
      const absences = num(x?.absences)

      const montantJournalier = num(x?.montantJournalier)
      const brutFromBackend = num(x?.brut ?? x?.base ?? 0)

      const brutTheorique = montantJournalier > 0 ? workedDays * montantJournalier : brutFromBackend

      const { advancesCaisse, advancesNote, hasVentilation } = normalizeAdvances(x)

      const netAPayer = Math.max(brutTheorique - advancesCaisse, 0)
      const resteAvance = Math.max(advancesCaisse - brutTheorique, 0)

      return {
        employeId,
        nom: String(x?.nom ?? ''),
        prenom: String(x?.prenom ?? ''),
        poste: String(x?.poste ?? ''),
        month: String(x?.month ?? month),

        plannedDays,
        absences,
        workedDays,

        montantJournalier: montantJournalier > 0 ? montantJournalier : undefined,

        brutTheorique,
        advancesCaisse,
        advancesNote,
        netAPayer,
        resteAvance,
        hasVentilation,
      }
    })
  }, [rawItems, month])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.planned += r.plannedDays
        acc.abs += r.absences
        acc.worked += r.workedDays

        acc.brut += r.brutTheorique
        acc.advC += r.advancesCaisse
        acc.advN += r.advancesNote
        acc.net += r.netAPayer
        acc.reste += r.resteAvance

        if (!r.hasVentilation && r.advancesCaisse > 0) acc.missingVentilation += 1
        return acc
      },
      { planned: 0, abs: 0, worked: 0, brut: 0, advC: 0, advN: 0, net: 0, reste: 0, missingVentilation: 0 },
    )
  }, [rows])

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Résumé mensuel — Paiements</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2 align-items-center">
            <Form.Label className="mb-0">Mois</Form.Label>
            <Form.Control
              type="month"
              value={month}
              onChange={async (e) => {
                const m = e.target.value
                setMonth(m)
                await fetchSummary(m)
              }}
              style={{ width: 180 }}
              disabled={loading}
            />
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Badge bg="primary">Planifié: {totals.planned}</Badge>
            <Badge bg="danger">Abs: {totals.abs}</Badge>
            <Badge bg="success">Travaillé: {totals.worked}</Badge>
            <Badge bg="warning" text="dark">Avances CAISSE: {money(totals.advC)} DT</Badge>
            <Badge bg="secondary">Notes: {money(totals.advN)} DT</Badge>
            <Badge bg="success">Net à payer: {money(totals.net)} DT</Badge>
          </div>
        </div>

        {totals.reste > 0.0005 && (
          <Alert variant="info" className="py-2">
            ℹ️ Certaines avances CAISSE dépassent le salaire du mois.
            <br />
            <b>Reste avance</b> total : {money(totals.reste)} DT
          </Alert>
        )}

        {totals.missingVentilation > 0 && (
          <Alert variant="warning" className="py-2">
            ⚠️ Le backend ne renvoie pas la ventilation CAISSE/NOTE pour {totals.missingVentilation} employé(s).
            Dans ce cas on considère <b>totalAdvances</b> comme <b>CAISSE</b> (fallback).
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : rows.length === 0 ? (
          <Alert variant="secondary">Aucune donnée pour ce mois.</Alert>
        ) : (
          <div className="table-responsive">
            <Table bordered hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Employé</th>
                  <th>Poste</th>
                  <th>Planifié</th>
                  <th>Abs</th>
                  <th>Travaillé</th>
                  <th>Brut théorique</th>
                  <th>Avances CAISSE</th>
                  <th>Net à payer</th>
                  <th>Reste avance</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeId}>
                    <td className="fw-semibold">
                      {r.prenom} {r.nom}
                      {!r.hasVentilation && r.advancesCaisse > 0 && (
                        <Badge bg="warning" text="dark" className="ms-2">
                          fallback
                        </Badge>
                      )}
                    </td>
                    <td className="text-muted">{r.poste || '—'}</td>
                    <td>{r.plannedDays}</td>
                    <td className="text-danger fw-bold">{r.absences}</td>
                    <td className="fw-bold">{r.workedDays}</td>

                    <td className="fw-bold">
                      {money(r.brutTheorique)} DT
                      {r.montantJournalier ? (
                        <div className="text-muted small">
                          ({r.workedDays} × {money(r.montantJournalier)} DT)
                        </div>
                      ) : null}
                    </td>

                    <td className="text-warning fw-bold">{moneyOrDash(r.advancesCaisse)}</td>
                    <td className="text-success fw-bold">{moneyOrDash(r.netAPayer)}</td>
                    <td className={r.resteAvance > 0.0005 ? 'text-info fw-bold' : 'text-muted'}>
                      {moneyOrDash(r.resteAvance)}
                    </td>
                    <td className="text-muted fw-bold">{moneyOrDash(r.advancesNote)}</td>
                  </tr>
                ))}

                <tr className="table-success">
                  <td colSpan={5} className="fw-bold">
                    TOTAL
                  </td>
                  <td className="fw-bold">{money(totals.brut)} DT</td>
                  <td className="fw-bold">{money(totals.advC)} DT</td>
                  <td className="fw-bold">{money(totals.net)} DT</td>
                  <td className="fw-bold">{money(totals.reste)} DT</td>
                  <td className="fw-bold">{money(totals.advN)} DT</td>
                </tr>
              </tbody>
            </Table>
          </div>
        )}

        <div className="text-muted small mt-2">
          <b>Net à payer</b> = max(Brut théorique − Avances CAISSE, 0).<br />
          <b>Reste avance</b> = max(Avances CAISSE − Brut théorique, 0).<br />
          <b>Notes</b> (mode NOTE) : visibles pour traçabilité, ne diminuent pas le salaire.
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}