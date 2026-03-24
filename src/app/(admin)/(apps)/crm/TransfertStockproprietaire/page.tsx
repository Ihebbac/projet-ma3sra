'use client'

import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Row,
  Spinner,
  Form,
  InputGroup,
} from 'react-bootstrap'
import {
  ColumnDef,
  PaginationState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  TbEye,
  TbPrinter,
  TbRefresh,
  TbRepeat,
  TbTrash,
  TbLeaf,
  TbDropletFilled,
  TbArrowsExchange,
  TbCalendar,
  TbUser,
} from 'react-icons/tb'

import TransfertModal from './components/TransfertModal'
import ViewTransactionModal, { printThermalTicket } from './components/ViewTransactionModal'
import { ProprietaireType, TransactionType } from './types'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

const API_BASE_URL = 'http://192.168.1.15:8170'

const formatDateTime = (value?: string | Date) => {
  if (!value) return '-'

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'

  return (
    <div className="d-flex flex-column text-start">
      <span className="fw-medium text-body">{d.toLocaleDateString('fr-FR')}</span>
      <small className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
        {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </small>
    </div>
  )
}

const formatNumber = (value?: number) =>
  Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TransfertStockProprietaire = () => {
  const [proprietaire, setProprietaire] = useState<ProprietaireType | null>(null)
  const [transactions, setTransactions] = useState<TransactionType[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionType[]>([])
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  const [showTransfert, setShowTransfert] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null)

  const [pageError, setPageError] = useState('')
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const fetchProprietaire = async () => {
    const res = await fetch(`${API_BASE_URL}/proprietaires`)
    const data: ProprietaireType[] = await res.json()

    if (!Array.isArray(data) || data.length === 0) {
      setProprietaire({
        _id: 'stock-total-proprietaire',
        nomPrenom: 'STOCK TOTAL',
        quantiteOliveNet: 0,
        quantiteHuile: 0,
      } as ProprietaireType)
      return
    }

    const stockTotal = data.reduce(
      (acc, prop) => ({
        quantiteOliveNet: acc.quantiteOliveNet + Number(prop.quantiteOliveNet || 0),
        quantiteHuile: acc.quantiteHuile + Number(prop.quantiteHuile || 0),
      }),
      { quantiteOliveNet: 0, quantiteHuile: 0 }
    )

    setProprietaire({
      _id: 'stock-total-proprietaire',
      nomPrenom: 'STOCK TOTAL',
      ...stockTotal,
    } as ProprietaireType)
  }

  const fetchTransactions = async () => {
    const res = await fetch(`${API_BASE_URL}/transactions`)
    const data: TransactionType[] = await res.json()

    const sorted = Array.isArray(data)
      ? [...data].sort(
          (a, b) =>
            new Date(b.date || b.createdAt || 0).getTime() -
            new Date(a.date || a.createdAt || 0).getTime()
        )
      : []

    setTransactions(sorted)
  }

  const refreshData = async () => {
    setLoading(true)
    setPageError('')

    try {
      await Promise.all([fetchProprietaire(), fetchTransactions()])
    } catch {
      setPageError('Serveur injoignable à ' + API_BASE_URL)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    const results = transactions.filter((t) => {
      const typeStr = (t.typeStock || t.type || '').toLowerCase()
      const matchType = filterType === 'all' || typeStr === filterType.toLowerCase()

      const rawDate = t.date || t.createdAt
      const parsedDate = rawDate ? new Date(rawDate) : null
      const tDate =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString().split('T')[0]
          : ''

      const matchDate = !filterDate || tDate === filterDate

      return matchType && matchDate
    })

    setFilteredTransactions(results)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [transactions, filterType, filterDate])

  const columns: ColumnDef<TransactionType>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDateTime(row.original.date || row.original.createdAt),
    },
    {
      accessorKey: 'clientNom',
      header: 'Destinataire',
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <TbUser className="me-2 text-body-secondary" size={15} />
          <span className="text-body fw-medium">
            {row.original.clientNom || row.original.nomPrenom || '-'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'typeStock',
      header: 'Produit',
      cell: ({ row }) => {
        const isOlive = (row.original.typeStock || row.original.type) === 'olive'

        return (
          <Badge
            bg=""
            className={`border px-2 py-1 fw-medium d-inline-flex align-items-center ${
              isOlive ? 'text-success border-success-subtle bg-success-subtle' : 'text-warning border-warning-subtle bg-warning-subtle'
            }`}
          >
            {isOlive ? (
              <TbLeaf size={13} className="me-1" />
            ) : (
              <TbDropletFilled size={13} className="me-1" />
            )}
            {isOlive ? 'Olive' : 'Huile'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'quantite',
      header: 'Quantité',
      cell: ({ row }) => (
        <span
          className={`fw-bold ${
            row.original.operation === 'retrait' ? 'text-danger' : 'text-success'
          }`}
        >
          {row.original.operation === 'retrait' ? '-' : '+'} {formatNumber(row.original.quantite)} kg
        </span>
      ),
    },
    {
      accessorKey: 'prixFinal',
      header: 'Valeur (DT)',
      cell: ({ row }) => (
        <span className="fw-semibold text-body">
          {formatNumber(row.original.prixFinal || row.original.prix)} DT
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center">
          <Button
            variant="light"
            size="sm"
            className="border text-body"
            title="Voir détails"
            onClick={() => {
              setSelectedTransaction(row.original)
              setShowView(true)
            }}
          >
            <TbEye className="fs-lg" />
          </Button>

          <Button
            variant="light"
            size="sm"
            className="border text-body"
            title="Imprimer ticket"
            onClick={() => printThermalTicket(row.original)}
          >
            <TbPrinter className="fs-lg" />
          </Button>

          <Button
            variant="light"
            size="sm"
            className="border text-body"
            title="Supprimer"
            onClick={async () => {
              if (window.confirm('Supprimer ?')) {
                try {
                  setDeleteLoadingId(row.original._id || null)

                  await fetch(`${API_BASE_URL}/transactions/${row.original._id}`, {
                    method: 'DELETE',
                  })

                  await refreshData()
                } finally {
                  setDeleteLoadingId(null)
                }
              }
            }}
            disabled={deleteLoadingId === row.original._id}
          >
            {deleteLoadingId === row.original._id ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <TbTrash className="fs-lg" />
            )}
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 className="fw-bold text-body m-0">Stock Propriétaire</h4>

        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-primary" size="sm" onClick={refreshData}>
            <TbRefresh className="me-1" />
            Actualiser
          </Button>

          <Button variant="primary" size="sm" onClick={() => setShowTransfert(true)}>
            <TbRepeat className="me-1" />
            Retrait de stock
          </Button>
        </div>
      </div>

      {pageError ? <Alert variant="danger">{pageError}</Alert> : null}

      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border shadow-sm h-100 bg-body text-body">
            <Card.Body className="d-flex align-items-center py-3">
              <div className="bg-success text-white rounded-circle p-2 me-3">
                <TbLeaf size={20} />
              </div>
              <div>
                <small className="text-body-secondary d-block fw-semibold" style={{ fontSize: '0.72rem' }}>
                  OLIVE NET (KG)
                </small>
                <h4 className="m-0 fw-bold text-body">
                  {formatNumber(proprietaire?.quantiteOliveNet || 0)}
                </h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border shadow-sm h-100 bg-body text-body">
            <Card.Body className="d-flex align-items-center py-3">
              <div className="bg-warning text-white rounded-circle p-2 me-3">
                <TbDropletFilled size={20} />
              </div>
              <div>
                <small className="text-body-secondary d-block fw-semibold" style={{ fontSize: '0.72rem' }}>
                  HUILE (KG)
                </small>
                <h4 className="m-0 fw-bold text-body">
                  {formatNumber(proprietaire?.quantiteHuile || 0)}
                </h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border shadow-sm h-100 bg-body text-body">
            <Card.Body className="d-flex align-items-center py-3">
              <div className="bg-info text-white rounded-circle p-2 me-3">
                <TbArrowsExchange size={20} />
              </div>
              <div>
                <small className="text-body-secondary d-block fw-semibold" style={{ fontSize: '0.72rem' }}>
                  MOUVEMENTS
                </small>
                <h4 className="m-0 fw-bold text-body">{filteredTransactions.length}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border shadow-sm mb-3 bg-body text-body">
        <Card.Body className="py-2 px-3">
          <Row className="g-2 align-items-center">
            <Col md={4}>
              <Form.Select
                size="sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-body text-body border"
              >
                <option value="all">Tous les stocks</option>
                <option value="olive">Olive</option>
                <option value="huile">Huile</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-body text-body-secondary border">
                  <TbCalendar size={14} />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-body text-body border"
                />
              </InputGroup>
            </Col>

            <Col md={2}>
              <Button
                variant="light"
                size="sm"
                className="w-100 border text-body"
                onClick={() => {
                  setFilterType('all')
                  setFilterDate('')
                }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border shadow-sm overflow-hidden bg-body text-body">
        <DataTable<TransactionType> table={table} emptyMessage="Aucun mouvement." />

        <div className="p-3 border-top bg-body-tertiary">
          <TablePagination
            totalItems={filteredTransactions.length}
            start={filteredTransactions.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1}
            end={Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredTransactions.length)}
            itemsName="lignes"
            showInfo
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={pagination.pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
            pageSize={pagination.pageSize}
            setPageSize={table.setPageSize}
          />
        </div>
      </Card>

      <TransfertModal
        show={showTransfert}
        onHide={() => setShowTransfert(false)}
        proprietaire={proprietaire}
        onTransferComplete={refreshData}
      />

      <ViewTransactionModal
        show={showView}
        onHide={() => setShowView(false)}
        transaction={selectedTransaction}
      />
    </div>
  )
}

export default TransfertStockProprietaire