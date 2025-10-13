'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  Card,
  CardHeader,
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'
import { LuSearch } from 'react-icons/lu'
import DataTable from '@/components/table/DataTable'

type Caisse = {
  _id: string
  motif: string
  montant: number
  type: string
  date: string | null
  commentaire: string
}

const columnHelper = createColumnHelper<Caisse>()

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const isCredit = (t?: string) => (t ? /cred/i.test(t) : false)
const fmtMoney = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CaissesHistoryModal({
  show,
  onHide,
  data,
  onTransferred,
}: {
  show: boolean
  onHide: () => void
  data: Caisse[]
  onTransferred?: () => void
}) {
  const [global, setGlobal] = useState('')
  const [range, setRange] = useState<Date[]>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [transferLoading, setTransferLoading] = useState(false)
  const [localTransferred, setLocalTransferred] = useState(false)

  // filtre local historique
  const filtered = useMemo(() => {
    let res = [...data]

    if (global.trim() !== '') {
      const term = global.trim().toLowerCase()
      res = res.filter((item) => {
        const motif = item.motif?.toLowerCase() ?? ''
        const type = item.type?.toLowerCase() ?? ''
        const commentaire = item.commentaire?.toLowerCase() ?? ''
        const montant = String(item.montant ?? '').toLowerCase()
        return motif.includes(term) || type.includes(term) || commentaire.includes(term) || montant.includes(term)
      })
    }

    if (range.length === 1) {
      const d = startOfDay(range[0])
      res = res.filter((item) => {
        if (!item.date) return false
        const dt = startOfDay(new Date(item.date))
        return dt.getTime() === d.getTime()
      })
    } else if (range.length === 2) {
      const start = startOfDay(range[0])
      const end = addDays(startOfDay(range[1]), 1) // inclure la fin
      res = res.filter((item) => {
        if (!item.date) return false
        const dt = new Date(item.date)
        return dt >= start && dt < end
      })
    }

    return res
  }, [data, global, range])

  const columns = useMemo(
    () => [
      columnHelper.accessor('motif', {
        header: 'Motif',
        cell: (ctx) => <span className="fw-semibold">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('montant', {
        header: 'Montant',
        cell: (ctx) => {
          const row = ctx.row.original
          const v = Number(ctx.getValue() ?? 0)
          const isCred = isCredit(row.type)
          const sign = isCred ? '+' : '-'
          return (
            <span className={`fw-bold ${isCred ? 'text-success' : 'text-danger'}`}>
              {sign} {fmtMoney(Math.abs(v))} DT
            </span>
          )
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (ctx) => {
          const t = String(ctx.getValue() ?? '').toLowerCase()
          const isCred = isCredit(t)
          return (
            <Badge bg={isCred ? 'success' : 'danger'} pill className="text-uppercase">
              {isCred ? 'Crédit' : 'Débit'}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (ctx) => formatDateDDMMYYYY(ctx.getValue()),
      }),
      columnHelper.accessor('commentaire', {
        header: 'Commentaire',
        cell: (ctx) => <span className="text-muted">{ctx.getValue()}</span>,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Totaux filtrés (sur l’historique affiché)
  const totalCredit = filtered.filter((it) => isCredit(it.type)).reduce((a, b) => a + (b.montant || 0), 0)
  const totalDebit = filtered.filter((it) => !isCredit(it.type)).reduce((a, b) => a + (b.montant || 0), 0)
  const totalNet = totalCredit - totalDebit

  // ✅ Règles de désactivation:
  // 1) Si total net négatif -> désactivé (demande client)
  // 2) Si total net = 0 -> inutile
  // 3) Si un transfert historique existe déjà aujourd’hui -> une seule fois par jour
  const now = new Date()
  const hasTodayTransfer = useMemo(
    () =>
      data.some((it) => {
        if (!it.date) return false
        const dt = new Date(it.date)
        const motif = (it.motif || '').toLowerCase()
        const comm = (it.commentaire || '').toLowerCase()
        return sameDay(dt, now) && (motif.includes('transfert historique') || comm.includes('transfert'))
      }),
    [data]
  )

  const isNegative = totalNet < 0
  const isZero = totalNet === 0
  const transferDisabled = transferLoading || localTransferred || isNegative || isZero || hasTodayTransfer

  const disabledReason =
    isNegative
      ? 'Le total net est négatif — transfert désactivé.'
      : isZero
      ? 'Le total net est nul — rien à transférer.'
      : hasTodayTransfer
      ? 'Un transfert a déjà été effectué aujourd’hui.'
      : transferLoading
      ? 'Transfert en cours…'
      : localTransferred
      ? 'Transfert déjà réalisé.'
      : ''

  const exportCsv = () => {
    const header = ['motif', 'montant', 'type', 'date', 'commentaire']
    const rows = filtered.map((r) => [
      (r.motif ?? '').replaceAll('"', '""'),
      r.montant ?? '',
      r.type ?? '',
      r.date ? formatDateDDMMYYYY(r.date) : '',
      (r.commentaire ?? '').replaceAll('"', '""'),
    ])
    const csv = [header.join(','), ...rows.map((r) => r.map((c) => `"${String(c)}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `caisses_export_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // 🚀 Transférer le total filtré vers la caisse du jour (si autorisé)
  const transferTotalToToday = async () => {
    if (transferDisabled) return
    const motif =
      range.length === 2
        ? `Transfert historique (du ${formatDateDDMMYYYY(range[0].toISOString())} au ${formatDateDDMMYYYY(
            range[1].toISOString()
          )})`
        : range.length === 1
        ? `Transfert historique (du ${formatDateDDMMYYYY(range[0].toISOString())})`
        : 'Transfert historique (global)'

    const payload = {
      motif,
      montant: Math.abs(totalNet),
      type: 'credit', // totalNet > 0 seulement, sinon on ne passe pas ici
      date: now.toISOString(),
      commentaire: 'Transfert depuis l’historique',
    }

    const ok = window.confirm(
      `Confirmer le transfert de + ${fmtMoney(Math.abs(totalNet))} DT vers la caisse d’aujourd’hui ? (opération unique)`
    )
    if (!ok) return

    setTransferLoading(true)
    try {
      const res = await fetch('http://localhost:8170/caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => null)
        throw new Error(text || 'Erreur durant le transfert')
      }
      await res.json().catch(() => null)
      setLocalTransferred(true)
      alert('Transfert effectué avec succès.')
      onTransferred?.()
    } catch (e) {
      console.error(e)
      alert("Impossible d'effectuer le transfert.")
    } finally {
      setTransferLoading(false)
    }
  }

  // reset pagination sur changement filtre/données
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [global, range, data])

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Historique des caisses</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div className="d-flex gap-2 align-items-center">
            <div className="app-search">
              <input
                type="text"
                className="form-control"
                placeholder="Recherche (motif, type, commentaire, montant)"
                value={global}
                onChange={(e) => setGlobal(e.target.value)}
              />
              <LuSearch className="app-search-icon text-muted" />
            </div>
            <Flatpickr
              className="form-control"
              options={{ mode: 'range', dateFormat: 'Y-m-d' }}
              value={range}
              onChange={(dates: Date[]) => setRange(dates)}
            />
            <Button variant="secondary" size="sm" onClick={() => setRange([])}>
              Effacer
            </Button>
          </div>

          <div className="d-flex gap-2 align-items-center">
            <Card className="px-3 py-2">
              <CardHeader className="p-0 border-0">
                <div className="d-flex gap-3">
                  <span className="text-success fw-bold">+ {fmtMoney(totalCredit)} DT</span>
                  <span className="text-danger fw-bold">- {fmtMoney(totalDebit)} DT</span>
                  <span className={`fw-bold ${totalNet >= 0 ? 'text-success' : 'text-danger'}`}>
                    {totalNet >= 0 ? '+' : '-'} {fmtMoney(Math.abs(totalNet))} DT
                  </span>
                </div>
              </CardHeader>
            </Card>
            <Button variant="outline-primary" onClick={exportCsv}>
              Exporter CSV
            </Button>
            <Button
              variant="success"
              onClick={transferTotalToToday}
              disabled={transferDisabled}
              title={disabledReason || 'Transférer le total vers aujourd’hui'}
            >
              {transferLoading ? 'Transfert…' : 'Transférer le total vers aujourd’hui'}
            </Button>
          </div>
        </div>

        <DataTable<Caisse> table={table} emptyMessage="Aucune donnée à afficher" />
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onHide}>
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  )
}
