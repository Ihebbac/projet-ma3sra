'use client'

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type Row as TableRow,
  type Table as TableType,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Col,
  Container,
  Row,
  Form,
  InputGroup,
  Dropdown,
  Badge,
  Alert,
  Spinner,
} from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import {
  TbEdit,
  TbEye,
  TbPlus,
  TbTrash,
  TbFileExport,
  TbUserX,
  TbWallet,
  TbRefresh,
  TbReportMoney,
} from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { exportToXLSX, exportToPDF } from './components/EmployeExporter'

import ViewEmployeModal from './components/ViewEmployeModal'
import EditEmployeModal from './components/EditEmployeModal'
import AddEmployeModal from './components/AddEmployeModal'

import AddAbsenceModal from './components/AddAbsenceModal'
import AddAdvanceModal from './components/AddAdvanceModal'
import MonthlySummaryModal from './components/MonthlySummaryModal'

interface Employe {
  _id: string
  nom: string
  prenom: string
  numTel: string
  poste: string
  montantJournalier: number
  montantHeure: number
  salaireJournalier?: number
  estActif?: boolean // ⚠️ backend peut ne pas l'envoyer
  joursPayes?: any[]
  joursTravailles?: any[]
}

type EmployeTableType = Employe & { nomComplet: string }

const columnHelper = createColumnHelper<EmployeTableType>()

const API_HOST = 'http://192.168.1.15:8170'
const API_BASE_URL = `${API_HOST}/employes`

function normalizeEmp(emp: any): EmployeTableType {
  return {
    ...emp,
    estActif: emp.estActif ?? true,
    joursPayes: emp.joursPayes ?? [],
    joursTravailles: emp.joursTravailles ?? [],
    nomComplet: `${emp.prenom} ${emp.nom}`,
  }
}

const EmployeCard = () => {
  const [data, setData] = useState<EmployeTableType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const selectedCount = useMemo(() => Object.keys(selectedRowIds).length, [selectedRowIds])

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentEmploye, setCurrentEmploye] = useState<Employe | null>(null)

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)

  // Pointage simple
  const [showAbsence, setShowAbsence] = useState(false)
  const [showAdvance, setShowAdvance] = useState(false)
  const [showMonthly, setShowMonthly] = useState(false)

  // Filtres simples (plus lisibles que columnFilters)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [posteFilter, setPosteFilter] = useState<string>('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(API_BASE_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch employees')

      const result: Employe[] = await res.json()
      setData(result.map(normalizeEmp))
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Erreur lors de la récupération des employés.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleDeleteModal = () => setShowDeleteModal((v) => !v)

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    if (!selectedIds.length) return

    await Promise.all(selectedIds.map((id) => fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })))
    setSelectedRowIds({})
    await fetchData()
    setShowDeleteModal(false)
  }

  const postes = useMemo(() => {
    const s = new Set<string>()
    data.forEach((e) => {
      const p = (e.poste || '').trim()
      if (p) s.add(p)
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [data])

  const filteredData = useMemo(() => {
    let list = data

    if (statusFilter !== 'all') {
      list = list.filter((e) => (statusFilter === 'active' ? e.estActif !== false : e.estActif === false))
    }
    if (posteFilter) {
      list = list.filter((e) => (e.poste || '') === posteFilter)
    }

    return list
  }, [data, statusFilter, posteFilter])

  const stats = useMemo(() => {
    const total = data.length
    const active = data.filter((e) => e.estActif !== false).length
    const inactive = total - active
    return { total, active, inactive }
  }, [data])

  const columns = useMemo(
    () =>
      [
        {
          id: 'select',
          header: ({ table }: { table: TableType<EmployeTableType> }) => (
            <input
              type="checkbox"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          ),
          cell: ({ row }: { row: TableRow<EmployeTableType> }) => (
            <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
          ),
          enableSorting: false,
          enableColumnFilter: false,
        },

        columnHelper.accessor('nomComplet', {
          header: 'Nom complet',
          filterFn: 'includesString',
          cell: (info) => (
            <div className="d-flex flex-column">
              <span className="fw-semibold">{info.getValue()}</span>
              <small className="text-muted">{info.row.original.poste}</small>
            </div>
          ),
        }),

        columnHelper.accessor('numTel', { header: 'Téléphone' }),

        columnHelper.accessor('montantJournalier', {
          header: 'Jour (DT)',
          cell: (info) => <span className="fw-semibold">{info.getValue()}</span>,
        }),

        columnHelper.accessor('montantHeure', {
          header: 'HS (DT/h)',
          cell: (info) => <span className="text-muted">{info.getValue() ?? 0}</span>,
        }),

        columnHelper.accessor('estActif', {
          header: 'Statut',
          cell: (info) =>
            info.getValue() !== false ? <Badge bg="success">Actif</Badge> : <Badge bg="secondary">Inactif</Badge>,
        }),

    {
  header: 'Actions',
  cell: ({ row }: { row: TableRow<EmployeTableType> }) => (
    <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center">
      <Button
        variant="default"
        size="sm"
        title="Ajouter Absence"
        onClick={() => {
          setCurrentEmploye(row.original)
          setShowAbsence(true)
        }}
      >
        <TbUserX className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        title="Ajouter Avance"
        onClick={() => {
          setCurrentEmploye(row.original)
          setShowAdvance(true)
        }}
      >
        <TbWallet className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        title="Voir"
        onClick={() => {
          setCurrentEmploye(row.original)
          setShowViewModal(true)
        }}
      >
        <TbEye className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        title="Modifier"
        onClick={() => {
          setCurrentEmploye(row.original)
          setShowEditModal(true)
        }}
      >
        <TbEdit className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        title="Supprimer"
        onClick={() => {
          setSelectedRowIds((prev) => ({ ...prev, [row.original._id]: true }))
          setShowDeleteModal(true)
        }}
      >
        <TbTrash className="fs-lg" />
      </Button>
    </div>
  ),
}
      ] as any,
    [],
  )

  const table = useReactTable({
    data: filteredData,
    columns,

    // ✅ FIX CRITIQUE : la sélection doit utiliser _id, pas l’index
    getRowId: (row) => row._id,

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
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <Container fluid>
      <PageBreadcrumb title="Employés" subtitle="Gestion" />

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-3">
        <Col xs={12} className="d-flex flex-wrap gap-2 align-items-center">
          <Badge bg="primary">Total: {stats.total}</Badge>
          <Badge bg="success">Actifs: {stats.active}</Badge>
          <Badge bg="secondary">Inactifs: {stats.inactive}</Badge>
          {loading && (
            <span className="text-muted d-flex align-items-center">
              <Spinner size="sm" className="me-2" /> Chargement...
            </span>
          )}
        </Col>
      </Row>

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between d-flex flex-wrap gap-2 align-items-center">
              <div className="d-flex flex-wrap gap-2">
                <Button className="btn btn-primary" onClick={() => setShowAddModal(true)} disabled={loading}>
                  <TbPlus /> Ajouter Employé
                </Button>

                <Button variant="outline-primary" onClick={() => setShowMonthly(true)} disabled={loading}>
                  <TbReportMoney className="me-1" /> Résumé mensuel
                </Button>

                {selectedCount > 0 && (
                  <Button variant="danger" onClick={toggleDeleteModal} disabled={loading}>
                    <TbTrash /> Supprimer ({selectedCount})
                  </Button>
                )}

                <Button variant="outline-secondary" onClick={fetchData} disabled={loading}>
                  <TbRefresh className="me-1" /> Actualiser
                </Button>

                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" id="dropdown-export-data" disabled={loading}>
                    <TbFileExport /> Exporter
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        exportToXLSX(table.getFilteredRowModel().rows, 'employe_data')
                      }}
                    >
                      XLSX
                    </Dropdown.Item>
                    <Dropdown.Item
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        exportToPDF(table.getFilteredRowModel().rows, 'employe_data')
                      }}
                    >
                      PDF
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Form.Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ width: 160 }}
                  disabled={loading}
                >
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </Form.Select>

                <Form.Select
                  size="sm"
                  value={posteFilter}
                  onChange={(e) => setPosteFilter(e.target.value)}
                  style={{ width: 200 }}
                  disabled={loading}
                >
                  <option value="">Tous les postes</option>
                  {postes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Form.Select>

                <InputGroup style={{ width: 280 }}>
                  <InputGroup.Text>
                    <LuSearch className="fs-lg" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Recherche nom, téléphone..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    disabled={loading}
                  />
                </InputGroup>
              </div>
            </CardHeader>

            <DataTable table={table} emptyMessage="Aucun employé trouvé" />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0" suppressHydrationWarning>
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="employés"
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

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={toggleDeleteModal}
        onConfirm={handleDelete}
        selectedCount={selectedCount}
        itemName="employés"
      />

      <AddEmployeModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSubmit={async (payload) => {
          await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          fetchData()
        }}
      />

      <EditEmployeModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        employe={currentEmploye}
        onSubmit={async (payload) => {
          await fetch(`${API_BASE_URL}/${payload._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          fetchData()
        }}
      />

 
      <ViewEmployeModal
  show={showViewModal}
  onHide={() => setShowViewModal(false)}
  employe={currentEmploye ?? null}
  apiHost={API_HOST}
/>

      <AddAbsenceModal
        show={showAbsence}
        onHide={() => setShowAbsence(false)}
        employe={currentEmploye}
        apiHost={API_HOST}
        onDone={fetchData}
      />

      <AddAdvanceModal
        show={showAdvance}
        onHide={() => setShowAdvance(false)}
        employe={currentEmploye}
        apiHost={API_HOST}
        onDone={fetchData}
      />

      <MonthlySummaryModal show={showMonthly} onHide={() => setShowMonthly(false)} apiHost={API_HOST} />
    </Container>
  )
}

export default EmployeCard