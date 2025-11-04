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
import { useState, useEffect } from 'react'
import { Button, Card, CardFooter, CardHeader, Col, Container, Row, Form, InputGroup, Dropdown, Badge } from 'react-bootstrap'
import { LuSearch, LuGlobe } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash, TbFileExport } from 'react-icons/tb'
import { RiAddFill } from 'react-icons/ri'
import { CgUnavailable } from 'react-icons/cg'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/themes/material_blue.css'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import FitouraAddModal from './components/FitouraAddModal'
import FitouraEditModal from './components/FitouraEditModal'
import FitouraDetailModal from './components/FitouraDetailModal'
import FitouraEditAllModal from './components/FitouraEditAllModal'
import { exportToXLSX, exportToPDF } from './components/TableExporter'

type FitouraType = {
  _id: string
  matriculeCamion: string
  chauffeur: string
  poidsEntree: number
  poidsSortie?: number
  poidsNet?: number
  prixUnitaire: number
  montantTotal?: number
  status: string
  dateSortie?: string
}

const columnHelper = createColumnHelper<FitouraType>()

const FitouraCard = () => {
  const [data, setData] = useState<FitouraType[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<FitouraType | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [columnFilters, setColumnFilters] = useState<any[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const statusValues = ['EN_COURS', 'TERMINE', 'Bloqué']

  // 🌀 Récupération des données
  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8170/fitoura')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Erreur de chargement des données :', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ✅ Ajouter une entrée
  const handleAdd = async (formData: any) => {
    await fetch('http://localhost:8170/fitoura/entree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    await fetchData()
  }

  // ✅ Modifier une sortie
  const handleEdit = async (id: string, formData: any) => {
    await fetch(`http://localhost:8170/fitoura/sortie/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    await fetchData()
  }

  // ✅ Supprimer les lignes sélectionnées
  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    await Promise.all(selectedIds.map((id) => fetch(`http://localhost:8170/fitoura/${id}`, { method: 'DELETE' })))
    setSelectedRowIds({})
    await fetchData()
  }

  const toggleDeleteModal = () => setSelectedRowIds({})

  // 🔹 Filtre par status
  const handleStatusFilterChange = (value: string) => {
    setColumnFilters((prevFilters) => {
      const newFilters = prevFilters.filter((f) => f.id !== 'status')
      if (value) newFilters.push({ id: 'status', value })
      return newFilters
    })
  }

  // 🔹 Filtre par date
  useEffect(() => {
    setColumnFilters((prev) => {
      const newFilters = prev.filter((f) => f.id !== 'dateSortie')
      if (selectedDates.length === 2) {
        newFilters.push({
          id: 'dateSortie',
          value: {
            start: selectedDates[0].toISOString().split('T')[0],
            end: selectedDates[1].toISOString().split('T')[0],
          },
        })
      }
      return newFilters
    })
  }, [selectedDates])
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const formatDateDDMMYYYY = (value?: string | null) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
  }
  const dateFilterFn = (row: any, columnId: string, filterValue: { start: string; end: string }) => {
    const rowDate = row.getValue(columnId)
    if (!rowDate) return true
    const date = new Date(rowDate)
    const start = new Date(filterValue.start)
    const end = new Date(filterValue.end)
    return date >= start && date <= end
  }

  // 🟢 Colonnes
  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<FitouraType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<FitouraType> }) => (
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
    columnHelper.accessor('matriculeCamion', { header: 'Matricule Camion' }),
    columnHelper.accessor('chauffeur', { header: 'Chauffeur' }),
    columnHelper.accessor('poidsEntree', {
      header: 'Poids Entrée (kg)',
      cell: (info) => <Badge bg="warning">{info.getValue() != null ? info.getValue()?.toFixed(2) : 'N/A'}</Badge>,
    }),
    columnHelper.accessor('poidsSortie', {
      header: 'Poids Sortie (kg)',
      cell: (info) => <Badge bg="success">{info.getValue() != null ? info.getValue()?.toFixed(2) : 'N/A'}</Badge>,
    }),
    columnHelper.accessor('poidsNet', {
      header: 'Poids Net (kg)',
      cell: (info) => <Badge bg="danger">{info.getValue() != null ? info.getValue()?.toFixed(2) : 'N/A'}</Badge>,
    }),
    columnHelper.accessor('prixUnitaire', { header: 'Prix Unitaire (DT/kg)' }),
    columnHelper.accessor('montantTotal', { header: 'Montant Total (DT)' }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => {
        const color =
          row.original.status === 'Bloqué'
            ? ' bg-danger-subtle text-danger badge-label'
            : row.original.status === 'EN_COURS'
              ? 'bg-danger-subtle text-danger badge-label'
              : row.original.status === 'TERMINE'
                ? 'bg-success-subtle text-success badge-label'
                : 'bg-secondary-subtle text-secondary badge-label'
        return <span className={`badge ${color}`}>{row.original.status}</span>
      },
      filterFn: 'equals',
      id: 'status',
    }),
    columnHelper.accessor('dateSortie', {
      header: 'Date Sortie',
      cell: (info) => formatDateDDMMYYYY(info.getValue() as string),
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<FitouraType> }) => (
        <div className="d-flex gap-1">
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              setCurrentOperation(row.original)
              setShowEditModal(true)
            }}>
            <RiAddFill className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              setCurrentOperation(row.original)
              setShowDetailModal(true)
            }}>
            <TbEye className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              setCurrentOperation(row.original)
              setShowEdit(true)
            }}>
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              setSelectedRowIds({ [row.id]: true })
              toggleDeleteModal()
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
      rowSelection: selectedRowIds,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
  })

  const selectedRows = table.getSelectedRowModel().rows
  const currentStatusFilter = columnFilters.find((f) => f.id === 'status')?.value || ''
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <Container fluid>
      <PageBreadcrumb title="Fitoura" subtitle="Gestion" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between d-flex align-items-center flex-wrap gap-2">
              <div className="d-flex gap-2 flex-wrap">
                <Button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  <TbPlus /> Ajouter
                </Button>

                {Object.keys(selectedRowIds).length > 0 && (
                  <Button variant="danger" onClick={toggleDeleteModal}>
                    <TbTrash /> Supprimer ({Object.keys(selectedRowIds).length})
                  </Button>
                )}

                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" id="dropdown-export-data">
                    <TbFileExport /> Exporter
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        const rows = table.getFilteredRowModel().rows
                        if (rows.length === 0) {
                          alert('Aucune donnée à exporter.')
                          return
                        }
                        exportToXLSX(rows, 'fitoura_data')
                      }}>
                      📊 Exporter en XLSX (Excel)
                    </Dropdown.Item>
                    <Dropdown.Item
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        const rows = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows
                        if (rows.length === 0) {
                          alert('Aucune donnée à exporter.')
                          return
                        }
                        exportToPDF(rows, 'fitoura_data')
                      }}>
                      🧾 Exporter en PDF
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Form.Select
                  value={currentStatusFilter as string}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="form-select-sm"
                  style={{ width: '150px' }}>
                  <option value="">Tous les status</option>
                  {statusValues.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Form.Select>

                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">par date :</span>
                  <Flatpickr
                    className="form-control"
                    options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                    value={selectedDates}
                    onChange={(dates: Date[]) => setSelectedDates(dates)}
                  />
                  <Button variant="secondary" size="sm" onClick={() => setSelectedDates([])}>
                    <CgUnavailable />
                  </Button>
                </div>

                <InputGroup style={{ maxWidth: '200px' }}>
                  <InputGroup.Text>
                    <LuSearch className="fs-lg" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Recherche globale..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                </InputGroup>
              </div>
            </CardHeader>

            <DataTable table={table} emptyMessage="Aucun enregistrement trouvé" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="opérations"
                  showInfo
                  previousPage={table.previousPage}
                  canPreviousPage={table.getCanPreviousPage()}
                  pageCount={table.getPageCount()}
                  pageIndex={pageIndex}
                  setPageIndex={table.setPageIndex}
                  nextPage={table.nextPage}
                  canNextPage={table.getCanNextPage()}
                />
              </CardFooter>
            )}
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <FitouraAddModal show={showAddModal} onHide={() => setShowAddModal(false)} onSubmit={handleAdd} />
      <FitouraEditModal show={showEditModal} onHide={() => setShowEditModal(false)} operation={currentOperation} onSubmit={handleEdit} />
      <FitouraDetailModal show={showDetailModal} onHide={() => setShowDetailModal(false)} operation={currentOperation} />
      <FitouraEditAllModal show={showEdit} onHide={() => setShowEdit(false)} operation={currentOperation} fetchData={fetchData} />
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={toggleDeleteModal}
        onConfirm={handleDelete}
        selectedCount={Object.keys(selectedRowIds).length}
        itemName="opérations"
      />
    </Container>
  )
}

export default FitouraCard
