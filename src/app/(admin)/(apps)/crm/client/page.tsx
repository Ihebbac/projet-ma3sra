'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { LuGlobe, LuSearch } from 'react-icons/lu'
import { CgUnavailable } from "react-icons/cg";

import { TbEdit, TbEye, TbPlus, TbTrash, TbPrinter } from 'react-icons/tb'
import jsPDF from 'jspdf'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import CustomerModal from './components/CustomerModal'
import CustomerModalViewDetail from '../client/components/CustomerModalViewDetail'
import CustomerEditModal from '../client/components/CustomerEditModal'
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

// helper date format dd-mm-yyyy
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

const CustomersCard = () => {
  const [data, setData] = useState<CustomerType[]>([])
  const [filteredData, setFilteredData] = useState<CustomerType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showModalDetail, setShowModalDetail] = useState(false)
  const [showModalEdit, setShowModalEdit] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // fetch clients
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8170/clients')
      if (!res.ok) throw new Error('Fetch clients failed')
      const json = await res.json()
      const normalized = json.map((c: any) => ({
        ...c,
        dateCreation: c.dateCreation ? new Date(c.dateCreation).toISOString() : null,
      }))
      setData(normalized)
      setFilteredData(normalized)
    } catch (err) {
      console.error('Error fetching clients:', err)
      setData([])
      setFilteredData([])
    }
  }, [])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  const handleClientSaved = async () => {
    await fetchClients()
    setPagination({ ...pagination, pageIndex: 0 })
  }

  // Filtrage global et par date (intervalle ou simple)
  useEffect(() => {
    let result = [...data]

    if (globalFilter.trim() !== '') {
      const term = globalFilter.trim().toLowerCase()
      result = result.filter((item) => {
        const name = item.nomPrenom?.toLowerCase() ?? ''
        const cin = String(item.numCIN ?? '')
        const phone = String(item.numTelephone ?? '')
        return name.includes(term) || cin.includes(term) || phone.includes(term)
      })
    }

    if (selectedDates.length === 1) {
      const d = selectedDates[0]
      result = result.filter((item) => {
        if (!item.dateCreation) return false
        const dt = new Date(item.dateCreation)
        return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate()
      })
    } else if (selectedDates.length === 2) {
      const start = selectedDates[0]
      const end = selectedDates[1]
      result = result.filter((item) => {
        if (!item.dateCreation) return false
        const dt = new Date(item.dateCreation)
        return dt >= start && dt <= end
      })
    }

    setFilteredData(result)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [globalFilter, selectedDates, data])

  // print ticket PDF
  const handlePrintTicket = (customer: CustomerType) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] })
    const margin = 6
    let y = margin
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Ma3sra - bouchema', 80 / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text('Adresse: Rue Principale, Ville', 80 / 2, y, { align: 'center' })
    y += 5
    doc.text(`Tel: +216 9X XXX XXX`, 80 / 2, y, { align: 'center' })
    y += 6
    doc.setLineWidth(0.3)
    doc.line(margin, y, 80 - margin, y)
    y += 4
    doc.setFontSize(9)
    doc.text(`Ticket ID: ${customer._id ?? '-'}`, margin, y)
    y += 5
    const now = new Date()
    doc.text(`Date: ${formatDateDDMMYYYY(now.toISOString())} ${now.toLocaleTimeString()}`, margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('Client:', margin, y)
    doc.setFont(undefined, 'normal')
    doc.text(`${customer.nomPrenom}`, margin + 2, y + 5)
    y += 9
    doc.text(`CIN: ${customer.numCIN ?? '-'}`, margin, y)
    y += 5
    doc.text(`Tél: ${customer.numTelephone ?? '-'}`, margin, y)
    y += 6
    doc.setLineWidth(0.2)
    doc.line(margin, y, 80 - margin, y)
    y += 5
    doc.setFontSize(9)
    const colX = margin
    const col2X = 80 / 2
    doc.text('Nb caisses:', colX, y)
    doc.text(String(customer.nombreCaisses ?? '-'), col2X, y)
    y += 5
    doc.text('Quant Olive (kg):', colX, y)
    doc.text(String(customer.quantiteOlive ?? '-'), col2X, y)
    y += 5
    doc.text('Quant Huile (L):', colX, y)
    doc.text(String(customer.quantiteHuile ?? '-'), col2X, y)
    y += 5
    doc.text('Kattou3 (%):', colX, y)
    doc.text(String(customer.kattou3 ?? '-'), col2X, y)
    y += 5
    doc.text('Nisba (%):', colX, y)
    doc.text(String(customer.nisba ?? '-'), col2X, y)
    y += 7
    for (let i = margin; i < 80 - margin; i += 4) doc.line(i, y, i + 2, y)
    y += 6
    doc.setFontSize(9)
    doc.text('Partie Caisse : veillez passer a la caisse pour payer !', 80 / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(7)
    doc.text('Merci pour votre confiance !', 80 / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(7)
    doc.text('Powered by Ma3sra', 80 / 2, y, { align: 'center' })
    doc.save(`ticket_${customer._id ?? 'client'}.pdf`)
  }

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
    columnHelper.accessor('numCIN', { header: 'CIN' }),
    columnHelper.accessor('nomPrenom', { header: 'Nom & Prénom', cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> }),
    columnHelper.accessor('numTelephone', { header: 'Téléphone' }),
    columnHelper.accessor('dateCreation', { header: 'Date de création', cell: (info) => formatDateDDMMYYYY(info.getValue() as string) }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: (info) => (
        <span className={`badge ${info.getValue() === 'فلاح' ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'}`}>
          {info.getValue()}
        </span>
      ),
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<CustomerType> }) => (
        <div className="d-flex gap-1">
          <Button variant="default" size="sm" onClick={() => { setShowModalDetail(true); setSelectedCustomer(row.original) }}>
            <TbEye className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" onClick={() => { setShowModalEdit(true); setSelectedCustomer(row.original) }}>
            <TbEdit className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" onClick={() => handlePrintTicket(row.original)}>
            <TbPrinter className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" onClick={() => { setShowDeleteModal(true); setSelectedRowIds({ [row.id]: true }) }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
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
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = filteredData.length
  const start = pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  const handleDelete = () => {
    const selectedIds = new Set(Object.keys(selectedRowIds))
    setData((old) => old.filter((_, idx) => !selectedIds.has(idx.toString())))
    setSelectedRowIds({})
    setShowDeleteModal(false)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Clients" subtitle="CRM" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex gap-2 align-items-center">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="CIN, Tél, Nom ..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  <TbPlus className="fs-lg" /> Ajouter un client
                </Button>
                <CustomerModal show={showModal} onHide={() => setShowModal(false)} onClientSaved={handleClientSaved} />
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold">Filtrer par date :</span>
                <Flatpickr
                  className="form-control"
                  options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                  value={selectedDates}
                  onChange={(dates: Date[]) => setSelectedDates(dates)}
                />
                <Button variant="secondary" size="sm" onClick={() => setSelectedDates([])}>
                  <CgUnavailable />
                </Button>
                <LuGlobe className="app-search-icon text-muted" />
              </div>
            </CardHeader>

            <DataTable<CustomerType> table={table} emptyMessage="Aucun client trouvé" />

            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="clients"
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

            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={() => setShowDeleteModal(false)}
              onConfirm={handleDelete}
              selectedCount={Object.keys(selectedRowIds).length}
              itemName="clients"
            />
          </Card>
        </Col>
      </Row>

      <CustomerModalViewDetail show={showModalDetail} onHide={() => setShowModalDetail(false)} customer={selectedCustomer} />
      <CustomerEditModal show={showModalEdit} onHide={() => setShowModalEdit(false)} customer={selectedCustomer} onClientSaved={handleClientSaved} />
    </Container>
  )
}

export default CustomersCard
