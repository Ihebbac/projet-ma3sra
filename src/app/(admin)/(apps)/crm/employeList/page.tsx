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
import { Button, Card, CardFooter, CardHeader, Col, Container, Row, Form, InputGroup, Dropdown } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash, TbFileExport, TbCoin } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { exportToXLSX, exportToPDF } from './components/EmployeExporter'
import ViewEmployeModal from './components/ViewEmployeModal'
import EditEmployeModal from './components/EditEmployeModal'
import AddEmployeModal from './components/AddEmployeModal'
import DaySheetModal from './components/DaySheetModal'

interface Employe {
  _id: string
  nom: string
  prenom: string
  numTel: string
  poste: string
  montantJournalier: number
  montantHeure: number
  salaireJournalier?: number
  estActif: boolean
  joursPayes: string[]
  joursTravailles: { date: string; heuresSup: number }[]
}

type EmployeTableType = Employe & { nomComplet: string }

const columnHelper = createColumnHelper<any>()
const API_BASE_URL = 'http://192.168.1.15:8170/employes'

const EmployeCard = () => {
  const [data, setData] = useState<EmployeTableType[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentEmploye, setCurrentEmploye] = useState<Employe | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [columnFilters, setColumnFilters] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)

  // ✅ nouveau : Feuille du jour
  const [showDaySheet, setShowDaySheet] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch(API_BASE_URL)
      if (!res.ok) throw new Error('Failed to fetch employees')
      const result: Employe[] = await res.json()
      const formattedData: EmployeTableType[] = result.map((emp: any) => ({
        ...emp,
        estActif: emp.estActif ?? true, // ✅ si le champ n'existe pas => actif
        joursPayes: emp.joursPayes ?? [],
        joursTravailles: emp.joursTravailles ?? [],
        nomComplet: `${emp.prenom} ${emp.nom}`,
      }))
      setData(formattedData)
    } catch (error) {
      console.error('Erreur lors de la récupération des employés:', error)
    }
  }

  useEffect(() => {
    fetchData()
    setIsClient(true)
  }, [])

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    await Promise.all(selectedIds.map((id) => fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })))
    setSelectedRowIds({})
    fetchData()
    setShowDeleteModal(false)
  }

  const toggleDeleteModal = () => setShowDeleteModal(!showDeleteModal)

  const columns = [
    {
      id: 'select',
      header: ({ table }: { table: TableType<EmployeTableType> }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
      ),
      cell: ({ row }: { row: TableRow<EmployeTableType> }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    columnHelper.accessor('nomComplet', { header: 'Nom Complet', filterFn: 'includesString' }),
    columnHelper.accessor('numTel', { header: 'Téléphone' }),
    columnHelper.accessor('poste', { header: 'Poste' }),
    columnHelper.accessor('montantJournalier', { header: 'Salaire/Jour (DT)', cell: (info) => info.getValue() }),
    columnHelper.accessor('joursTravailles', {
      header: 'Jours Travaillés',
      cell: (info) => {
        const raw = info.getValue() as any

        if (!Array.isArray(raw) || raw.length === 0) return '-'

        const parsed = raw
          .map((item: any) => {
            const dateStr = typeof item === 'string' ? item : item?.date
            const d = dateStr ? new Date(dateStr) : null
            if (!d || isNaN(d.getTime())) return null
            return { date: d, heuresSup: Number(item?.heuresSup || 0) }
          })
          .filter(Boolean) as { date: Date; heuresSup: number }[]

        if (parsed.length === 0) return '-'

        parsed.sort((a, b) => b.date.getTime() - a.date.getTime())

        const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

        const latest = parsed[0]

        return (
          <div className="d-flex flex-column align-items-start gap-1">
            <span className="badge bg-primary">
              {parsed.length} jour{parsed.length > 1 ? 's' : ''}
            </span>
            <small className="text-muted">
              Dernier : {formatDate(latest.date)}
              {latest.heuresSup ? ` · HS: ${latest.heuresSup}` : ''}
            </small>
          </div>
        )
      },
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<EmployeTableType> }) => (
        <div className="d-flex gap-1">
          <Button
            variant="info"
            size="sm"
            className="btn-icon"
            title="Voir"
            onClick={() => {
              setCurrentEmploye(row.original)
              setShowViewModal(true)
            }}>
            <TbEye className="fs-lg" />
          </Button>

          <Button
            variant="warning"
            size="sm"
            className="btn-icon"
            title="Modifier"
            onClick={() => {
              setCurrentEmploye(row.original)
              setShowEditModal(true)
            }}>
            <TbEdit className="fs-lg" />
          </Button>

          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              setSelectedRowIds({ [row.original._id]: true })
              toggleDeleteModal()
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ] as any

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds, columnFilters },
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

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <Container fluid>
      <PageBreadcrumb title="Employés" subtitle="Gestion" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between d-flex align-items-center">
              <div className="d-flex gap-2">
                <Button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  <TbPlus /> Ajouter Employé
                </Button>

                {/* ✅ nouveau bouton Feuille du jour */}
                <Button
                  variant="outline-primary"
                  onClick={async () => {
                    // ✅ si la liste est vide, on recharge avant d'ouvrir
                    if (!data.length) {
                      await fetchData()
                    }
                    setShowDaySheet(true)
                  }}>
                  <TbCoin className="me-1" /> Feuille du jour
                </Button>

                {isClient && Object.keys(selectedRowIds).length > 0 && (
                  <Button variant="danger" onClick={toggleDeleteModal}>
                    <TbTrash /> Supprimer ({Object.keys(selectedRowIds).length})
                  </Button>
                )}

                {isClient && (
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" id="dropdown-export-data">
                      <TbFileExport /> Exporter
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          exportToXLSX(table.getFilteredRowModel().rows, 'employe_data')
                        }}>
                        XLSX
                      </Dropdown.Item>
                      <Dropdown.Item
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          exportToPDF(table.getFilteredRowModel().rows, 'employe_data')
                        }}>
                        PDF
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </div>

              <div className="d-flex gap-2 align-items-center">
                <InputGroup style={{ maxWidth: '300px' }}>
                  <InputGroup.Text>
                    <LuSearch className="fs-lg" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Recherche nom, poste..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
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
        selectedCount={Object.keys(selectedRowIds).length}
        itemName="employés"
      />

      <AddEmployeModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSubmit={async (data) => {
          await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          fetchData()
        }}
      />

      <EditEmployeModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        employe={currentEmploye}
        onSubmit={async (data) => {
          await fetch(`${API_BASE_URL}/${data._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          fetchData()
        }}
      />

      <ViewEmployeModal show={showViewModal} onHide={() => setShowViewModal(false)} employe={currentEmploye ?? null} />

      {/* ✅ Modal Feuille du jour */}
      <DaySheetModal show={showDaySheet} onHide={() => setShowDaySheet(false)} employes={data as any} apiBaseUrl={API_BASE_URL} onSaved={fetchData} />
    </Container>
  )
}

export default EmployeCard
