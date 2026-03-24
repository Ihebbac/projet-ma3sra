'use client'

import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Form, Modal } from 'react-bootstrap'
import {
  ColumnDef,
  PaginationState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { TbEye, TbHistory, TbPrinter, TbRefresh, TbSearch, TbTrash } from 'react-icons/tb'

import StockDisplay from './StockDisplay'
import ViewTransactionModal, { printThermalTicket } from './ViewTransactionModal'
import { ProprietaireType, TransactionType } from '../types'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

const API_BASE_URL = 'http://192.168.1.15:8170'

const formatDate = (value?: string | Date) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}

const formatNumber = (value?: number) => Number(value || 0).toFixed(2)

type Props = {
  show: boolean
  onHide: () => void
  proprietaire: ProprietaireType
  transactions: TransactionType[]
  onRefresh?: () => void
}

const HistoriqueModal = ({
  show,
  onHide,
  proprietaire,
  transactions,
  onRefresh,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((transaction: TransactionType) => {
      const searchLower = searchTerm.trim().toLowerCase()

      const dateValue =
        transaction.date ||
        transaction.dateCreation ||
        transaction.createdAt ||
        ''

      const typeValue = transaction.typeStock || transaction.type || ''
      const commentaire = transaction.commentaire || transaction.details || ''
      const nomPrenom = transaction.nomPrenom || transaction.clientNom || ''

      const matchesSearch =
        !searchLower ||
        nomPrenom.toLowerCase().includes(searchLower) ||
        (transaction.motif || '').toLowerCase().includes(searchLower) ||
        commentaire.toLowerCase().includes(searchLower) ||
        typeValue.toLowerCase().includes(searchLower)

      const matchesDate = !filterDate || String(dateValue).startsWith(filterDate)
      const matchesType = !filterType || typeValue === filterType

      return matchesSearch && matchesDate && matchesType
    })
  }, [transactions, searchTerm, filterDate, filterType])

  const handleView = (transaction: TransactionType) => {
    setSelectedTransaction(transaction)
    setShowViewModal(true)
  }

  const handleDelete = async (transaction: TransactionType) => {
    if (!transaction?._id) {
      setActionError('Impossible de supprimer cette ligne : identifiant introuvable.')
      return
    }

    const confirmed = window.confirm('Voulez-vous vraiment supprimer cette transaction ?')
    if (!confirmed) return

    setActionError('')
    setActionSuccess('')
    setDeleteLoadingId(transaction._id)

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transaction._id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la suppression'
        try {
          const errorData = await response.json()
          errorMessage = errorData?.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      setActionSuccess('Transaction supprimée avec succès.')
      onRefresh?.()
    } catch (err: any) {
      console.error(err)
      setActionError(err?.message || 'Une erreur est survenue lors de la suppression.')
    } finally {
      setDeleteLoadingId(null)
    }
  }

  const columns: ColumnDef<TransactionType>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const item = row.original
        return formatDate(item.date || item.dateCreation || item.createdAt)
      },
    },
    {
      accessorKey: 'typeStock',
      header: 'Type',
      cell: ({ row }) => {
        const item = row.original
        const typeValue = item.typeStock || item.type || ''
        return (
          <Badge bg={typeValue === 'olive' ? 'success' : 'warning'}>
            {typeValue === 'olive' ? 'Olive' : 'Huile'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'quantite',
      header: 'Quantité',
      cell: ({ row }) => {
        const item = row.original
        return <span className="fw-bold">{formatNumber(item.quantite)} kg</span>
      },
    },
    {
      accessorKey: 'motif',
      header: 'Motif',
      cell: ({ row }) => {
        const item = row.original
        return <Badge bg="info">{item.motif || '-'}</Badge>
      },
    },
    {
      accessorKey: 'commentaire',
      header: 'Commentaire',
      cell: ({ row }) => {
        const item = row.original
        return <span className="small text-muted">{item.commentaire || item.details || '-'}</span>
      },
    },
    {
      accessorKey: 'prixFinal',
      header: 'Prix final',
      cell: ({ row }) => {
        const item = row.original
        return <span>{formatNumber(item.prixFinal || item.prix)} DT</span>
      },
    },
    {
      accessorKey: 'nomPrenom',
      header: 'Nom fiche',
      cell: ({ row }) => {
        const item = row.original
        return <span className="small fw-semibold">{item.nomPrenom || item.clientNom || '-'}</span>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="d-flex align-items-center gap-2">
            <Button variant="outline-info" size="sm" onClick={() => handleView(item)}>
              <TbEye />
            </Button>

            <Button variant="outline-primary" size="sm" onClick={() => printThermalTicket(item)}>
              <TbPrinter />
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleDelete(item)}
              disabled={deleteLoadingId === item._id}
            >
              {deleteLoadingId === item._id ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <TbTrash />
              )}
            </Button>
          </div>
        )
      },
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

  const totalItems = filteredTransactions.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <TbHistory className="me-2" />
            Historique des retraits - {proprietaire.nomPrenom}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <StockDisplay proprietaire={proprietaire} />

          {actionError ? (
            <Alert variant="danger" dismissible onClose={() => setActionError('')} className="mt-3">
              {actionError}
            </Alert>
          ) : null}

          {actionSuccess ? (
            <Alert variant="success" dismissible onClose={() => setActionSuccess('')} className="mt-3">
              {actionSuccess}
            </Alert>
          ) : null}

          <div className="row g-3 mb-3 mt-1">
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Recherche</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">
                    <TbSearch />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Motif, commentaire, nom fiche..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                    }}
                  />
                </div>
              </Form.Group>
            </div>

            <div className="col-md-3">
              <Form.Group>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value)
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                  }}
                />
              </Form.Group>
            </div>

            <div className="col-md-3">
              <Form.Group>
                <Form.Label>Type de stock</Form.Label>
                <Form.Select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value)
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                  }}
                >
                  <option value="">Tous les types</option>
                  <option value="olive">Olive</option>
                  <option value="huile">Huile</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <Button
                variant="outline-primary"
                className="w-100"
                onClick={() => {
                  setSearchTerm('')
                  setFilterDate('')
                  setFilterType('')
                  setPagination({ pageIndex: 0, pageSize: 10 })
                  onRefresh?.()
                }}
              >
                <TbRefresh className="me-1" />
                Reset
              </Button>
            </div>
          </div>

          <DataTable<TransactionType> table={table} emptyMessage="Aucune ligne." />

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
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      <ViewTransactionModal
        show={showViewModal}
        onHide={() => {
          setShowViewModal(false)
          setSelectedTransaction(null)
        }}
        transaction={selectedTransaction}
      />
    </>
  )
}

export default HistoriqueModal