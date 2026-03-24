'use client'

import { Alert, Badge, Button, CardFooter, Col, Container, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbPlus, TbTrash, TbDownload, TbRefresh } from 'react-icons/tb'
import { LuSearch, LuShuffle } from 'react-icons/lu'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Row as TableRow, type Table as TableType } from '@tanstack/table-core'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { useToggle } from 'usehooks-ts'
import CreateDealModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/CreateDealModal'
import ViewDetailModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/ViewDetailModal'
import EditModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/EditModal'
import { exportToPDF } from './components/TableExporter'

// ======================================================================
// Types
// ======================================================================
type CustomerType = {
  _id: string
  nomPrenom: string
  dateCreation: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  quantiteOliveNet?: number
  kattou3?: number
  nisba?: number
  numCIN?: number
  numTelephone?: number
  type?: string
}

type TableCustomerType = CustomerType & { selected?: boolean }

const columnHelper = createColumnHelper<TableCustomerType>()

const defaultRowData: CustomerType = {
  _id: '',
  nomPrenom: 'Propriétaire',
  dateCreation: new Date().toISOString(),
  nombreCaisses: 0,
  quantiteOlive: 0,
  quantiteHuile: 0,
  kattou3: 0,
  nisba: 0,
  quantiteOliveNet: 0,
}

// ======================================================================
// Helpers
// ======================================================================
type RangeKey = '0-50' | '51-200' | '201+'
type HuileRange = 'All' | RangeKey

// règle demandée:
// - olive: huile == 0
// - olive_huile: huile > 0
type StockType = 'All' | 'olive' | 'olive_huile'

const matchHuileRange = (value: number, range: RangeKey) => {
  if (range === '0-50') return value >= 0 && value <= 50
  if (range === '51-200') return value >= 51 && value <= 200
  return value >= 201
}

const n2 = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// ✅ extrait YYYY-MM-DD de n'importe quel format (ISO, date-only, etc.)
const datePart = (value: any): string => {
  const s = String(value ?? '')
  if (!s) return ''
  // ISO: "2026-03-15T13:13:42.794Z" => "2026-03-15"
  if (s.length >= 10) return s.slice(0, 10)
  return s
}

// ======================================================================
// Page
// ======================================================================
const Qteclient = () => {
  const [data, setData] = useState<TableCustomerType[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [selectedRow, setSelectedRow] = useState<CustomerType>(defaultRowData)

  // ✅ Filters
  const [typeFilter, setTypeFilter] = useState<StockType>('All')
  const [huileRange, setHuileRange] = useState<HuileRange>('All')

  // ✅ Date filter (dateCreation) as YYYY-MM-DD
  const [dateFrom, setDateFrom] = useState<string>('') // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>('') // YYYY-MM-DD

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [showDealModal, toggleDealModal] = useToggle(false)
  const [showViewModal, setShowViewModal] = useState<boolean>(false)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)

  const toggleDeleteModal = () => setShowDeleteModal((v) => !v)

  // -----------------------------
  // Fetch
  // -----------------------------
  const fetchProprietaires = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('http://192.168.1.15:8170/proprietaires', { cache: 'no-store' as any })
      if (!response.ok) throw new Error('Failed to fetch data')
      const json: CustomerType[] = await response.json()
      setData(Array.isArray(json) ? (json as any) : [])
    } catch (err) {
      console.error('Error fetching proprietaires:', err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProprietaires()
  }, [fetchProprietaires])

  // -----------------------------
  // ✅ Apply UI filters BEFORE table
  // -----------------------------
  const filteredByUi = useMemo(() => {
    const src = Array.isArray(data) ? data : []

    // normalise range: si user met dateFrom > dateTo, on swap pour éviter "ne fonctionne pas"
    const from = dateFrom && dateFrom.length >= 10 ? dateFrom.slice(0, 10) : ''
    const to = dateTo && dateTo.length >= 10 ? dateTo.slice(0, 10) : ''
    const minDate = from && to && from > to ? to : from
    const maxDate = from && to && from > to ? from : to

    return src.filter((row) => {
      const huile = n2(row.quantiteHuile)

      // type rule
      if (typeFilter === 'olive' && !(huile === 0)) return false
      if (typeFilter === 'olive_huile' && !(huile > 0)) return false

      // huile range
      if (huileRange !== 'All') {
        if (!matchHuileRange(huile, huileRange)) return false
      }

      // date range (compare YYYY-MM-DD strings)
      if (minDate || maxDate) {
        const dc = datePart(row.dateCreation)
        if (!dc) return false
        if (minDate && dc < minDate) return false
        if (maxDate && dc > maxDate) return false
      }

      return true
    })
  }, [data, typeFilter, huileRange, dateFrom, dateTo])

  // -----------------------------
  // Columns
  // -----------------------------
  const columns = useMemo(
    () => [
      {
        id: 'select',
        maxSize: 45,
        size: 45,
        header: ({ table }: { table: TableType<TableCustomerType> }) => (
          <input
            type="checkbox"
            className="form-check-input form-check-input-light fs-14"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }: { row: TableRow<TableCustomerType> }) => (
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

      columnHelper.accessor('nomPrenom', {
        header: 'Propriétaire',
        cell: ({ row }) => <span className="fw-semibold">{row.original.nomPrenom}</span>,
      }),

      columnHelper.accessor('nombreCaisses', {
        header: 'Nombre de caisses',
        cell: ({ row }) => <span>{n2(row.original.nombreCaisses).toFixed(0)}</span>,
      }),

      columnHelper.accessor('quantiteOliveNet', {
        header: 'Quantité Olive net (kg)',
        cell: ({ row }) => <span>{n2(row.original.quantiteOliveNet).toFixed(2)}</span>,
      }),

      columnHelper.accessor('quantiteHuile', {
        header: 'Quantité Huile (kg)',
        cell: ({ row }) => <span>{n2(row.original.quantiteHuile).toFixed(2)}</span>,
      }),

      columnHelper.accessor('dateCreation', {
        header: 'Date création',
        cell: ({ row }) => <span>{new Date(row.original.dateCreation).toLocaleDateString('fr-FR')}</span>,
      }),

      {
        header: 'Actions',
        cell: ({ row }: { row: TableRow<TableCustomerType> }) => (
          <div className="d-flex gap-1">
            <Button variant="default" size="sm" className="btn-icon" onClick={() => handleViewDetails(row.original)}>
              <TbEye className="fs-lg" />
            </Button>
            <Button variant="default" size="sm" className="btn-icon" onClick={() => handleEdit(row.original)}>
              <TbEdit className="fs-lg" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="btn-icon"
              onClick={() => {
                toggleDeleteModal()
                setSelectedRowIds((prev) => ({ ...prev, [row.id]: true }))
              }}>
              <TbTrash className="fs-lg" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // -----------------------------
  // Table
  // -----------------------------
  const table = useReactTable({
    data: filteredByUi,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)
  const selectedCount = Object.keys(selectedRowIds).length

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleViewDetails = (rowData: CustomerType) => {
    setSelectedRow(rowData)
    setShowViewModal(true)
  }

  const handleEdit = (rowData: CustomerType) => {
    setSelectedRow(rowData)
    setShowEditModal(true)
  }

  // ✅ Totaux: Olive + Huile + lignes seulement
  const totals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows
    const len = rows.length
    const oliveNet = rows.reduce((sum, r) => sum + n2(r.original.quantiteOliveNet), 0)
    const huile = rows.reduce((sum, r) => sum + n2(r.original.quantiteHuile), 0)
    return { oliveNet, huile, len }
  }, [table, globalFilter, sorting, pagination, filteredByUi])

  const handleSaveEdit = async (updatedData: CustomerType) => {
    try {
      const response = await fetch(`http://192.168.1.15:8170/proprietaires/${updatedData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      if (!response.ok) throw new Error('Failed to update proprietaire')
      await fetchProprietaires()
      setShowEditModal(false)
    } catch (err) {
      console.error('Error updating proprietaire:', err)
    }
  }

  const handleDelete = async () => {
    try {
      const selectedRows = table.getSelectedRowModel().rows
      const deletePromises = selectedRows.map((r) => fetch(`http://192.168.1.15:8170/proprietaires/${r.original._id}`, { method: 'DELETE' }))
      await Promise.all(deletePromises)

      await fetchProprietaires()
      setSelectedRowIds({})
      setPagination((p) => ({ ...p, pageIndex: 0 }))
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Error deleting proprietaires:', err)
    }
  }

  const Exportpdf = () => {
    const rawDataToExport = table.getFilteredRowModel().rows.map((row) => row.original)
    exportToPDF(rawDataToExport)
  }

  const resetFilters = () => {
    setGlobalFilter('')
    setTypeFilter('All')
    setHuileRange('All')
    setDateFrom('')
    setDateTo('')
    setSorting([])
    setSelectedRowIds({})
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  return (
    <Container fluid>
      <PageBreadcrumb title={'Stock Ma3sra'} subtitle={'Stock propriétaire (Olive / Huile)'} />

      <Row>
        <Col xs={12}>
          <div className="card">
            <div className="card-header border-light">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                {/* Left actions */}
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div className="app-search">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Rechercher propriétaire..."
                      value={globalFilter ?? ''}
                      onChange={(e) => {
                        setGlobalFilter(e.target.value)
                        setPagination((p) => ({ ...p, pageIndex: 0 }))
                      }}
                    />
                    <LuSearch className="app-search-icon text-muted" />
                  </div>

                  <Button variant="primary" onClick={toggleDealModal}>
                    <TbPlus className="me-1" /> Nouveau
                  </Button>

                  <Button variant="outline-secondary" onClick={fetchProprietaires} disabled={loading}>
                    <TbRefresh className="me-1" /> Actualiser
                  </Button>

                  <Button variant="outline-primary" onClick={Exportpdf} disabled={loading || totalItems === 0}>
                    <TbDownload className="me-1" /> Export PDF
                  </Button>

                  {selectedCount > 0 && (
                    <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                      <TbTrash className="me-1" /> Supprimer ({selectedCount})
                    </Button>
                  )}
                </div>

                {/* Right filters */}
                <Row className="mb-3">
                  <Col xs={12}>
                    <div className="d-flex align-items-end gap-2 flex-nowrap overflow-auto">
                      <span className="fw-semibold mb-2 flex-shrink-0">Filtres:</span>

                      <select
                        className="form-select"
                        value={typeFilter}
                        onChange={(e) => {
                          setTypeFilter(e.target.value as StockType)
                          setPagination((p) => ({ ...p, pageIndex: 0 }))
                        }}
                        style={{ minWidth: 260 }}>
                        <option value="All">Tous</option>
                        <option value="olive">Olive seulement (Huile = 0)</option>
                        <option value="olive_huile">Olive + Huile (Huile &gt; 0)</option>
                      </select>

                      <div className="flex-shrink-0">
                        <div className="text-muted small">Du</div>
                        <input
                          type="date"
                          className="form-control"
                          value={dateFrom}
                          onChange={(e) => {
                            setDateFrom(e.target.value)
                            setPagination((p) => ({ ...p, pageIndex: 0 }))
                          }}
                          style={{ minWidth: 170 }}
                        />
                      </div>

                      <div className="flex-shrink-0">
                        <div className="text-muted small">Au</div>
                        <input
                          type="date"
                          className="form-control"
                          value={dateTo}
                          onChange={(e) => {
                            setDateTo(e.target.value)
                            setPagination((p) => ({ ...p, pageIndex: 0 }))
                          }}
                          style={{ minWidth: 170 }}
                        />
                      </div>

                      <Button variant="outline-secondary" onClick={resetFilters} disabled={loading} className="flex-shrink-0">
                        Reset
                      </Button>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="card-body p-0">
              {/* ✅ Totaux - use theme cards (no forced colors) */}
              <Alert variant="info" className="py-2">
                <Row className="text-center g-2 align-items-center">
                  <Col md={4} sm={6}>
                    <div className="fw-semibold">Olive Net</div>
                    <div className="fs-5">{totals.oliveNet.toFixed(2)} kg</div>
                    <div className="small text-muted">Lignes: {totals.len}</div>
                  </Col>

                  <Col md={4} sm={6}>
                    <div className="fw-semibold">Huile</div>
                    <div className="fs-5 text-success">{totals.huile.toFixed(2)} kg</div>
                    <div className="small text-muted">Range: {huileRange}</div>
                  </Col>

                  <Col md={4} sm={12}>
                    <div className="fw-semibold">Filtre type</div>
                    <div className="fs-6">{typeFilter === 'All' ? 'Tous' : typeFilter === 'olive' ? 'Olive seulement' : 'Olive + Huile'}</div>
                    <div className="small text-muted">{dateFrom || dateTo ? `Date: ${dateFrom || '…'} → ${dateTo || '…'}` : 'Date: toutes'}</div>
                  </Col>
                </Row>
              </Alert>
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                </div>
              ) : (
                <DataTable<TableCustomerType> table={table} emptyMessage="Aucun propriétaire trouvé" />
              )}
            </div>

            {!loading && table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                {/* ✅ Bottom: page size selector + pagination */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">Nombre de lignes à afficher:</span>
                    <select
                      className="form-select"
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => {
                        table.setPageSize(Number(e.target.value))
                        setPagination((p) => ({ ...p, pageIndex: 0 }))
                      }}
                      style={{ width: 110 }}>
                      {[5, 8, 10, 15, 20].map((size) => (
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
                    itemsName="propriétaires"
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
              </CardFooter>
            )}

            {/* Modals */}
            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={toggleDeleteModal}
              onConfirm={handleDelete}
              selectedCount={selectedCount}
              itemName="propriétaire"
            />

            <CreateDealModal show={showDealModal} toggleModal={toggleDealModal} onProprietaireCreated={fetchProprietaires} />

            <ViewDetailModal show={showViewModal} toggleModal={() => setShowViewModal(false)} data={selectedRow} />

            <EditModal show={showEditModal} toggleModal={() => setShowEditModal(false)} data={selectedRow} onSave={handleSaveEdit} />
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default Qteclient
