'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Row, Col, Badge, Table, Accordion, Alert, Spinner, Form } from 'react-bootstrap'

import DataTable from '@/components/table/DataTable'
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'

type Paiement =
  | string
  | {
      date: string
      heuresSup?: number
      mode?: 'CAISSE' | 'NOTE'
      commentaire?: string
      montant?: number
    }

type Absence = { date: string; motif?: string } | any

type Avance = {
  date: string
  montant: number
  mode?: 'CAISSE' | 'NOTE' // ✅ CAISSE déductible / NOTE non déductible
  note?: string
} | any

type Employe = {
  _id: string
  nom: string
  prenom: string
  numTel: string
  poste: string
  montantJournalier: number
  montantHeure: number
  joursPayes?: Paiement[]
  absences?: Absence[]
  avances?: Avance[]
  updatedAt?: string
  createdAt?: string
  dateDebutPresence?: string | null
  dateFinPresence?: string | null
  joursSemaineTravail?: number[]
}

type ViewEmployeModalProps = {
  show: boolean
  onHide: () => void
  employe: Employe | null | undefined
  apiHost?: string
}

/* ========================= Utils ========================= */

const pad2 = (n: number) => String(n).padStart(2, '0')

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function monthLabelFromYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
function toDateSafe(x: any): Date | null {
  const raw = typeof x === 'string' ? x : x?.date ?? x
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}
function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b
}
function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b
}
function round3(n: number) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000
}
function fmtMoney(n: number | null | undefined): string {
  const v = typeof n === 'number' && !isNaN(n) ? n : 0
  return v.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
}
function groupByMonth<T extends { dateObj: Date }>(items: T[]) {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const key = ymKey(it.dateObj)
    const arr = map.get(key) ?? []
    arr.push(it)
    map.set(key, arr)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, arr]) => ({
      key,
      label: monthLabelFromYM(key),
      items: arr.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()),
    }))
}

/* ========================= Mini modal Paiement ========================= */

function PayDayModal({
  show,
  onHide,
  onConfirm,
  date,
  due,
}: {
  show: boolean
  onHide: () => void
  onConfirm: (payload: { mode: 'CAISSE' | 'NOTE'; commentaire?: string }) => void
  date: string
  due: number
}) {
  const [mode, setMode] = useState<'CAISSE' | 'NOTE'>('CAISSE')
  const [commentaire, setCommentaire] = useState('')

  useEffect(() => {
    if (!show) return
    setMode('CAISSE')
    setCommentaire('')
  }, [show])

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Payer — {date}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="py-2">
          Reste à payer (après avance CAISSE) : <b>{due.toFixed(3)} DT</b>
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label>Mode</Form.Label>
          <div className="d-flex gap-3">
            <Form.Check
              type="radio"
              name="mode"
              label="Déduire caisse"
              checked={mode === 'CAISSE'}
              onChange={() => setMode('CAISSE')}
            />
            <Form.Check
              type="radio"
              name="mode"
              label="Noter payé"
              checked={mode === 'NOTE'}
              onChange={() => setMode('NOTE')}
            />
          </div>
        </Form.Group>

        <Form.Group>
          <Form.Label>Commentaire (optionnel)</Form.Label>
          <Form.Control value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Annuler
        </Button>
        <Button variant="primary" onClick={() => onConfirm({ mode, commentaire: commentaire.trim() || undefined })}>
          Valider
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

/* ========================= Component ========================= */

type DayRow = {
  date: string
  weekday: string
  absent: boolean
  paid: boolean
  paidMode?: string
  paidComment?: string
  daily: number
  advUsed: number
  due: number
  fullyByAdvance: boolean
  partiallyByAdvance: boolean
}

const dayCol = createColumnHelper<DayRow>()

export default function ViewEmployeModal({ show, onHide, employe, apiHost }: ViewEmployeModalProps) {
  const [emp, setEmp] = useState<Employe | null>(employe ?? null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Mois sélectionné pour "Jours & Paiement"
  const [payMonth, setPayMonth] = useState<string>(() => ymKey(new Date()))

  // Modal payer
  const [payOpen, setPayOpen] = useState(false)
  const [payDate, setPayDate] = useState<string>('')
  const [payDue, setPayDue] = useState<number>(0)

  const [sortingDays, setSortingDays] = useState<SortingState>([])

  // refléter la prop
  useEffect(() => {
    setEmp(employe ?? null)
  }, [employe])

  // reset à l’ouverture
  useEffect(() => {
    if (!show) return
    setPayMonth(ymKey(new Date()))
    setPayOpen(false)
    setPayDate('')
    setPayDue(0)
    setErr(null)
  }, [show])

  const reloadEmploye = async (id: string) => {
    if (!apiHost) return
    const res = await fetch(`${apiHost}/employes/${id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error("Impossible de recharger l'employé.")
    const fresh = await res.json()
    setEmp(fresh)
  }

  // recharger à l’ouverture
  useEffect(() => {
    const run = async () => {
      if (!show || !apiHost || !employe?._id) return
      try {
        setLoading(true)
        setErr(null)
        await reloadEmploye(employe._id)
      } catch (e: any) {
        setErr(e?.message || 'Erreur chargement.')
      } finally {
        setLoading(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, apiHost, employe?._id])

  const e = emp
  const isEmpty = !e

  const today = useMemo(() => new Date(), [])
  const todayYM = useMemo(() => ymKey(today), [today])
  const todayYMD = useMemo(() => ymd(today), [today])

  /* ========================= Paiements ========================= */
  const payments = useMemo(() => {
    const base = Number(e?.montantJournalier || 0)
    const rateH = Number(e?.montantHeure || 0)
    const list = Array.isArray(e?.joursPayes) ? e!.joursPayes! : []

    return list
      .map((p: any) => {
        const d = toDateSafe(typeof p === 'string' ? p : p?.date)
        if (!d) return null
        const hs = Number(typeof p === 'object' ? p?.heuresSup : 0) || 0
        const hsPay = hs * rateH
        return {
          dateObj: d,
          ymd: ymd(d),
          hs,
          base,
          hsPay,
          total: base + hsPay,
          mode: typeof p === 'object' ? p?.mode : undefined,
          commentaire: typeof p === 'object' ? p?.commentaire : undefined,
        }
      })
      .filter(Boolean) as any[]
  }, [e?.joursPayes, e?.montantJournalier, e?.montantHeure])

  const paymentsByMonth = useMemo(() => groupByMonth(payments), [payments])

  /* ========================= Absences ========================= */
  const absences = useMemo(() => {
    const list = Array.isArray(e?.absences) ? e!.absences! : []
    return list
      .map((a: any) => {
        const d = toDateSafe(a?.date ?? a)
        if (!d) return null
        return { dateObj: d, ymd: ymd(d), motif: a?.motif ?? a?.reason ?? '' }
      })
      .filter(Boolean) as { dateObj: Date; ymd: string; motif: string }[]
  }, [e?.absences])

  const absencesByMonth = useMemo(() => groupByMonth(absences), [absences])

  /* ========================= Avances ========================= */
  const advances = useMemo(() => {
    const list = Array.isArray(e?.avances) ? e!.avances! : []
    return list
      .map((a: any) => {
        const d = toDateSafe(a?.date ?? a)
        if (!d) return null
        return {
          dateObj: d,
          ymd: ymd(d),
          montant: Number(a?.montant ?? a?.amount ?? 0) || 0,
          mode: (a?.mode ?? 'NOTE') as 'CAISSE' | 'NOTE',
          note: a?.note ?? a?.commentaire ?? a?.comment ?? '',
        }
      })
      .filter(Boolean) as { dateObj: Date; ymd: string; montant: number; mode: 'CAISSE' | 'NOTE'; note: string }[]
  }, [e?.avances])

  const advancesByMonth = useMemo(() => groupByMonth(advances), [advances])

  /* ========================= Résumé par mois ========================= */
  const monthKeys = useMemo(() => {
    const s = new Set<string>()
    payments.forEach((p: any) => s.add(ymKey(p.dateObj)))
    absences.forEach((a) => s.add(ymKey(a.dateObj)))
    advances.forEach((a) => s.add(ymKey(a.dateObj)))
    s.add(todayYM)
    return Array.from(s).sort((a, b) => b.localeCompare(a))
  }, [payments, absences, advances, todayYM])

  const monthlySummary = useMemo(() => {
    const now = new Date()
    const nowYM = ymKey(now)
    const nowYMD = ymd(now)

    const weekDays =
      Array.isArray(e?.joursSemaineTravail) && e!.joursSemaineTravail!.length
        ? e!.joursSemaineTravail!
        : [0, 1, 2, 3, 4, 5, 6]

    const startPref = (() => {
      const s1 = e?.dateDebutPresence ? new Date(`${e.dateDebutPresence}T00:00:00`) : null
      if (s1 && !isNaN(s1.getTime())) return s1
      const s2 = e?.createdAt ? new Date(e.createdAt) : null
      if (s2 && !isNaN(s2.getTime())) return new Date(s2.getFullYear(), s2.getMonth(), s2.getDate())
      return null
    })()

    const endPref = (() => {
      const f = e?.dateFinPresence ? new Date(`${e.dateFinPresence}T23:59:59`) : null
      if (f && !isNaN(f.getTime())) return f
      return null
    })()

    const countPlanned = (start: Date, end: Date) => {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const ee = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      if (s > ee) return 0
      let c = 0
      for (let d = new Date(s); d <= ee; d.setDate(d.getDate() + 1)) {
        if (weekDays.includes(d.getDay())) c++
      }
      return c
    }

    return monthKeys.map((k) => {
      const [Y, M] = k.split('-').map(Number)
      const monthStart = new Date(Y, M - 1, 1, 0, 0, 0, 0)
      const monthEnd = new Date(Y, M, 0, 23, 59, 59, 999)

      if (k > nowYM) {
        return {
          key: k,
          label: monthLabelFromYM(k),
          plannedDays: 0,
          absences: 0,
          presenceDefault: 0,
          paidDays: 0,
          brutTheorique: 0,
          brutPaye: 0,
          advDeductible: 0,
          advNotes: 0,
          netTheorique: 0,
        }
      }

      const endConsidered = k === nowYM ? now : monthEnd
      const startConsidered = startPref ? (startPref > monthStart ? startPref : monthStart) : monthStart
      const endReal = endPref ? (endPref < endConsidered ? endPref : endConsidered) : endConsidered

      if (startConsidered.getTime() > endReal.getTime()) {
        return {
          key: k,
          label: monthLabelFromYM(k),
          plannedDays: 0,
          absences: 0,
          presenceDefault: 0,
          paidDays: 0,
          brutTheorique: 0,
          brutPaye: 0,
          advDeductible: 0,
          advNotes: 0,
          netTheorique: 0,
        }
      }

      const plannedDays = countPlanned(startConsidered, endReal)

      const absForMonth = absences.filter((a) => {
        if (ymKey(a.dateObj) !== k) return false
        if (k === nowYM && a.ymd > nowYMD) return false
        return a.dateObj.getTime() >= startConsidered.getTime() && a.dateObj.getTime() <= endReal.getTime()
      })

      const presenceDefault = Math.max(plannedDays - absForMonth.length, 0)

      const pay = payments.filter((p: any) => ymKey(p.dateObj) === k)
      const brutPaye = pay.reduce((s: number, x: any) => s + x.total, 0)

      const advForMonth = advances.filter((a) => ymKey(a.dateObj) === k)
      const advDeductible = advForMonth.filter((a) => a.mode === 'CAISSE').reduce((s, x) => s + x.montant, 0)
      const advNotes = advForMonth.filter((a) => a.mode === 'NOTE').reduce((s, x) => s + x.montant, 0)

      const brutTheorique = presenceDefault * Number(e?.montantJournalier || 0)
      const netTheorique = Math.max(brutTheorique - advDeductible, 0) // ✅ jamais négatif

      return {
        key: k,
        label: monthLabelFromYM(k),
        plannedDays,
        absences: absForMonth.length,
        presenceDefault,
        paidDays: pay.length,
        brutTheorique,
        brutPaye,
        advDeductible,
        advNotes,
        netTheorique,
        window: { start: ymd(startConsidered), end: ymd(endReal) },
      }
    })
  }, [
    monthKeys,
    absences,
    payments,
    advances,
    e?.dateDebutPresence,
    e?.dateFinPresence,
    e?.createdAt,
    e?.joursSemaineTravail,
    e?.montantJournalier,
  ])

  /* =========================
     ✅ Jours & Paiement (DataTable)
     ========================= */
  const dayPayment = useMemo(() => {
    if (!e) {
      return { window: null as any, rows: [] as DayRow[], totals: { advDeductible: 0, advNotes: 0, worked: 0, planned: 0 } }
    }

    const now = new Date()
    const nowYM = ymKey(now)
    if (payMonth > nowYM) {
      return { window: null as any, rows: [] as DayRow[], totals: { advDeductible: 0, advNotes: 0, worked: 0, planned: 0 } }
    }

    const [Y, M] = payMonth.split('-').map(Number)
    const monthStart = new Date(Y, M - 1, 1, 0, 0, 0, 0)
    const monthEnd = new Date(Y, M, 0, 23, 59, 59, 999)
    const endConsidered = payMonth === nowYM ? now : monthEnd

    const weekDays = Array.isArray(e.joursSemaineTravail) && e.joursSemaineTravail.length ? e.joursSemaineTravail : [0, 1, 2, 3, 4, 5, 6]

    const startPref = (() => {
      const s1 = e.dateDebutPresence ? new Date(`${e.dateDebutPresence}T00:00:00`) : null
      if (s1 && !isNaN(s1.getTime())) return s1
      const s2 = e.createdAt ? new Date(e.createdAt) : null
      if (s2 && !isNaN(s2.getTime())) return new Date(s2.getFullYear(), s2.getMonth(), s2.getDate())
      return monthStart
    })()

    const endPref = (() => {
      const f = e.dateFinPresence ? new Date(`${e.dateFinPresence}T23:59:59`) : null
      if (f && !isNaN(f.getTime())) return f
      return null
    })()

    const startConsidered = maxDate(monthStart, startPref)
    const endReal = endPref ? minDate(endConsidered, endPref) : endConsidered

    if (startConsidered.getTime() > endReal.getTime()) {
      return {
        window: { start: ymd(startConsidered), end: ymd(endReal) },
        rows: [],
        totals: { advDeductible: 0, advNotes: 0, worked: 0, planned: 0 },
      }
    }

    // jours planifiés
    const planned: { date: string; weekday: string }[] = []
    for (let d = new Date(startConsidered); d <= endReal; d.setDate(d.getDate() + 1)) {
      if (!weekDays.includes(d.getDay())) continue
      planned.push({
        date: ymd(d),
        weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      })
    }

    // absences set
    const absSet = new Set<string>()
    absences.forEach((a) => {
      if (a.ymd.startsWith(payMonth)) absSet.add(a.ymd)
    })

    const workedDates = planned.filter((x) => !absSet.has(x.date)).map((x) => x.date)

    // avances du mois
    const monthAdv = advances.filter((a) => a.ymd.startsWith(payMonth))
    const advDeductible = monthAdv.filter((a) => a.mode === 'CAISSE').reduce((s, a) => s + (Number(a.montant) || 0), 0)
    const advNotes = monthAdv.filter((a) => a.mode === 'NOTE').reduce((s, a) => s + (Number(a.montant) || 0), 0)

    // avance utilisée par jour (selon montantJournalier)
    const daily = Number(e.montantJournalier || 0)
    let remaining = advDeductible
    const advanceUsed = new Map<string, number>()
    for (const d of workedDates) {
      if (daily <= 0 || remaining <= 0) {
        advanceUsed.set(d, 0)
        continue
      }
      const used = Math.min(daily, remaining)
      advanceUsed.set(d, round3(used))
      remaining = round3(remaining - used)
    }

    // paiements map (joursPayes)
    const payMap = new Map<string, { mode?: string; commentaire?: string }>()
    payments.forEach((p: any) => {
      if (!p.ymd.startsWith(payMonth)) return
      payMap.set(p.ymd, { mode: p.mode, commentaire: p.commentaire })
    })

    const rows: DayRow[] = planned.map((x) => {
      const absent = absSet.has(x.date)
      const paid = payMap.has(x.date)
      const advUsed = absent ? 0 : (advanceUsed.get(x.date) || 0)

      const fullyByAdvance = !absent && !paid && daily > 0 && advUsed >= daily
      const partiallyByAdvance = !absent && !paid && advUsed > 0 && advUsed < daily

      const due = absent ? 0 : paid ? 0 : Math.max(daily - advUsed, 0)

      return {
        date: x.date,
        weekday: x.weekday,
        absent,
        paid,
        paidMode: payMap.get(x.date)?.mode,
        paidComment: payMap.get(x.date)?.commentaire,
        daily,
        advUsed,
        due,
        fullyByAdvance,
        partiallyByAdvance,
      }
    })

    return {
      window: { start: ymd(startConsidered), end: ymd(endReal) },
      rows,
      totals: { advDeductible, advNotes, worked: workedDates.length, planned: planned.length },
    }
  }, [e, payMonth, absences, advances, payments])

  const cancelAbsence = async (dateYMD: string) => {
    if (!apiHost || !e?._id) return
    try {
      setLoading(true)
      setErr(null)

      const res = await fetch(`${apiHost}/employes/${e._id}/absence?date=${encodeURIComponent(dateYMD)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message
        throw new Error(typeof msg === 'string' ? msg : 'Erreur annulation absence')
      }

      await reloadEmploye(e._id)
    } catch (ex: any) {
      setErr(ex?.message || 'Erreur annulation absence')
    } finally {
      setLoading(false)
    }
  }

  const payDay = async (date: string, mode: 'CAISSE' | 'NOTE', commentaire?: string, due?: number) => {
    if (!apiHost || !e?._id) return
    try {
      setLoading(true)
      setErr(null)

      const res = await fetch(`${apiHost}/employes/${e._id}/payer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          heuresSup: 0,
          mode,
          commentaire,
          montant: due, // optionnel
        }),
      })

      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message
        throw new Error(typeof msg === 'string' ? msg : 'Erreur paiement')
      }

      await reloadEmploye(e._id)
    } catch (ex: any) {
      setErr(ex?.message || 'Erreur paiement')
    } finally {
      setLoading(false)
    }
  }

  // ✅ DataTable pour les jours
  const dayColumns = useMemo(
    () => [
      dayCol.accessor('date', { header: 'Date' }),
      dayCol.accessor('weekday', {
        header: 'Jour',
        cell: (info) => <span className="text-capitalize">{info.getValue()}</span>,
      }),
      dayCol.display({
        id: 'status',
        header: 'Statut',
        cell: ({ row }) => {
          const it = row.original
          if (it.absent) return <Badge bg="danger">Absent</Badge>
          if (it.paid) return <Badge bg="success">Payé</Badge>
          if (it.fullyByAdvance) return <Badge bg="success">Payé (avance)</Badge>
          if (it.partiallyByAdvance) return <Badge bg="warning" text="dark">Partiel (avance)</Badge>
          return <Badge bg="secondary">Non payé</Badge>
        },
      }),
      dayCol.display({
        id: 'daily',
        header: 'Salaire/j',
        cell: ({ row }) => fmtMoney(row.original.daily),
      }),
      dayCol.display({
        id: 'advUsed',
        header: 'Avance utilisée',
        cell: ({ row }) => (row.original.absent ? '—' : row.original.advUsed > 0 ? fmtMoney(row.original.advUsed) : '—'),
      }),
      dayCol.display({
        id: 'due',
        header: 'Reste',
        cell: ({ row }) => {
          const v = row.original.due
          return <span className={v <= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>{fmtMoney(v)}</span>
        },
      }),
      dayCol.display({
        id: 'paymentInfo',
        header: 'Paiement',
        cell: ({ row }) => {
          const it = row.original
          if (it.paid) {
            return (
              <div className="small text-muted">
                <div>{it.paidMode || 'Payé'}</div>
                {it.paidComment ? <div>{it.paidComment}</div> : null}
              </div>
            )
          }
          if (it.fullyByAdvance) return <span className="text-muted small">Avance</span>
          return <span className="text-muted small">—</span>
        },
      }),
      dayCol.display({
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const it = row.original
          return (
            <div className="d-flex gap-2 flex-wrap">
              {it.absent ? (
                <Button size="sm" variant="outline-success" disabled={loading} onClick={() => cancelAbsence(it.date)}>
                  Marquer présent
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={loading || it.due <= 0}
                  onClick={() => {
                    setPayDate(it.date)
                    setPayDue(it.due)
                    setPayOpen(true)
                  }}
                >
                  Payer
                </Button>
              )}
            </div>
          )
        },
      }),
    ],
    [loading],
  )

  const dayTable = useReactTable({
    data: dayPayment.rows,
    columns: dayColumns as any,
    getRowId: (row) => row.date,
    state: { sorting: sortingDays },
    onSortingChange: setSortingDays,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Détails de l&apos;employé</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {err && <Alert variant="danger">{err}</Alert>}
          {loading && (
            <div className="d-flex align-items-center text-muted mb-2">
              <Spinner size="sm" className="me-2" /> Traitement...
            </div>
          )}

          {isEmpty ? (
            <Alert variant="secondary">Aucun employé sélectionné.</Alert>
          ) : (
            <>
              <Row className="g-3 mb-3">
                <Col xs={12} md={6}><strong>Nom :</strong> {e!.nom}</Col>
                <Col xs={12} md={6}><strong>Prénom :</strong> {e!.prenom}</Col>
                <Col xs={12} md={6}><strong>Téléphone :</strong> {e!.numTel}</Col>
                <Col xs={12} md={6}><strong>Poste :</strong> {e!.poste}</Col>
                <Col xs={12} md={6}><strong>Taux journalier :</strong> {fmtMoney(e!.montantJournalier)}</Col>
                <Col xs={12} md={6}><strong>Taux heure supp. :</strong> {fmtMoney(e!.montantHeure)}</Col>
              </Row>

              <Alert variant="info" className="py-2">
                ✅ Présence par défaut : on marque seulement <b>les absences</b>. <br />
                ✅ Avance <b>CAISSE</b> = déductible / Avance <b>NOTE</b> = non déductible (visible pour éviter les fuites).
              </Alert>

              <Accordion alwaysOpen>
                {/* Résumé par mois */}
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Résumé par mois</Accordion.Header>
                  <Accordion.Body>
                    <div className="table-responsive">
                      <Table bordered hover size="sm" className="align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Mois</th>
                            <th>Planifié</th>
                            <th>Absences</th>
                            <th>Présence</th>
                            <th>Salaire (théorique)</th>
                            <th>Payé (jours)</th>
                            <th>Payé (montant)</th>
                            <th>Avances CAISSE</th>
                            <th>Notes</th>
                            <th>Net (théorique)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlySummary.map((m: any) => (
                            <tr key={m.key}>
                              <td className="fw-semibold">
                                {m.label}
                                {m.window?.start && (
                                  <div className="text-muted small">
                                    {m.window.start} → {m.window.end}
                                  </div>
                                )}
                              </td>
                              <td>{m.plannedDays}</td>
                              <td className="text-danger fw-bold">{m.absences}</td>
                              <td className="fw-bold">{m.presenceDefault}</td>
                              <td className="fw-bold">{fmtMoney(m.brutTheorique)}</td>
                              <td>
                                <Badge bg={m.paidDays ? 'success' : 'secondary'}>{m.paidDays}</Badge>
                              </td>
                              <td>{fmtMoney(m.brutPaye)}</td>
                              <td className="text-warning fw-bold">{fmtMoney(m.advDeductible)}</td>
                              <td className="text-muted fw-bold">{fmtMoney(m.advNotes)}</td>
                              <td className="text-success fw-bold">{fmtMoney(m.netTheorique)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                {/* ✅ Jours & Paiement (DataTable) */}
                <Accordion.Item eventKey="pay">
                  <Accordion.Header>Jours & Paiement</Accordion.Header>
                  <Accordion.Body>
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                      <Form.Label className="mb-0">Mois :</Form.Label>
                      <Form.Control
                        type="month"
                        value={payMonth}
                        onChange={(ev) => setPayMonth(ev.target.value)}
                        style={{ width: 180 }}
                        disabled={loading}
                      />
                      {dayPayment.window && (
                        <div className="text-muted small">
                          Fenêtre : <b>{dayPayment.window.start}</b> → <b>{dayPayment.window.end}</b>
                        </div>
                      )}
                    </div>

                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <Badge bg="primary">Planifié: {dayPayment.totals.planned}</Badge>
                      <Badge bg="success">Travaillé: {dayPayment.totals.worked}</Badge>
                      <Badge bg="warning" text="dark">Avances CAISSE: {fmtMoney(dayPayment.totals.advDeductible)}</Badge>
                      <Badge bg="secondary">Notes: {fmtMoney(dayPayment.totals.advNotes)}</Badge>
                    </div>

                    {dayPayment.totals.advNotes > 0 && (
                      <Alert variant="warning" className="py-2">
                        ⚠️ <b>Notes</b> : {fmtMoney(dayPayment.totals.advNotes)} (non déduites du salaire). Elles restent visibles (anti-fuite).
                      </Alert>
                    )}

                    {dayPayment.rows.length === 0 ? (
                      <p className="text-muted">Aucun jour à afficher pour ce mois.</p>
                    ) : (
                      <DataTable table={dayTable} emptyMessage="Aucun jour" />
                    )}
                  </Accordion.Body>
                </Accordion.Item>

                {/* Paiements */}
                <Accordion.Item eventKey="1">
                  <Accordion.Header>Paiements (groupés par mois)</Accordion.Header>
                  <Accordion.Body>
                    {paymentsByMonth.length === 0 ? (
                      <p className="text-muted">Aucun paiement enregistré.</p>
                    ) : (
                      <Accordion alwaysOpen>
                        {paymentsByMonth.map((m, idx) => {
                          const total = m.items.reduce((s: number, x: any) => s + x.total, 0)
                          return (
                            <Accordion.Item eventKey={`pay-${idx}`} key={m.key}>
                              <Accordion.Header>
                                {m.label}{' '}
                                <span className="ms-2">
                                  <Badge bg="success">{m.items.length} jour(s)</Badge>
                                </span>
                                <span className="ms-2">
                                  <Badge bg="primary">{fmtMoney(total)}</Badge>
                                </span>
                              </Accordion.Header>
                              <Accordion.Body>
                                <div className="table-responsive">
                                  <Table bordered hover size="sm" className="align-middle mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th>Date</th>
                                        <th>HS</th>
                                        <th>Base</th>
                                        <th>HS Pay</th>
                                        <th>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {m.items.map((p: any, i: number) => (
                                        <tr key={`${p.ymd}-${i}`}>
                                          <td>{p.dateObj.toLocaleDateString('fr-FR')}</td>
                                          <td>{p.hs}</td>
                                          <td>{fmtMoney(p.base)}</td>
                                          <td>{fmtMoney(p.hsPay)}</td>
                                          <td className="fw-bold">{fmtMoney(p.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </div>
                              </Accordion.Body>
                            </Accordion.Item>
                          )
                        })}
                      </Accordion>
                    )}
                  </Accordion.Body>
                </Accordion.Item>

                {/* Avances */}
                <Accordion.Item eventKey="2">
                  <Accordion.Header>Avances (groupées par mois)</Accordion.Header>
                  <Accordion.Body>
                    {advancesByMonth.length === 0 ? (
                      <p className="text-muted">Aucune avance enregistrée.</p>
                    ) : (
                      <Accordion alwaysOpen>
                        {advancesByMonth.map((m, idx) => {
                          const total = m.items.reduce((s, x) => s + x.montant, 0)
                          const caisse = m.items.filter((x) => x.mode === 'CAISSE').reduce((s, x) => s + x.montant, 0)
                          const note = total - caisse
                          return (
                            <Accordion.Item eventKey={`adv-${idx}`} key={m.key}>
                              <Accordion.Header>
                                {m.label}{' '}
                                <span className="ms-2">
                                  <Badge bg="warning" text="dark">
                                    Total {fmtMoney(total)}
                                  </Badge>
                                </span>
                                <span className="ms-2">
                                  <Badge bg="primary">CAISSE {fmtMoney(caisse)}</Badge>
                                </span>
                                <span className="ms-2">
                                  <Badge bg="secondary">NOTE {fmtMoney(note)}</Badge>
                                </span>
                              </Accordion.Header>
                              <Accordion.Body>
                                <div className="table-responsive">
                                  <Table bordered hover size="sm" className="align-middle mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th>Date</th>
                                        <th>Montant</th>
                                        <th>Mode</th>
                                        <th>Commentaire</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {m.items.map((a, i) => (
                                        <tr key={`${a.ymd}-${i}`}>
                                          <td>{a.dateObj.toLocaleDateString('fr-FR')}</td>
                                          <td className="fw-bold">{fmtMoney(a.montant)}</td>
                                          <td>
                                            {a.mode === 'CAISSE' ? (
                                              <Badge bg="primary">CAISSE</Badge>
                                            ) : (
                                              <Badge bg="secondary">NOTE</Badge>
                                            )}
                                          </td>
                                          <td className="text-muted">{a.note || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </div>
                              </Accordion.Body>
                            </Accordion.Item>
                          )
                        })}
                      </Accordion>
                    )}
                  </Accordion.Body>
                </Accordion.Item>

                {/* Absences + bouton Marquer présent */}
                <Accordion.Item eventKey="3">
                  <Accordion.Header>Absences (groupées par mois)</Accordion.Header>
                  <Accordion.Body>
                    {absencesByMonth.length === 0 ? (
                      <p className="text-muted">Aucune absence enregistrée.</p>
                    ) : (
                      <Accordion alwaysOpen>
                        {absencesByMonth.map((m, idx) => (
                          <Accordion.Item eventKey={`abs-${idx}`} key={m.key}>
                            <Accordion.Header>
                              {m.label}{' '}
                              <span className="ms-2">
                                <Badge bg="danger">{m.items.length} absence(s)</Badge>
                              </span>
                            </Accordion.Header>
                            <Accordion.Body>
                              <div className="table-responsive">
                                <Table bordered hover size="sm" className="align-middle mb-0">
                                  <thead className="table-light">
                                    <tr>
                                      <th>Date</th>
                                      <th>Motif</th>
                                      <th>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.items.map((a, i) => (
                                      <tr key={`${a.ymd}-${i}`}>
                                        <td>{a.dateObj.toLocaleDateString('fr-FR')}</td>
                                        <td className="text-muted">{a.motif || '-'}</td>
                                        <td>
                                          <Button
                                            size="sm"
                                            variant="outline-success"
                                            disabled={loading}
                                            onClick={() => cancelAbsence(a.ymd)}
                                          >
                                            Marquer présent
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small">
            {e?.updatedAt ? `Dernière mise à jour: ${new Date(e.updatedAt).toLocaleString('fr-FR')}` : ''}
          </div>
          <Button variant="secondary" onClick={onHide}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {e && (
        <PayDayModal
          show={payOpen}
          onHide={() => setPayOpen(false)}
          date={payDate}
          due={payDue}
          onConfirm={async ({ mode, commentaire }) => {
            setPayOpen(false)
            await payDay(payDate, mode, commentaire, payDue)
          }}
        />
      )}
    </>
  )
}