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
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Badge,
} from 'react-bootstrap'
import { LuRefreshCcw, LuSearch } from 'react-icons/lu'
import { TbEdit, TbEye, TbFileExport, TbPlus, TbTrash } from 'react-icons/tb'
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
import { exportToPDF } from './components/TableExporter'

type FitouraStatus = 'EN_COURS' | 'TERMINE'

type FitouraAttachment = {
  _id?: string
  originalName: string
  filename: string
  path: string
  mimetype: string
  size: number
  uploadedAt: string
}

type FitouraType = {
  _id: string
  matriculeCamion?: string | null
  chauffeur?: string | null
  poidsEntree?: number | null
  poidsSortie?: number | null
  poidsNet?: number | null
  prixUnitaire?: number | null
  montantTotal?: number | null
  status: FitouraStatus
  dateSortie?: string | null
  attachments?: FitouraAttachment[]
  createdAt?: string
  updatedAt?: string
}

type FeedbackState = {
  show: boolean
  variant: 'success' | 'danger' | 'warning' | 'info'
  message: string
}

const API_BASE_URL = 'http://192.168.1.15:8170'
const columnHelper = createColumnHelper<FitouraType>()

const FitouraCard = () => {
 const [rawData, setRawData] = useState<FitouraType[]>([])
const [data, setData] = useState<FitouraType[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditAllModal, setShowEditAllModal] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<FitouraType | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [columnFilters, setColumnFilters] = useState<any[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [camionOptions, setCamionOptions] = useState<string[]>([])
  const [chauffeurOptions, setChauffeurOptions] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>({
    show: false,
    variant: 'success',
    message: '',
  })

  const statusValues: { value: FitouraStatus; label: string }[] = [
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'TERMINE', label: 'Terminée' },
  ]

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

  const formatDateDDMMYYYY = (value?: string | null) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
  }

  const formatNumber = (value?: number | null, digits = 3) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
    return Number(value).toFixed(digits)
  }
const applyDateFilter = (items: FitouraType[], dates: Date[]) => {
  if (!dates || dates.length === 0) return items

  return items.filter((item) => {
    if (!item.dateSortie) return false

    const rowDate = new Date(item.dateSortie)
    if (Number.isNaN(rowDate.getTime())) return false

    const normalizedRowDate = new Date(
      rowDate.getFullYear(),
      rowDate.getMonth(),
      rowDate.getDate(),
    )

    if (dates.length === 1 && dates[0]) {
      const selected = new Date(
        dates[0].getFullYear(),
        dates[0].getMonth(),
        dates[0].getDate(),
      )

      return normalizedRowDate.getTime() === selected.getTime()
    }

    if (dates.length >= 2 && dates[0] && dates[1]) {
      const start = new Date(
        dates[0].getFullYear(),
        dates[0].getMonth(),
        dates[0].getDate(),
      )

      const end = new Date(
        dates[1].getFullYear(),
        dates[1].getMonth(),
        dates[1].getDate(),
      )

      return normalizedRowDate >= start && normalizedRowDate <= end
    }

    return true
  })
}
  const showFeedback = (
    message: string,
    variant: 'success' | 'danger' | 'warning' | 'info' = 'success',
  ) => {
    setFeedback({
      show: true,
      variant,
      message,
    })
  }

  useEffect(() => {
    if (!feedback.show) return

    const timer = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, show: false }))
    }, 2800)

    return () => clearTimeout(timer)
  }, [feedback])

  const toggleDeleteModal = () => {
    setShowDeleteModal((prev) => !prev)
  }

 const fetchData = async (silent = false) => {
  try {
    if (!silent) setRefreshing(true)

    const res = await fetch(`${API_BASE_URL}/fitoura`)
    const result = await res.json()
    const rows = Array.isArray(result) ? result : []

    setRawData(rows)
    setData(applyDateFilter(rows, selectedDates))
  } catch (error) {
    console.error('Erreur de chargement des données :', error)
    setRawData([])
    setData([])
    showFeedback('Erreur lors du chargement des opérations.', 'danger')
  } finally {
    if (!silent) setRefreshing(false)
  }
}

  const fetchOptions = async () => {
    try {
      const [camionsRes, chauffeursRes] = await Promise.all([
        fetch(`${API_BASE_URL}/fitoura/options/camions`),
        fetch(`${API_BASE_URL}/fitoura/options/chauffeurs`),
      ])

      const [camions, chauffeurs] = await Promise.all([
        camionsRes.json(),
        chauffeursRes.json(),
      ])

      setCamionOptions(Array.isArray(camions) ? camions : [])
      setChauffeurOptions(Array.isArray(chauffeurs) ? chauffeurs : [])
    } catch (error) {
      console.error('Erreur de chargement des suggestions :', error)
      setCamionOptions([])
      setChauffeurOptions([])
    }
  }

  const refreshAll = async () => {
    await Promise.all([fetchData(), fetchOptions()])
    showFeedback('Données actualisées avec succès.', 'success')
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [])

  const handleAdd = async (formData: FormData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/fitoura/entree`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Échec de l'ajout")
      }

      await fetchData(true)
      await fetchOptions()
      showFeedback('Opération ajoutée avec succès.', 'success')
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error)
      showFeedback("Erreur lors de l'ajout de l'opération.", 'danger')
      throw error
    }
  }

  const handleEdit = async (id: string, formData: { poidsSortie?: number | null }) => {
    try {
      const payload: Record<string, any> = {}
      if (formData.poidsSortie !== null && formData.poidsSortie !== undefined) {
        payload.poidsSortie = Number(formData.poidsSortie)
      }

      const res = await fetch(`${API_BASE_URL}/fitoura/sortie/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error('Échec de la mise à jour')
      }

      await fetchData(true)
      showFeedback('Sortie enregistrée avec succès.', 'success')
    } catch (error) {
      console.error('Erreur lors de la mise à jour sortie :', error)
      showFeedback("Erreur lors de l'enregistrement de la sortie.", 'danger')
      throw error
    }
  }

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_BASE_URL}/fitoura/${id}`, {
            method: 'DELETE',
          }),
        ),
      )

      setSelectedRowIds({})
      setShowDeleteModal(false)
      await fetchData(true)
      await fetchOptions()
      showFeedback('Suppression effectuée avec succès.', 'success')
    } catch (error) {
      console.error('Erreur lors de la suppression :', error)
      showFeedback('Erreur lors de la suppression.', 'danger')
    }
  }

  const handleStatusFilterChange = (value: string) => {
    setColumnFilters((prevFilters) => {
      const newFilters = prevFilters.filter((f) => f.id !== 'status')
      if (value) newFilters.push({ id: 'status', value })
      return newFilters
    })
  }





  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<FitouraType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllPageRowsSelected()}
          ref={(input) => {
            if (input) {
              input.indeterminate =
                table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
            }
          }}
          onChange={(e) => {
            const checked = e.target.checked
            const next = { ...selectedRowIds }

            table.getRowModel().rows.forEach((row) => {
              if (checked) next[row.original._id] = true
              else delete next[row.original._id]
            })

            setSelectedRowIds(next)
          }}
        />
      ),
      cell: ({ row }: { row: TableRow<FitouraType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={!!selectedRowIds[row.original._id]}
          onChange={(e) => {
            const checked = e.target.checked
            setSelectedRowIds((prev) => {
              const next = { ...prev }
              if (checked) next[row.original._id] = true
              else delete next[row.original._id]
              return next
            })
          }}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },

    columnHelper.accessor('matriculeCamion', {
      header: 'Matricule camion',
      cell: (info) => info.getValue() || '-',
    }),

    columnHelper.accessor('chauffeur', {
      header: 'Chauffeur',
      cell: (info) => info.getValue() || '-',
    }),

    columnHelper.accessor('poidsEntree', {
      header: "Poids d'entrée (kg)",
      cell: (info) => (
        <Badge bg="warning">
          {info.getValue() !== null && info.getValue() !== undefined
            ? formatNumber(info.getValue(), 2)
            : '-'}
        </Badge>
      ),
    }),

    columnHelper.accessor('poidsSortie', {
      header: 'Poids de sortie (kg)',
      cell: (info) => (
        <Badge bg="success">
          {info.getValue() !== null && info.getValue() !== undefined
            ? formatNumber(info.getValue(), 2)
            : '-'}
        </Badge>
      ),
    }),

    columnHelper.accessor('poidsNet', {
      header: 'Poids net (kg)',
      cell: (info) => (
        <Badge bg="danger">
          {info.getValue() !== null && info.getValue() !== undefined
            ? formatNumber(info.getValue(), 2)
            : '-'}
        </Badge>
      ),
    }),

    columnHelper.accessor('prixUnitaire', {
      header: 'Prix unitaire (DT/kg)',
      cell: (info) => formatNumber(info.getValue(), 3),
    }),

    columnHelper.accessor('montantTotal', {
      header: 'Montant total (DT)',
      cell: (info) => formatNumber(info.getValue(), 3),
    }),

    columnHelper.accessor('status', {
      header: 'Statut',
      cell: ({ row }) => {
        const isTermine = row.original.status === 'TERMINE'

        return (
          <span
            className={`badge ${
              isTermine
                ? 'bg-success-subtle text-success badge-label'
                : 'bg-warning-subtle text-warning badge-label'
            }`}>
            {isTermine ? 'Terminée' : 'En cours'}
          </span>
        )
      },
      filterFn: 'equals',
      id: 'status',
    }),

columnHelper.accessor('dateSortie', {
  header: 'Date sortie',
  cell: (info) => formatDateDDMMYYYY(info.getValue() as string),
  id: 'dateSortie',
}),

   {
  header: 'Actions',
  cell: ({ row }: { row: TableRow<FitouraType> }) => (
    <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center">
      <Button
        variant="default"
        size="sm"
        title="Voir le détail"
        onClick={() => {
          setCurrentOperation(row.original)
          setShowDetailModal(true)
        }}
      >
        <TbEye className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        title="Modifier"
        onClick={() => {
          setCurrentOperation(row.original)
          setShowEditAllModal(true)
        }}
      >
        <TbEdit className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        title="Supprimer"
        onClick={() => {
          setSelectedRowIds({ [row.original._id]: true })
          setShowDeleteModal(true)
        }}
      >
        <TbTrash className="fs-lg" />
      </Button>
    </div>
  ),
  enableSorting: false,
  enableColumnFilter: false,
}
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue || '').toLowerCase().trim()
      if (!search) return true

      const values = [
        row.original.matriculeCamion,
        row.original.chauffeur,
        row.original.status === 'TERMINE' ? 'terminée' : 'en cours',
        row.original.status,
        row.original.poidsEntree,
        row.original.poidsSortie,
        row.original.poidsNet,
        row.original.prixUnitaire,
        row.original.montantTotal,
        row.original.dateSortie,
      ]

      return values.some((value) => String(value ?? '').toLowerCase().includes(search))
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalItems = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  const currentStatusFilter =
    (columnFilters.find((f) => f.id === 'status')?.value as string) || ''

  const exportRows = useMemo(
    () =>
      table.getFilteredRowModel().rows.map((row) => ({
        'Matricule camion': row.original.matriculeCamion || '-',
        Chauffeur: row.original.chauffeur || '-',
        "Poids d'entrée (kg)": formatNumber(row.original.poidsEntree, 3),
        'Poids de sortie (kg)': formatNumber(row.original.poidsSortie, 3),
        'Poids net (kg)': formatNumber(row.original.poidsNet, 3),
        'Prix unitaire (DT/kg)': formatNumber(row.original.prixUnitaire, 3),
        'Montant total (DT)': formatNumber(row.original.montantTotal, 3),
        Statut: row.original.status === 'TERMINE' ? 'Terminée' : 'En cours',
        'Date sortie': formatDateDDMMYYYY(row.original.dateSortie),
      })),
    [table, data, globalFilter, columnFilters, pagination, sorting],
  )
useEffect(() => {
  setData(applyDateFilter(rawData, selectedDates))
  setPagination((prev) => ({
    ...prev,
    pageIndex: 0,
  }))
}, [selectedDates, rawData])
const handleExportPdf = () => {
  if (exportRows.length === 0) {
    showFeedback('Aucune donnée à exporter en PDF.', 'warning')
    return
  }

  try {
    exportToPDF(exportRows, 'fitoura')
    showFeedback('Export PDF lancé avec succès.', 'success')
  } catch (error) {
    console.error("Erreur d'export PDF :", error)
    showFeedback("Erreur lors de l'export PDF.", 'danger')
  }
}

  return (
    <Container fluid>
      <PageBreadcrumb title="Fitoura" subName="Gestion des opérations Fitoura" />

      {feedback.show && (
        <Alert
          variant={feedback.variant}
          dismissible
          onClose={() => setFeedback((prev) => ({ ...prev, show: false }))}
          className="mb-3">
          {feedback.message}
        </Alert>
      )}

      <Row>
        <Col>
          <Card>
            <CardHeader className="border-0 pt-3">
              <div className="d-flex flex-column gap-3">
                <div className="d-flex flex-wrap gap-2 justify-content-start">
                  <Button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <TbPlus className="me-1" />
                    Ajouter une opération
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={refreshAll}
                    disabled={refreshing}>
                    <LuRefreshCcw className="me-1" />
                    {refreshing ? 'Actualisation...' : 'Actualiser'}
                  </Button>

                  <Button variant="outline-danger" onClick={handleExportPdf}>
                    <TbFileExport className="me-1" />
                    Exporter en PDF
                  </Button>

                  <Button
                    variant="danger"
                    disabled={Object.keys(selectedRowIds).length === 0}
                    onClick={toggleDeleteModal}>
                    <TbTrash className="me-1" />
                    Supprimer
                  </Button>
                </div>

                <Row className="g-2 align-items-center">
                  <Col>
                    <Form.Select
                      size="sm"
                      value={currentStatusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      {statusValues.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col>
                    <div className="d-flex gap-2">
                      <Flatpickr
                        className="form-control form-control-sm"
                        options={{
                          mode: 'range',
                          dateFormat: 'Y-m-d',
                        }}
                        value={selectedDates}
                        onChange={(dates: Date[]) => setSelectedDates(dates)}
                        placeholder="Filtrer par date"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedDates([])}
                        title="Réinitialiser les dates">
                        <CgUnavailable />
                      </Button>
                    </div>
                  </Col>

                  <Col>
                    <InputGroup size="sm">
                      <InputGroup.Text>
                        <LuSearch className="fs-lg" />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Recherche..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </div>
            </CardHeader>

            <DataTable table={table} emptyMessage="Aucune opération trouvée" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">Lignes par page :</span>
                    <Form.Select
                      size="sm"
                      style={{ width: '90px' }}
                      value={pageSize}
                      onChange={(e) => {
                        const size = Number(e.target.value)
                        setPagination((prev) => ({
                          ...prev,
                          pageIndex: 0,
                          pageSize: size,
                        }))
                      }}>
                      {[5, 10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </Form.Select>
                  </div>

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
                </div>
              </CardFooter>
            )}
          </Card>
        </Col>
      </Row>

      <FitouraAddModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        camionOptions={camionOptions}
        chauffeurOptions={chauffeurOptions}
      />

      <FitouraEditModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        operation={currentOperation}
        onSubmit={handleEdit}
      />

      <FitouraDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        operation={currentOperation}
        apiBaseUrl={API_BASE_URL}
      />

      <FitouraEditAllModal
        show={showEditAllModal}
        onHide={() => setShowEditAllModal(false)}
        operation={currentOperation}
        camionOptions={camionOptions}
        chauffeurOptions={chauffeurOptions}
        apiBaseUrl={API_BASE_URL}
        onSaved={async () => {
          await fetchData(true)
          await fetchOptions()
          showFeedback('Opération modifiée avec succès.', 'success')
        }}
        onError={() => {
          showFeedback('Erreur lors de la modification.', 'danger')
        }}
      />

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