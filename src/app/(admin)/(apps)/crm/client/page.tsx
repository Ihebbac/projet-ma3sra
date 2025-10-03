'use client'

import { useEffect, useState } from 'react'
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  Row as TableRow,
  Table as TableType,
} from '@tanstack/react-table'
import { Button, Card, CardFooter, CardHeader, Col, Container, Row } from 'react-bootstrap'
import { LuGlobe, LuSearch, LuShuffle } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import CustomerModal from './components/CustomerModal'
import CustomerModalViewDetail from '../client/components/CustomerModalViewDetail'
import CustomerEditModal from '../client/components/CustomerEditModal'
import FlatpickrClient from '@/components/client-wrapper/FlatpickrClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'

type CustomerType = {
  _id: string
  nomPrenom: string
  numCIN: number
  numTelephone: number
  type: string
  dateCreation: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
}

const columnHelper = createColumnHelper<CustomerType>()

const CustomersCard = () => {
  const [data, setData] = useState<CustomerType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [showModalDetail, setShowModalDetail] = useState(false)
  const [showModalEdit, setShowModalEdit] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // --- fetch customers from API ---
  useEffect(() => {
    fetch('http://localhost:8170/clients')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error('Error fetching clients:', err))
  }, [])

  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<CustomerType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<CustomerType> }) => (
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
    columnHelper.accessor('numCIN', { header: 'CIN', cell: (info) => info.getValue() }),
    columnHelper.accessor('nomPrenom', {
      header: 'Nom & Prénom',
      cell: (info) => <h5 className="mb-0">{info.getValue()}</h5>,
    }),
    columnHelper.accessor('numTelephone', { header: 'Téléphone', cell: (info) => info.getValue() }),
    columnHelper.accessor('dateCreation', { header: 'Date de création', cell: (info) => info.getValue() }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: (info) => (
        <span
          className={`badge ${
            info.getValue() === 'فلاح' ? 'bg-success-subtle text-success badge-label' : 'bg-info-subtle text-info badge-label'
          }`}
        >
          {info.getValue()}
        </span>
      ),
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<CustomerType> }) => (
        <div className="d-flex gap-1">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModalDetail(true)
              setSelectedCustomer(row.original)
            }}
          >
            <TbEye className="fs-lg" />
          </Button>
          <CustomerModalViewDetail show={showModalDetail} onHide={() => setShowModalDetail(false)} customer={selectedCustomer} />

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModalEdit(true)
              setSelectedCustomer(row.original)
            }}
          >
            <TbEdit className="fs-lg" />
          </Button>
          <CustomerEditModal show={showModalEdit} onHide={() => setShowModalEdit(false)} customer={selectedCustomer} />

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowDeleteModal(true)
              setSelectedRowIds({ [row.id]: true })
            }}
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
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

  const handleDelete = () => {
    const selectedIds = new Set(Object.keys(selectedRowIds))
    setData((old) => old.filter((_, idx) => !selectedIds.has(idx.toString())))
    setSelectedRowIds({})
    setPagination({ ...pagination, pageIndex: 0 })
    setShowDeleteModal(false)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Clients" subtitle="CRM" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="CIN,Tél,Nom ...."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                {Object.keys(selectedRowIds).length > 0 && (
                  <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                    Delete
                  </Button>
                )}

                <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  <TbPlus className="fs-lg" /> Ajouter un client
                </Button>
                <CustomerModal show={showModal} onHide={() => setShowModal(false)} />
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filtrer :</span>

                <FlatpickrClient className="form-control" options={{ dateFormat: 'd M, Y', defaultDate: 'today' }} />
                <LuGlobe className="app-search-icon text-muted" />

                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                >
                  {[5, 8, 10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <DataTable<CustomerType> table={table} emptyMessage="No records found" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="customers"
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

            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={() => setShowDeleteModal(false)}
              onConfirm={handleDelete}
              selectedCount={Object.keys(selectedRowIds).length}
              itemName="customers"
            />
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default CustomersCard
