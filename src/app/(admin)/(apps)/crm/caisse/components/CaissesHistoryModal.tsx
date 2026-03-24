'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
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
  Form,
  Row,
  Col,
} from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'
import { LuSearch } from 'react-icons/lu'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

type Caisse = {
  _id: string
  motif: string
  montant: number
  type: string
  uniqueId?: string
  date: string | null
  commentaire: string
  nomutilisatuer: string
}

const columnHelper = createColumnHelper<Caisse>()

/* ========================= Utils ========================= */

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatDateTimeDDMMYYYYHHMM = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}`
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const isCredit = (t?: string) => (t ? /cred/i.test(t) : false)
const isDebit = (t?: string) => (t ? /deb/i.test(t) : !isCredit(t))

const fmtMoney = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const safeUserLabel = (email?: string) => {
  if (!email || typeof email !== 'string') return '—'
  const idx = email.indexOf('@')
  return idx > 0 ? email.slice(0, idx) : email
}

const shortId = (id?: string) => {
  if (!id) return '—'
  return id.length > 6 ? id.slice(-6) : id
}

const extractClientNameFromComment = (comment?: string) => {
  const txt = String(comment || '')
  const m = txt.match(/payment\s+de\s+Client\s*:\s*(.+?)\s+Téléphone\s*:/i)
  if (m && m[1]) return m[1].trim()
  return ''
}

const normalize = (s: any) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

/* ========================= Grouping ========================= */

type GroupRow = {
  groupKey: string
  groupLabel: string
  count: number
  total: number
  lastDate: string | null
  firstDate: string | null
  kind: 'PAYMENT_CLIENT'
  items: Caisse[]
}

const groupHelper = createColumnHelper<GroupRow>()

/* ========================= Details Modal ========================= */

function GroupDetailsModal({
  show,
  onHide,
  group,
}: {
  show: boolean
  onHide: () => void
  group: GroupRow | null
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    if (show) setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [show, group?.groupKey])

  const rows = useMemo(() => group?.items ?? [], [group])

  const cols = useMemo(
    () => [
      columnHelper.accessor('_id', {
        header: 'ID',
        cell: (ctx) => <span className="text-muted">…{shortId(ctx.getValue())}</span>,
      }),
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (ctx) => <span className="text-muted">{formatDateTimeDDMMYYYYHHMM(ctx.getValue())}</span>,
      }),
      columnHelper.accessor('motif', {
        header: 'Motif',
        cell: (ctx) => <span className="fw-semibold">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('montant', {
        header: 'Montant',
        cell: (ctx) => {
          const row = ctx.row.original
          const v = Number(ctx.getValue() ?? 0)
          const cred = isCredit(row.type)
          const sign = cred ? '+' : '-'
          return (
            <span className={`fw-bold ${cred ? 'text-success' : 'text-danger'}`}>
              {sign} {fmtMoney(Math.abs(v))} DT
            </span>
          )
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (ctx) => {
          const t = String(ctx.getValue() ?? '').toLowerCase()
          const cred = isCredit(t)
          return (
            <Badge bg={cred ? 'success' : 'danger'} pill className="text-uppercase">
              {cred ? 'Crédit' : 'Débit'}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('commentaire', {
        header: 'Commentaire',
        cell: (ctx) => <span className="text-muted">{ctx.getValue() || '-'}</span>,
      }),
      columnHelper.accessor('nomutilisatuer', {
        header: 'Ajouté par',
        cell: (ctx) => <Badge bg="secondary">{safeUserLabel(ctx.getValue())}</Badge>,
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: rows,
    columns: cols as any,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = rows.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <ModalHeader closeButton>
        <ModalTitle as="h5">
          Détails — {group?.groupLabel || 'Groupe'}
          {group?.count ? (
            <Badge bg="primary" className="ms-2">
              {group.count} ligne(s)
            </Badge>
          ) : null}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <DataTable<Caisse> table={table} emptyMessage="Aucune ligne." />
        <div className="mt-2">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="lignes"
            showInfo
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={table.getState().pagination.pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
            pageSize={pageSize}
            setPageSize={table.setPageSize}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  )
}

/* ========================= Main ========================= */

export default function CaissesHistoryModal({
  show,
  onHide,
  data,
}: {
  show: boolean
  onHide: () => void
  data: Caisse[]
}) {
  const [global, setGlobal] = useState('')
  const [range, setRange] = useState<Date[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [groupPayments, setGroupPayments] = useState(true)

  // ✅ pagination séparée (important)
  const [pagClients, setPagClients] = useState({ pageIndex: 0, pageSize: 10 })
  const [pagOthers, setPagOthers] = useState({ pageIndex: 0, pageSize: 10 })

  const [groupDetailOpen, setGroupDetailOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)

  useEffect(() => {
    if (!show) return
    setGlobal('')
    setRange([])
    setSorting([])
    setPagClients((p) => ({ ...p, pageIndex: 0 }))
    setPagOthers((p) => ({ ...p, pageIndex: 0 }))
  }, [show])

  // Filtre global + date
  const filtered = useMemo(() => {
    let res = [...(Array.isArray(data) ? data : [])]

    if (global.trim() !== '') {
      const term = normalize(global)
      res = res.filter((item) => {
        const motif = normalize(item.motif)
        const type = normalize(item.type)
        const commentaire = normalize(item.commentaire)
        const nomu = normalize(item.nomutilisatuer)
        const montant = normalize(item.montant)
        const id = normalize(item._id)
        const uid = normalize(item.uniqueId)
        return (
          motif.includes(term) ||
          type.includes(term) ||
          commentaire.includes(term) ||
          nomu.includes(term) ||
          montant.includes(term) ||
          id.includes(term) ||
          uid.includes(term)
        )
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
      const end = addDays(startOfDay(range[1]), 1)
      res = res.filter((item) => {
        if (!item.date) return false
        const dt = new Date(item.date)
        return dt >= start && dt < end
      })
    }

    // tri date desc (si rien)
    res.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      return db - da
    })

    return res
  }, [data, global, range])

  const paymentClients = useMemo(
    () => filtered.filter((x) => normalize(x.motif) === normalize('Payment Client')),
    [filtered],
  )

  const otherMoves = useMemo(
    () => filtered.filter((x) => normalize(x.motif) !== normalize('Payment Client')),
    [filtered],
  )

  const stats = useMemo(() => {
    const calc = (arr: Caisse[]) => {
      const credit = arr.filter((it) => isCredit(it.type)).reduce((a, b) => a + (b.montant || 0), 0)
      const debit = arr.filter((it) => isDebit(it.type)).reduce((a, b) => a + (b.montant || 0), 0)
      return { credit, debit, net: credit - debit, count: arr.length }
    }
    return {
      payments: calc(paymentClients),
      others: calc(otherMoves),
      global: calc(filtered),
    }
  }, [paymentClients, otherMoves, filtered])

  // ✅ reset paginations quand filtres changent
  useEffect(() => {
    setPagClients((p) => ({ ...p, pageIndex: 0 }))
    setPagOthers((p) => ({ ...p, pageIndex: 0 }))
  }, [global, range, data, groupPayments])

  // Grouped rows for payments
  const groupedRows = useMemo<GroupRow[]>(() => {
    const map = new Map<string, GroupRow>()
    for (const item of paymentClients) {
      const uid = item.uniqueId ? String(item.uniqueId) : ''
      const name = extractClientNameFromComment(item.commentaire) || ''
      const key = uid || (name ? `NAME:${name}` : `UNKNOWN:${item._id}`)
      const label = uid ? `Client ID: …${shortId(uid)}` : name ? `Client: ${name}` : `Client: (inconnu)`

      const d = item.date ? new Date(item.date) : null
      const dateStr = d && !isNaN(d.getTime()) ? item.date : null

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          groupLabel: label,
          count: 0,
          total: 0,
          firstDate: dateStr,
          lastDate: dateStr,
          kind: 'PAYMENT_CLIENT',
          items: [],
        })
      }

      const g = map.get(key)!
      g.items.push(item)
      g.count += 1
      g.total += Number(item.montant || 0)

      const t = d && !isNaN(d.getTime()) ? d.getTime() : 0
      const firstT = g.firstDate ? new Date(g.firstDate).getTime() : t
      const lastT = g.lastDate ? new Date(g.lastDate).getTime() : t
      if (!g.firstDate || t < firstT) g.firstDate = item.date
      if (!g.lastDate || t > lastT) g.lastDate = item.date
    }

    const arr = Array.from(map.values())
    arr.sort((a, b) => {
      const da = a.lastDate ? new Date(a.lastDate).getTime() : 0
      const db = b.lastDate ? new Date(b.lastDate).getTime() : 0
      return db - da
    })
    return arr
  }, [paymentClients])

  // columns common (Caisse)
  const caisseColumns = useMemo(
    () => [
      columnHelper.accessor('_id', {
        header: 'ID',
        cell: (ctx) => <span className="text-muted">…{shortId(ctx.getValue())}</span>,
      }),
      columnHelper.accessor('motif', {
        header: 'Motif',
        cell: (ctx) => <span className="fw-semibold">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('montant', {
        header: 'Montant',
        cell: (ctx) => {
          const row = ctx.row.original
          const v = Number(ctx.getValue() ?? 0)
          const cred = isCredit(row.type)
          const sign = cred ? '+' : '-'
          return (
            <span className={`fw-bold ${cred ? 'text-success' : 'text-danger'}`}>
              {sign} {fmtMoney(Math.abs(v))} DT
            </span>
          )
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (ctx) => {
          const t = String(ctx.getValue() ?? '').toLowerCase()
          const cred = isCredit(t)
          return (
            <Badge bg={cred ? 'success' : 'danger'} pill className="text-uppercase">
              {cred ? 'Crédit' : 'Débit'}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (ctx) => <span className="text-muted">{formatDateTimeDDMMYYYYHHMM(ctx.getValue())}</span>,
      }),
      columnHelper.accessor('commentaire', {
        header: 'Commentaire',
        cell: (ctx) => {
          const v = String(ctx.getValue() ?? '')
          if (!v.trim()) return <span className="text-muted">-</span>
          const short = v.length > 70 ? `${v.slice(0, 70)}…` : v
          return (
            <span className="text-muted" title={v}>
              {short}
            </span>
          )
        },
      }),
      columnHelper.accessor('nomutilisatuer', {
        header: 'Ajouté par',
        cell: (ctx) => <Badge bg="secondary">{safeUserLabel(ctx.getValue())}</Badge>,
      }),
    ],
    [],
  )

  // columns group
  const groupColumns = useMemo(
    () => [
      groupHelper.accessor('groupLabel', {
        header: 'Client',
        cell: (ctx) => <span className="fw-semibold">{ctx.getValue()}</span>,
      }),
      groupHelper.accessor('count', {
        header: 'Nb',
        cell: (ctx) => <Badge bg="primary">{ctx.getValue()}</Badge>,
      }),
      groupHelper.accessor('total', {
        header: 'Total',
        cell: (ctx) => <span className="fw-bold text-success">+ {fmtMoney(ctx.getValue())} DT</span>,
      }),
      groupHelper.accessor('lastDate', {
        header: 'Dernier paiement',
        cell: (ctx) => <span className="text-muted">{formatDateTimeDDMMYYYYHHMM(ctx.getValue())}</span>,
      }),
      groupHelper.display({
        id: 'actions',
        header: 'Détails',
        cell: (ctx) => (
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => {
              setSelectedGroup(ctx.row.original)
              setGroupDetailOpen(true)
            }}
          >
            Voir
          </Button>
        ),
      }),
    ],
    [],
  )

  // ✅ tables
  const tablePaymentsGrouped = useReactTable({
    data: groupedRows,
    columns: groupColumns as any,
    state: { pagination: pagClients, sorting },
    onPaginationChange: setPagClients,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const tablePaymentsRaw = useReactTable({
    data: paymentClients,
    columns: caisseColumns as any,
    state: { pagination: pagClients, sorting },
    onPaginationChange: setPagClients,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const tableOthers = useReactTable({
    data: otherMoves,
    columns: caisseColumns as any,
    state: { pagination: pagOthers, sorting },
    onPaginationChange: setPagOthers,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // helpers pagination
  const pagInfo = (total: number, pag: { pageIndex: number; pageSize: number }) => {
    const start = total === 0 ? 0 : pag.pageIndex * pag.pageSize + 1
    const end = Math.min((pag.pageIndex + 1) * pag.pageSize, total)
    return { start, end }
  }

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">Historique des caisses</ModalTitle>
        </ModalHeader>

        <ModalBody>
          {/* filtres */}
          <Row className="g-2 align-items-end mb-3">
            <Col lg={5}>
              <div className="app-search">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Recherche (motif, type, commentaire, montant, id, uniqueId, user)"
                  value={global}
                  onChange={(e) => setGlobal(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </Col>

            <Col lg={4}>
              <Flatpickr
                className="form-control"
                options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                value={range}
                onChange={(dates: Date[]) => setRange(dates)}
              />
            </Col>

            <Col lg={3} className="d-flex gap-2">
              <Button variant="secondary" onClick={() => setRange([])} className="w-100">
                Effacer date
              </Button>
            </Col>
          </Row>

          {/* stats global */}
          <Row className="g-2 mb-3">
            <Col md={4}>
              <Card className="p-2">
                <div className="fw-semibold mb-1">Payments Clients</div>
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg="success">Crédit +{fmtMoney(stats.payments.credit)} DT</Badge>
                  <Badge bg="danger">Débit -{fmtMoney(stats.payments.debit)} DT</Badge>
                  <Badge bg={stats.payments.net >= 0 ? 'success' : 'danger'}>
                    Net {stats.payments.net >= 0 ? '+' : '-'}{fmtMoney(Math.abs(stats.payments.net))} DT
                  </Badge>
                  <Badge bg="secondary">Lignes: {stats.payments.count}</Badge>
                </div>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="p-2">
                <div className="fw-semibold mb-1">Autres mouvements</div>
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg="success">Crédit +{fmtMoney(stats.others.credit)} DT</Badge>
                  <Badge bg="danger">Débit -{fmtMoney(stats.others.debit)} DT</Badge>
                  <Badge bg={stats.others.net >= 0 ? 'success' : 'danger'}>
                    Net {stats.others.net >= 0 ? '+' : '-'}{fmtMoney(Math.abs(stats.others.net))} DT
                  </Badge>
                  <Badge bg="secondary">Lignes: {stats.others.count}</Badge>
                </div>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="p-2">
                <div className="fw-semibold mb-1">Total global</div>
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg="success">Crédit +{fmtMoney(stats.global.credit)} DT</Badge>
                  <Badge bg="danger">Débit -{fmtMoney(stats.global.debit)} DT</Badge>
                  <Badge bg={stats.global.net >= 0 ? 'success' : 'danger'}>
                    Net {stats.global.net >= 0 ? '+' : '-'}{fmtMoney(Math.abs(stats.global.net))} DT
                  </Badge>
                  <Badge bg="secondary">Lignes: {stats.global.count}</Badge>
                </div>
              </Card>
            </Col>
          </Row>

          {/* switch */}
          <Card className="p-2 mb-3">
            <Form.Check
              type="switch"
              id="groupPayments"
              label="Grouper Payment Client"
              checked={groupPayments}
              onChange={(e) => setGroupPayments(e.target.checked)}
            />
            <div className="text-muted small">
              Regroupe par <b>uniqueId</b> (si dispo) sinon par <b>nom</b> extrait du commentaire.
            </div>
          </Card>

          {/* ================= Payments Clients ================= */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">Payments Clients</div>
            <div className="text-muted small">
              {groupPayments ? 'Mode: groupé' : 'Mode: non groupé'}
            </div>
          </div>

          {groupPayments ? (
            <>
              <DataTable<GroupRow> table={tablePaymentsGrouped as any} emptyMessage="Aucun paiement client." />
              <div className="mt-2 mb-4">
                {(() => {
                  const total = groupedRows.length
                  const info = pagInfo(total, pagClients)
                  return (
                    <TablePagination
                      totalItems={total}
                      start={info.start}
                      end={info.end}
                      itemsName="groupes"
                      showInfo
                      previousPage={tablePaymentsGrouped.previousPage}
                      canPreviousPage={tablePaymentsGrouped.getCanPreviousPage()}
                      pageCount={tablePaymentsGrouped.getPageCount()}
                      pageIndex={tablePaymentsGrouped.getState().pagination.pageIndex}
                      setPageIndex={tablePaymentsGrouped.setPageIndex}
                      nextPage={tablePaymentsGrouped.nextPage}
                      canNextPage={tablePaymentsGrouped.getCanNextPage()}
                      pageSize={tablePaymentsGrouped.getState().pagination.pageSize}
                      setPageSize={tablePaymentsGrouped.setPageSize}
                    />
                  )
                })()}
              </div>
            </>
          ) : (
            <>
              <DataTable<Caisse> table={tablePaymentsRaw as any} emptyMessage="Aucun paiement client." />
              <div className="mt-2 mb-4">
                {(() => {
                  const total = paymentClients.length
                  const info = pagInfo(total, pagClients)
                  return (
                    <TablePagination
                      totalItems={total}
                      start={info.start}
                      end={info.end}
                      itemsName="lignes"
                      showInfo
                      previousPage={tablePaymentsRaw.previousPage}
                      canPreviousPage={tablePaymentsRaw.getCanPreviousPage()}
                      pageCount={tablePaymentsRaw.getPageCount()}
                      pageIndex={tablePaymentsRaw.getState().pagination.pageIndex}
                      setPageIndex={tablePaymentsRaw.setPageIndex}
                      nextPage={tablePaymentsRaw.nextPage}
                      canNextPage={tablePaymentsRaw.getCanNextPage()}
                      pageSize={tablePaymentsRaw.getState().pagination.pageSize}
                      setPageSize={tablePaymentsRaw.setPageSize}
                    />
                  )
                })()}
              </div>
            </>
          )}

          {/* ================= Others ================= */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">Autres mouvements</div>
            <div className="text-muted small">Toujours non groupé</div>
          </div>

          <DataTable<Caisse> table={tableOthers as any} emptyMessage="Aucune autre ligne." />
          <div className="mt-2">
            {(() => {
              const total = otherMoves.length
              const info = pagInfo(total, pagOthers)
              return (
                <TablePagination
                  totalItems={total}
                  start={info.start}
                  end={info.end}
                  itemsName="lignes"
                  showInfo
                  previousPage={tableOthers.previousPage}
                  canPreviousPage={tableOthers.getCanPreviousPage()}
                  pageCount={tableOthers.getPageCount()}
                  pageIndex={tableOthers.getState().pagination.pageIndex}
                  setPageIndex={tableOthers.setPageIndex}
                  nextPage={tableOthers.nextPage}
                  canNextPage={tableOthers.getCanNextPage()}
                  pageSize={tableOthers.getState().pagination.pageSize}
                  setPageSize={tableOthers.setPageSize}
                />
              )
            })()}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onHide}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      <GroupDetailsModal show={groupDetailOpen} onHide={() => setGroupDetailOpen(false)} group={selectedGroup} />
    </>
  )
}