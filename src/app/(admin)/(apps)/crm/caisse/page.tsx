'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardFooter,
  CardHeader,
  Col,
  Container,
  Row,
  Spinner,
} from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { CgUnavailable } from 'react-icons/cg'
import {
  TbAlertTriangle,
  TbBell,
  TbBellRinging,
  TbCheck,
  TbEdit,
  TbEye,
  TbFileExport,
  TbHistory,
  TbPlus,
  TbRefresh,
  TbTrash,
} from 'react-icons/tb'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import PageBreadcrumb from '@/components/PageBreadcrumb'

import CaisseViewModal from './components/CustomerModalViewDetail'
import CaisseEditModal from './components/CustomerEditModal'
import CaisseAddModal from './components/CustomerModal'
import CaissesHistoryModal from './components/CaissesHistoryModal'
import { exportToExcel, exportToPDF } from './components/exportUtils'

type Caisse = {
  _id: string
  motif: string
  montant: number
  type: string
  date: string | null
  dateCreation?: string
  commentaire: string
  nomutilisatuer: string
  uniqueId?: string

  paymentInvalidated?: boolean
  caisseAlertStatus?: 'none' | 'pending' | 'resolved'
  alertBadge?: string
  invalidatedAt?: string | null
  invalidationReason?: string
  invalidatedSource?: string
  originalMotif?: string
  originalCommentaire?: string
}

type CaisseNotification = {
  _id: string
  type: string
  uniqueId: string
  clientId?: string
  caisseEntryId?: string
  title: string
  message: string
  isRead: boolean
  status: 'active' | 'resolved'
  createdAt?: string | null
  clientCreatedDate?: string | null
  resolvedAt?: string | null
  resolutionSource?: string
}

type User = {
  roles?: string[]
} | null

const columnHelper = createColumnHelper<Caisse>()

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const pad1 = (num: number) => num.toString().padStart(2, '0')

const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

const formatDateTimeDDMMYYYYHHMMSS = (value?: string | null) => {
  if (!value) return '-'

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)

  const day = pad1(d.getDate())
  const month = pad1(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = pad1(d.getHours())
  const minutes = pad1(d.getMinutes())
  const seconds = pad1(d.getSeconds())

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const isCredit = (t?: string) => (t ? /cred/i.test(t) : false)
const isDebit = (t?: string) => (t ? /deb/i.test(t) : false)

const fmtMoney = (v: number) =>
  v.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const isInvalidatedCaisse = (caisse?: Caisse | null) =>
  Boolean(
    caisse?.paymentInvalidated === true ||
      caisse?.caisseAlertStatus === 'pending',
  )

const CustomersCard = () => {
  const [data, setData] = useState<Caisse[]>([])
  const [filteredData, setFilteredData] = useState<Caisse[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [user, setUser] = useState<User>(null)
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedCaisse, setSelectedCaisse] = useState<Caisse | null>(null)
  const [showView, setShowView] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>(
    {},
  )

  const [notifications, setNotifications] = useState<CaisseNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [processingNotificationId, setProcessingNotificationId] = useState<
    string | null
  >(null)
  const [processingCaisseId, setProcessingCaisseId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing user from localStorage:', error)
        setUser(null)
      }
    }
  }, [])

  const isCaissier = user?.roles?.includes('caissier') ?? false

  const fetchCaisses = useCallback(async () => {
    try {
      const res = await fetch('http://192.168.1.15:8170/caisse')
      if (!res.ok) throw new Error('Fetch caisses failed')

      const json = await res.json()

      const normalized: Caisse[] = (Array.isArray(json) ? json : []).map(
        (c: any) => ({
          _id: String(c._id ?? c.id ?? crypto.randomUUID()),
          motif: String(c.motif ?? ''),
          montant: Number(c.montant ?? 0),
          type: String(c.type ?? ''),
          date: c.date ? new Date(c.date).toISOString() : '',
          dateCreation: c.dateCreation ? String(c.dateCreation) : '',
          commentaire: String(c.commentaire ?? ''),
          nomutilisatuer: String(c.nomutilisatuer ?? ''),
          uniqueId: c.uniqueId ? String(c.uniqueId) : '',
          paymentInvalidated: Boolean(c.paymentInvalidated),
          caisseAlertStatus: (c.caisseAlertStatus ?? 'none') as
            | 'none'
            | 'pending'
            | 'resolved',
          alertBadge: String(c.alertBadge ?? ''),
          invalidatedAt: c.invalidatedAt
            ? new Date(c.invalidatedAt).toISOString()
            : null,
          invalidationReason: String(c.invalidationReason ?? ''),
          invalidatedSource: String(c.invalidatedSource ?? ''),
          originalMotif: String(c.originalMotif ?? ''),
          originalCommentaire: String(c.originalCommentaire ?? ''),
        }),
      )

      setData(normalized)
    } catch (err) {
      console.error('Error fetching caisses:', err)
      setData([])
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true)

    try {
      const res = await fetch('http://192.168.1.15:8170/caisse/notifications/all')
      if (!res.ok) throw new Error('Fetch notifications failed')

      const json = await res.json()

      const normalized: CaisseNotification[] = (Array.isArray(json) ? json : []).map(
        (n: any) => ({
          _id: String(n._id ?? n.id ?? crypto.randomUUID()),
          type: String(n.type ?? ''),
          uniqueId: String(n.uniqueId ?? ''),
          clientId: n.clientId ? String(n.clientId) : '',
          caisseEntryId: n.caisseEntryId ? String(n.caisseEntryId) : '',
          title: String(n.title ?? ''),
          message: String(n.message ?? ''),
          isRead: Boolean(n.isRead),
          status: (n.status ?? 'active') as 'active' | 'resolved',
          createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
          clientCreatedDate: n.clientCreatedDate
            ? new Date(n.clientCreatedDate).toISOString()
            : null,
          resolvedAt: n.resolvedAt ? new Date(n.resolvedAt).toISOString() : null,
          resolutionSource: String(n.resolutionSource ?? ''),
        }),
      )

      setNotifications(normalized)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(
        'http://192.168.1.15:8170/caisse/notifications/unread-count',
      )
      if (!res.ok) throw new Error('Fetch unread count failed')

      const json = await res.json()
      setUnreadCount(Number(json?.unread ?? 0))
    } catch (error) {
      console.error('Error fetching unread count:', error)
      setUnreadCount(0)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchCaisses(),
      fetchNotifications(),
      fetchUnreadCount(),
    ])
  }, [fetchCaisses, fetchNotifications, fetchUnreadCount])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const handleRefetchAfterSave = useCallback(async () => {
    await refreshAll()
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [refreshAll])

  useEffect(() => {
    let result = [...data]

    if (globalFilter.trim() !== '') {
      const term = globalFilter.trim().toLowerCase()

      result = result.filter((item) => {
        const motif = item.motif?.toLowerCase() ?? ''
        const type = item.type?.toLowerCase() ?? ''
        const commentaire = item.commentaire?.toLowerCase() ?? ''
        const nomutilisatuer = item.nomutilisatuer?.toLowerCase() ?? ''
        const montant = String(item.montant ?? '').toLowerCase()
        const alertBadge = item.alertBadge?.toLowerCase() ?? ''
        const invalidationReason = item.invalidationReason?.toLowerCase() ?? ''

        return (
          motif.includes(term) ||
          type.includes(term) ||
          commentaire.includes(term) ||
          nomutilisatuer.includes(term) ||
          montant.includes(term) ||
          alertBadge.includes(term) ||
          invalidationReason.includes(term)
        )
      })
    }

    if (selectedDates.length === 1) {
      const d = startOfDay(selectedDates[0])
      result = result.filter((item) => {
        if (!item.date) return false
        const dt = startOfDay(new Date(item.date))
        return sameDay(dt, d)
      })
    } else if (selectedDates.length === 2) {
      const start = startOfDay(selectedDates[0])
      const end = addDays(startOfDay(selectedDates[1]), 1)

      result = result.filter((item) => {
        if (!item.date) return false
        const dt = new Date(item.date)
        return dt >= start && dt < end
      })
    }

    setFilteredData(result)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [globalFilter, selectedDates, data])

  const filteredCredit = filteredData
    .filter((it) => isCredit(it.type))
    .reduce((a, b) => a + (b.montant || 0), 0)

  const filteredDebit = filteredData
    .filter((it) => isDebit(it.type))
    .reduce((a, b) => a + (b.montant || 0), 0)

  const filteredNet = filteredCredit - filteredDebit

  const handleExportPDF = useCallback(() => {
    const exportData = filteredData.map((item) => ({
      // Alerte: isInvalidatedCaisse(item)
      //   ? item.alertBadge || 'Client marqué non payé'
      //   : '',
      Motif: item.motif,
      Montant: `${isCredit(item.type) ? '+' : '-'} ${fmtMoney(
        Math.abs(item.montant),
      )} DT`,
      Type: isCredit(item.type) ? 'Crédit' : 'Débit',
      Date: formatDateDDMMYYYY(item.date),
      Commentaire: item.commentaire,
      // nomutilisatuer: item.nomutilisatuer,
    }))

    const totalCredit = filteredData
      .filter((it) => isCredit(it.type))
      .reduce((a, b) => a + (b.montant || 0), 0)

    const totalDebit = filteredData
      .filter((it) => isDebit(it.type))
      .reduce((a, b) => a + (b.montant || 0), 0)

    const totalNet = totalCredit - totalDebit

    const totals = {
      'Total Crédit': totalCredit,
      'Total Débit': totalDebit,
      'Total Net': totalNet,
    }

    exportToPDF(
      exportData,
      '',
      `Caisses - ${
        selectedDates.length === 1
          ? formatDateDDMMYYYY(selectedDates[0].toISOString())
          : selectedDates.length === 2
            ? `${formatDateDDMMYYYY(
                selectedDates[0].toISOString(),
              )} à ${formatDateDDMMYYYY(selectedDates[1].toISOString())}`
            : 'Toutes les dates'
      }`,
      totals,
    )
  }, [filteredData, selectedDates])

  const handleExportExcel = useCallback(() => {
    const exportData = filteredData.map((item) => ({
      Alerte: isInvalidatedCaisse(item)
        ? item.alertBadge || 'Client marqué non payé'
        : '',
      Motif: item.motif,
      Montant: item.montant,
      Type: isCredit(item.type) ? 'Crédit' : 'Débit',
      Date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
      Commentaire: item.commentaire,
      // nomutilisatuer: item.nomutilisatuer,
      Signe: isCredit(item.type) ? '+' : '-',
    }))

    const totals = [
      {
        Motif: 'TOTAUX',
        'Total Crédit': filteredData
          .filter((it) => isCredit(it.type))
          .reduce((a, b) => a + (b.montant || 0), 0),
        'Total Débit': filteredData
          .filter((it) => isDebit(it.type))
          .reduce((a, b) => a + (b.montant || 0), 0),
        'Total Net': filteredNet,
      },
    ]

    exportToExcel(
      exportData,
      'Caisses',
      `Rapport_Caisses_${new Date().toISOString().split('T')[0]}`,
      totals,
    )
  }, [filteredData, filteredNet])

  const handleMarkNotificationAsRead = useCallback(
    async (notificationId: string) => {
      try {
        setProcessingNotificationId(notificationId)

        const res = await fetch(
          `http://192.168.1.15:8170/caisse/notifications/${notificationId}/read`,
          { method: 'PATCH' },
        )

        if (!res.ok) throw new Error('Impossible de marquer la notification comme lue')

        await Promise.allSettled([fetchNotifications(), fetchUnreadCount()])
      } catch (error) {
        console.error('Erreur lecture notification:', error)
        alert('Erreur lors de la mise à jour de la notification')
      } finally {
        setProcessingNotificationId(null)
      }
    },
    [fetchNotifications, fetchUnreadCount],
  )

  const handleResolveAlertByCaisseId = useCallback(
    async (caisseId: string) => {
      try {
        setProcessingCaisseId(caisseId)

        const res = await fetch(`http://192.168.1.15:8170/caisse/${caisseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolveClientPaymentAlert: true,
          }),
        })

        if (!res.ok) throw new Error('Impossible de corriger cette ligne')

        await refreshAll()
      } catch (error) {
        console.error('Erreur correction alerte caisse:', error)
        alert('Erreur lors de la correction de la ligne caisse')
      } finally {
        setProcessingCaisseId(null)
      }
    },
    [refreshAll],
  )

  const handleResolveNotification = useCallback(
    async (notification: CaisseNotification) => {
      try {
        setProcessingNotificationId(notification._id)

        if (notification.caisseEntryId) {
          await handleResolveAlertByCaisseId(notification.caisseEntryId)
          return
        }

        const res = await fetch(
          `http://192.168.1.15:8170/caisse/notifications/${notification._id}/resolve`,
          { method: 'PATCH' },
        )

        if (!res.ok) throw new Error('Impossible de clôturer la notification')

        await Promise.allSettled([fetchNotifications(), fetchUnreadCount()])
      } catch (error) {
        console.error('Erreur résolution notification:', error)
        alert('Erreur lors de la clôture de la notification')
      } finally {
        setProcessingNotificationId(null)
      }
    },
    [fetchNotifications, fetchUnreadCount, handleResolveAlertByCaisseId],
  )

  const activeNotifications = notifications.filter((n) => n.status === 'active')
  const activeAlertsCount = data.filter((item) => isInvalidatedCaisse(item)).length

  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<Caisse> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<Caisse> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'alert',
      header: 'Alerte',
      cell: ({ row }: { row: TableRow<Caisse> }) => {
        const caisse = row.original
        const isAlerted = isInvalidatedCaisse(caisse)

        if (!isAlerted) {
          return <span className="text-muted small">—</span>
        }

        return (
          <div className="d-inline-flex align-items-center gap-1 px-1 py-0 rounded">
            <Spinner animation="grow" size="sm" variant="danger" style={{ width: 8, height: 8 }} />
            <Badge bg="danger" pill className="fw-normal" style={{ fontSize: '0.68rem' }}>
              {caisse.alertBadge?.trim() || 'Non payé'}
            </Badge>
          </div>
        )
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
    columnHelper.accessor('motif', {
      header: 'Motif',
      cell: (ctx) => {
        const caisse = ctx.row.original
        const isAlerted = isInvalidatedCaisse(caisse)

        return (
          <div
            className="px-2 py-1 rounded"
            style={
              isAlerted
                ? {
                    background: 'rgba(220, 53, 69, 0.06)',
                    borderLeft: '3px solid #dc3545',
                  }
                : undefined
            }
          >
            <span className={`fw-semibold ${isAlerted ? 'text-danger' : ''}`}>
              {ctx.getValue()}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor('montant', {
      header: 'Montant',
      cell: (ctx) => {
        const row = ctx.row.original
        const value = Number(ctx.getValue() ?? 0)
        const isCred = isCredit(row.type)
        const sign = isCred ? '+' : '-'
        const isAlerted = isInvalidatedCaisse(row)

        return (
          <span
            className={`fw-bold ${
              isAlerted ? 'text-danger' : isCred ? 'text-success' : 'text-danger'
            }`}
          >
            {sign} {fmtMoney(Math.abs(value))} DT
          </span>
        )
      },
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: (ctx) => {
        const t = String(ctx.getValue() ?? '').toLowerCase()
        const isCred = isCredit(t)
        const caisse = ctx.row.original
        const isAlerted = isInvalidatedCaisse(caisse)

        return (
          <div className="d-flex flex-column gap-1">
            <Badge bg={isCred ? 'success' : 'danger'} pill className="text-uppercase">
              {isCred ? 'Crédit' : 'Débit'}
            </Badge>
            {isAlerted && (
              <Badge bg="warning" pill text="dark" style={{ fontSize: '0.65rem' }}>
                En attente
              </Badge>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: (ctx) => {
        const caisse = ctx.row.original
        const isAlerted = isInvalidatedCaisse(caisse)

        return (
          <span className={isAlerted ? 'text-danger fw-semibold' : ''}>
            {formatDateTimeDDMMYYYYHHMMSS(ctx.getValue())}
          </span>
        )
      },
    }),
    columnHelper.accessor('commentaire', {
      header: 'Commentaire',
      cell: (ctx) => {
        const caisse = ctx.row.original
        const isAlerted = isInvalidatedCaisse(caisse)

        return (
          <div
            className={`${isAlerted ? 'text-danger fw-semibold' : 'text-muted'}`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {ctx.getValue()}
          </div>
        )
      },
    }),
    columnHelper.accessor('nomutilisatuer', {
      header: 'Ajouter Par',
      cell: (ctx) => {
        const raw = String(ctx.getValue() ?? '')
        const username = raw.split('@')[0] || 'N/A'
        return <Badge bg="danger">{username}</Badge>
      },
    }),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: TableRow<Caisse> }) => {
        const caisse = row.original

        const isProtectedMotif =
          caisse.motif === 'Payment Client' ||
          caisse.motif === 'Paiement Employé' ||
          caisse.originalMotif === 'Payment Client' ||
          caisse.originalMotif === 'Paiement Employé'

        const actionsDisabled = isCaissier && isProtectedMotif
        const isAlerted = isInvalidatedCaisse(caisse)

        return (
          <div className="d-flex align-items-center gap-1 flex-nowrap">
            <Button
              variant="default"
              size="sm"
              className="px-2"
              onClick={() => {
                setSelectedCaisse(row.original)
                setShowView(true)
              }}
              title="Voir"
            >
              <TbEye className="fs-lg" />
            </Button>

            {!actionsDisabled && (
              <Button
                variant="default"
                size="sm"
                className="px-2"
                onClick={() => {
                  setSelectedCaisse(row.original)
                  setShowEdit(true)
                }}
                title="Modifier"
              >
                <TbEdit className="fs-lg" />
              </Button>
            )}

            {!actionsDisabled && isAlerted && (
              <Button
                variant="warning"
                size="sm"
                className="px-2"
                onClick={() => handleResolveAlertByCaisseId(caisse._id)}
                disabled={processingCaisseId === caisse._id}
                title="Corriger"
              >
                {processingCaisseId === caisse._id ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <TbCheck className="fs-lg" />
                )}
              </Button>
            )}

            {!actionsDisabled && (
              <Button
                variant="danger"
                size="sm"
                className="px-2"
                disabled
                onClick={() => {
                  setSelectedRowIds({ [row.id]: true })
                  setShowDeleteModal(true)
                }}
                title="Supprimer"
              >
                <TbTrash className="fs-lg" />
              </Button>
            )}

            {actionsDisabled && (
              <span title="Action restreinte pour les caissiers sur ce motif">
                <CgUnavailable className="fs-lg text-secondary" />
              </span>
            )}
          </div>
        )
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = filteredData.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  const handleDelete = async () => {
    const selectedRows = table.getSelectedRowModel().flatRows
    const idsToDelete = new Set<string>(selectedRows.map((r) => r.original._id))

    if (isCaissier) {
      const hasProtected = selectedRows.some(
        (row) =>
          row.original.motif === 'Payment Client' ||
          row.original.motif === 'Paiement Employé' ||
          row.original.originalMotif === 'Payment Client' ||
          row.original.originalMotif === 'Paiement Employé',
      )

      if (hasProtected) {
        console.error(
          "Caissier a tenté de supprimer un motif protégé. Opération annulée.",
        )
        alert(
          "Vous n'êtes pas autorisé à supprimer les motifs 'Payment Client' ou 'Paiement Employé'.",
        )
        setSelectedRowIds({})
        setShowDeleteModal(false)
        return
      }
    }

    await Promise.all(
      [...idsToDelete].map((id) =>
        fetch(`http://192.168.1.15:8170/caisse/${id}`, {
          method: 'DELETE',
        }).catch(() => null),
      ),
    )

    setData((old) => old.filter((item) => !idsToDelete.has(item._id)))
    setSelectedRowIds({})
    setShowDeleteModal(false)
    await Promise.allSettled([fetchNotifications(), fetchUnreadCount()])
  }

  const today = new Date()
  const todaysItems = data.filter((d) =>
    d.date ? sameDay(new Date(d.date), today) : false,
  )

  const totalCreditToday = todaysItems
    .filter((it) => isCredit(it.type))
    .reduce((acc, it) => acc + (Number(it.montant) || 0), 0)

  const totalDebitToday = todaysItems
    .filter((it) => isDebit(it.type))
    .reduce((acc, it) => acc + (Number(it.montant) || 0), 0)

  const totalTodayNet = totalCreditToday - totalDebitToday

  const applyQuickRange = (mode: 'today' | '7d' | '30d' | 'all') => {
    const now = new Date()
    if (mode === 'today') return setSelectedDates([now])
    if (mode === '7d') return setSelectedDates([addDays(now, -6), now])
    if (mode === '30d') return setSelectedDates([addDays(now, -29), now])
    return setSelectedDates([])
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Caisses" subtitle="CRM" />

      <Row className="mb-4 align-items-center">
        <Col />
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" onClick={refreshAll}>
            <TbRefresh className="me-1" /> Actualiser
          </Button>
        </Col>
      </Row>

      {(activeNotifications.length > 0 || activeAlertsCount > 0) && (
        <Row className="mb-3">
          <Col xs={12}>
            <Card
              className="border-danger"
              style={{ background: 'rgba(220, 53, 69, 0.04)' }}
            >
              <CardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-danger py-2">
                <div className="d-flex align-items-center gap-2">
                  {unreadCount > 0 ? (
                    <TbBellRinging className="text-danger fs-5" />
                  ) : (
                    <TbBell className="text-danger fs-5" />
                  )}
                  <span className="fw-bold text-danger">
                    Alertes caisse
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Badge bg="danger">{activeAlertsCount} en attente</Badge>
                  <Badge bg={unreadCount > 0 ? 'warning' : 'secondary'}>
                    {unreadCount} non lue(s)
                  </Badge>
                </div>
              </CardHeader>

              <div className="p-2">
                {loadingNotifications ? (
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <Spinner animation="border" size="sm" />
                    Chargement...
                  </div>
                ) : activeNotifications.length === 0 ? (
                  <Alert variant="warning" className="mb-0 py-2">
                    <div className="d-flex align-items-center gap-2">
                      <TbAlertTriangle />
                      <span>
                        Des lignes sont signalées dans la caisse.
                      </span>
                    </div>
                  </Alert>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {activeNotifications.map((notification) => (
                      <Alert
                        key={notification._id}
                        variant={notification.isRead ? 'warning' : 'danger'}
                        className="mb-0 py-2"
                      >
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                            <div>
                              <div className="fw-bold">{notification.title}</div>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {notification.message}
                              </div>

                              {notification.clientCreatedDate && (
                                <div className="mt-1">
                                  <Badge bg="secondary">
                                    Date client : {formatDateDDMMYYYY(notification.clientCreatedDate)}
                                  </Badge>
                                </div>
                              )}

                              {notification.createdAt && (
                                <small className="text-muted d-block mt-1">
                                  Date notification : {formatDateTimeDDMMYYYYHHMMSS(notification.createdAt)}
                                </small>
                              )}
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                              {!notification.isRead && (
                                <Button
                                  size="sm"
                                  variant="outline-dark"
                                  disabled={processingNotificationId === notification._id}
                                  onClick={() =>
                                    handleMarkNotificationAsRead(notification._id)
                                  }
                                >
                                  {processingNotificationId === notification._id ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    'Marquer lue'
                                  )}
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="success"
                                disabled={processingNotificationId === notification._id}
                                onClick={() => handleResolveNotification(notification)}
                              >
                                {processingNotificationId === notification._id ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  'Clôturer / Corriger'
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="g-3">
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Total net (Aujourd'hui)
              <span
                className={`fw-bold ${
                  totalTodayNet >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {totalTodayNet >= 0 ? '+' : '-'} {fmtMoney(Math.abs(totalTodayNet))} DT
              </span>
            </CardHeader>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Crédit (Aujourd'hui)
              <span className="fw-bold text-success">
                + {fmtMoney(totalCreditToday)} DT
              </span>
            </CardHeader>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Débit (Aujourd'hui)
              <span className="fw-bold text-danger">
                - {fmtMoney(totalDebitToday)} DT
              </span>
            </CardHeader>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Total (Filtre courant)
              <span
                className={`fw-bold ${
                  filteredNet >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {filteredNet >= 0 ? '+' : '-'} {fmtMoney(Math.abs(filteredNet))} DT
              </span>
            </CardHeader>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Motif, Type, Commentaire, Alerte ..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                <Button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                  <TbPlus className="fs-lg" /> Ajouter une caisse
                </Button>

                <Button variant="outline-secondary" onClick={() => setShowHistory(true)}>
                  <TbHistory className="me-1" /> Historique
                </Button>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                <ButtonGroup aria-label="Export buttons">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={handleExportExcel}
                    title="Exporter en Excel"
                  >
                    <TbFileExport className="me-1" /> Excel
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleExportPDF}
                    title="Exporter en PDF"
                  >
                    <TbFileExport className="me-1" /> PDF
                  </Button>
                </ButtonGroup>

                <ButtonGroup aria-label="Quick ranges">
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={() => applyQuickRange('today')}
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={() => applyQuickRange('7d')}
                  >
                    7j
                  </Button>
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={() => applyQuickRange('30d')}
                  >
                    30j
                  </Button>
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={() => applyQuickRange('all')}
                  >
                    Tout
                  </Button>
                </ButtonGroup>

                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">Date</span>
                  <Flatpickr
                    className="form-control"
                    options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                    value={selectedDates}
                    onChange={(dates: Date[]) => setSelectedDates(dates)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedDates([])}
                  >
                    <CgUnavailable />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <DataTable<Caisse> table={table} emptyMessage="Aucune caisse trouvée" />

            <CardFooter className="border-0">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div />
                <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 ms-auto">
                  <div className="d-flex align-items-center gap-2">
                    <label className="mb-0 text-muted small">Lignes</label>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 90 }}
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => {
                        table.setPageSize(Number(e.target.value))
                      }}
                    >
                      {[5, 8, 10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <TablePagination
                    totalItems={totalItems}
                    start={start}
                    end={end}
                    itemsName="caisses"
                    showInfo
                    previousPage={table.previousPage}
                    canPreviousPage={table.getCanPreviousPage()}
                    pageCount={table.getPageCount()}
                    pageIndex={table.getState().pagination.pageIndex}
                    setPageIndex={table.setPageIndex}
                    nextPage={table.nextPage}
                    canNextPage={table.getCanNextPage()}
                  />
                </div>
              </div>
            </CardFooter>

            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={() => setShowDeleteModal(false)}
              onConfirm={handleDelete}
              selectedCount={table.getSelectedRowModel().flatRows.length}
              itemName="caisses"
            />
          </Card>
        </Col>
      </Row>

      <CaisseAddModal
        show={showAdd}
        onHide={() => setShowAdd(false)}
        onAdded={handleRefetchAfterSave}
      />

      <CaisseViewModal
        show={showView}
        onHide={() => setShowView(false)}
        caisse={selectedCaisse}
      />

      <CaisseEditModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        caisse={selectedCaisse}
        onUpdated={handleRefetchAfterSave}
        isCaissier={isCaissier}
      />

      <CaissesHistoryModal
        show={showHistory}
        onHide={() => setShowHistory(false)}
        data={data}
      />
    </Container>
  )
}

export default CustomersCard