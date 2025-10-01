'use client'

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
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Container, Row } from 'react-bootstrap'
import { LuGlobe, LuSearch, LuShuffle } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import CustomerModal from './components/CustomerModal'
import { customers, CustomerType } from './data'
import { Page } from 'react-pdf'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import CustomerModalViewDetail from '../client/components/CustomerModalViewDetail'
import CustomerEditModal from '../client/components/CustomerEditModal'
import FlatpickrClient from '@/components/client-wrapper/FlatpickrClient'

const columnHelper = createColumnHelper<CustomerType>()

const CustomersCard = () => {
  const [showModal, setShowModal] = useState(false)
  const [showModaldetail, setShowModaldetail] = useState(false)
  const [showModalEdit, setShowEditModal] = useState(false)

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

    columnHelper.accessor('numCin', {
      header: 'CIN',
      cell: ({ row }) => <span>{row.original.numCin}</span>,
    }),

    columnHelper.accessor('nomPrenom', {
      header: 'Nom & Prénom',
      cell: ({ row }) => (
        <h5 className="mb-0">
          <Link href="/users/profile" className="link-reset">
            {row.original.nomPrenom}
          </Link>
        </h5>
      ),
    }),

    columnHelper.accessor('numTelephone', {
      header: 'Téléphone',
      cell: ({ row }) => <span>{row.original.numTelephone}</span>,
    }),

    columnHelper.accessor('dateCreation', {
      header: 'Date de création',
      cell: ({ row }) => <span>{row.original.dateCreation}</span>,
    }),

    columnHelper.accessor('type', {
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`badge ${
            row.original.type === 'fallah' ? 'bg-success-subtle text-success badge-label' : 'bg-info-subtle text-info badge-label'
          }`}>
          {row.original.type}
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
            className="btn btn-default btn-icon btn-sm rounded"
            onClick={() => {
              setShowModaldetail(true)
              setSelectedCustomer(row.original)
            }}>
            <TbEye className="fs-lg" />
          </Button>
          <CustomerModalViewDetail show={showModaldetail} onHide={() => setShowModaldetail(false)} customer={selectedCustomer} />

          <Button
            variant="default"
            size="sm"
            className="btn btn-default btn-icon btn-sm rounded"
            onClick={() => {
              setShowEditModal(true)
              setSelectedCustomer(row.original)
            }}>
            <TbEdit className="fs-lg" />
          </Button>
          <CustomerEditModal show={showModalEdit} onHide={() => setShowEditModal(false)} customer={selectedCustomer} />

          <Button
            variant="default"
            size="sm"
            className="btn btn-default btn-icon btn-sm rounded"
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

  const [data, setData] = useState<CustomerType[]>(() => [...customers])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null)
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

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

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
                  <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
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

                <div className="app-search">
                  <FlatpickrClient className="form-control" options={{ dateFormat: 'd M, Y', defaultDate: 'today' }} />

                  <LuGlobe className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                    <option value="">Type</option>
                    <option value="US">فلاح</option>
                    <option value="UK">كيال</option>
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
              onHide={toggleDeleteModal}
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
