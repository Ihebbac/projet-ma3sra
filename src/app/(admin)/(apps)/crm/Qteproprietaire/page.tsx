'use client'
import { Button, CardFooter, Col, Container, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'
import { LuSearch, LuShuffle } from 'react-icons/lu'
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect } from 'react'
import { Row as TableRow, type Table as TableType } from '@tanstack/table-core'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { useToggle } from 'usehooks-ts'
import CreateDealModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/CreateDealModal'
import ViewDetailModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/ViewDetailModal'
import EditModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/EditModal'

// Types
type CustomerType = {
  _id: string
  nomPrenom: string
  dateCreation: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
  numCIN?: number
  numTelephone?: number
  type?: string
}

type TableCustomerType = CustomerType & {
  selected?: boolean
}

const columnHelper = createColumnHelper<TableCustomerType>()

// Données par défaut pour éviter les valeurs null
const defaultRowData: CustomerType = {
  _id: '',
  nomPrenom: 'Propriétaire',
  dateCreation: new Date().toISOString(),
  nombreCaisses: 0,
  quantiteOlive: 0,
  quantiteHuile: 0,
  kattou3: 0,
  nisba: 0
}

const Qteclient = () => {
  const columns = [
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
      cell: ({ row }) => (
        <span className="fw-semibold">{row.original.nomPrenom}</span>
      ),
    }),
    columnHelper.accessor('nombreCaisses', {
      header: 'Nombre de caisses',
      cell: ({ row }) => (
        <span>{row.original.nombreCaisses || 0}</span>
      ),
    }),
    columnHelper.accessor('quantiteOlive', {
      header: 'Quantité Olive (kg)',
      cell: ({ row }) => (
        <span>{(row.original.quantiteOlive?.toFixed(2)) || 0}</span>
      ),
    }),
    columnHelper.accessor('quantiteHuile', {
      header: 'Quantité Huile (L)',
      cell: ({ row }) => (
        <span>{(row.original.quantiteHuile?.toFixed(2)) || 0}</span>
      ),
    }),
    columnHelper.accessor('kattou3', {
      header: 'Kattou3 (%)',
      cell: ({ row }) => (
        <span>{(row.original.kattou3)?.toFixed(2) || 0}%</span>
      ),
    }),
    columnHelper.accessor('nisba', {
      header: 'Nisba (%)',
      cell: ({ row }) => (
        <span>{(row.original.nisba)?.toFixed(2) || 0}%</span>
      ),
    }),
    columnHelper.accessor('dateCreation', {
      header: 'Date création',
      cell: ({ row }) => (
        <span>{new Date(row.original.dateCreation).toLocaleDateString('fr-FR')}</span>
      ),
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<TableCustomerType> }) => (
        <div className="d-flex gap-1">
          <Button 
            variant="default" 
            size="sm" 
            className="btn-icon"
            onClick={() => handleViewDetails(row.original)}
          >
            <TbEye className="fs-lg" />
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="btn-icon"
            onClick={() => handleEdit(row.original)}
          >
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              toggleDeleteModal()
              setSelectedRowIds({ [row.id]: true })
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<TableCustomerType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [selectedRow, setSelectedRow] = useState<CustomerType>(defaultRowData)

  // États pour les modals
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [showDealModal, toggleDealModal] = useToggle(false)
  const [showViewModal, setShowViewModal] = useState<boolean>(false)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)

  // Fetch data from API
  useEffect(() => {
    const fetchProprietaires = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://92.112.181.241:8170/proprietaires')
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const json: CustomerType[] = await response.json()
        setData(json)
      } catch (err) {
        console.error('Error fetching proprietaires:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProprietaires()
  }, [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleViewDetails = (rowData: CustomerType) => {
    setSelectedRow(rowData)
    setShowViewModal(true)
  }

  const handleEdit = (rowData: CustomerType) => {
    setSelectedRow(rowData)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (updatedData: CustomerType) => {
    try {
      const response = await fetch(`http://92.112.181.241:8170/proprietaires/${updatedData._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        throw new Error('Failed to update proprietaire')
      }

      // Refresh data after update
      const refreshResponse = await fetch('http://92.112.181.241:8170/proprietaires')
      const refreshedData: CustomerType[] = await refreshResponse.json()
      setData(refreshedData)
      
      setShowEditModal(false)
    } catch (err) {
      console.error('Error updating proprietaire:', err)
    }
  }

  const handleDelete = async () => {
    try {
      const selectedIds = Object.keys(selectedRowIds)
      const deletePromises = selectedIds.map(id => {
        const rowId = data[parseInt(id)]._id
        return fetch(`http://92.112.181.241:8170/proprietaires/${rowId}`, {
          method: 'DELETE',
        })
      })

      await Promise.all(deletePromises)

      // Refresh data after deletion
      const response = await fetch('http://92.112.181.241:8170/proprietaires')
      const refreshedData: CustomerType[] = await response.json()
      setData(refreshedData)
      
      setSelectedRowIds({})
      setPagination({ ...pagination, pageIndex: 0 })
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Error deleting proprietaires:', err)
    }
  }

  const refreshData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://92.112.181.241:8170/proprietaires')
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const json: CustomerType[] = await response.json()
      setData(json)
    } catch (err) {
      console.error('Error fetching proprietaires:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title={'Quantités Clients'} subtitle={'Gestion'} />
      
      <Row>
        <Col xs={12}>
          <div className="card">
            <div className="card-header border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Rechercher..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>
                <Button variant="primary" onClick={toggleDealModal}>
                  <TbPlus className="me-1" /> Nouveau
                </Button>
                {Object.keys(selectedRowIds).length > 0 && (
                  <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                    Supprimer ({Object.keys(selectedRowIds).length})
                  </Button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrer par:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('quantiteHuile')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('quantiteHuile')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                    <option value="All">Quantité Huile</option>
                    <option value="0-50">0-50 L</option>
                    <option value="51-200">51-200 L</option>
                    <option value="201+">201+ L</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div>
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}>
                    {[5, 8, 10, 15, 20].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                </div>
              ) : (
                <DataTable<TableCustomerType> 
                  table={table} 
                  emptyMessage="Aucun propriétaire trouvé" 
                />
              )}
            </div>

            {!loading && table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
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
              </CardFooter>
            )}

            {/* Modals */}
            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={toggleDeleteModal}
              onConfirm={handleDelete}
              selectedCount={Object.keys(selectedRowIds).length}
              itemName="propriétaire"
            />

            <CreateDealModal 
              show={showDealModal} 
              toggleModal={toggleDealModal} 
              onProprietaireCreated={refreshData}
            />

            <ViewDetailModal 
              show={showViewModal} 
              toggleModal={() => setShowViewModal(false)} 
              data={selectedRow} 
            />

            <EditModal 
              show={showEditModal} 
              toggleModal={() => setShowEditModal(false)} 
              data={selectedRow}
              onSave={handleSaveEdit}
            />
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default Qteclient