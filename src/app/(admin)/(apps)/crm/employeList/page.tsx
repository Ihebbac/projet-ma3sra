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
import { TbEdit, TbEye, TbPlus, TbTrash, TbFileExport, TbCalendarCheck, TbCoin } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { exportToXLSX, exportToPDF } from './components/EmployeExporter' 

interface Employe {
  _id: string
  nom: string
  prenom: string
  telephone: string
  poste: string
  salaireJournalier: number
  estActif: boolean 
  joursTravailles: string[]
}

type EmployeTableType = Employe & { nomComplet: string }

const columnHelper = createColumnHelper<EmployeTableType>()
const API_BASE_URL = 'http://localhost:8170/employes'

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

  const fetchData = async () => {
    try {
      const res = await fetch(API_BASE_URL)
      if (!res.ok) throw new Error('Failed to fetch employees')
      const result: Employe[] = await res.json()
      const formattedData: EmployeTableType[] = result.map(emp => ({
        ...emp,
        nomComplet: `${emp.prenom} ${emp.nom}`,
      }))
      setData(formattedData)
    } catch (error) {
      console.error("Erreur lors de la récupération des employés:", error)
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

  const handleMarkPresence = async (employeId: string) => {
    if (!confirm(`Marquer la présence pour l'employé pour aujourd'hui?`)) return;

    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`${API_BASE_URL}/${employeId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      })
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement de la présence.")
      alert('Présence marquée avec succès!')
      fetchData()
    } catch (error) {
      console.error(error)
      alert("Échec de l'enregistrement de la présence.")
    }
  }

  const statusValues = [
    { label: 'Actif', value: 'true' },
    { label: 'Inactif/Retiré', value: 'false' }
  ]

  const handleStatusFilterChange = (value: string) => {
    setColumnFilters((prevFilters) => {
      const newFilters = prevFilters.filter((f) => f.id !== 'estActif')
      if (value) {
        const filterValue = value === 'true'
        newFilters.push({ id: 'estActif', value: filterValue })
      }
      return newFilters
    })
  }

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
    columnHelper.accessor('telephone', { header: 'Téléphone' }),
    columnHelper.accessor('poste', { header: 'Poste' }),
    columnHelper.accessor('salaireJournalier', { header: 'Salaire/Jour (DT)', cell: info => info.getValue() }),
    columnHelper.accessor('estActif', {
      header: 'Statut',
      cell: ({ row }) => {
        const isActive = row.original.estActif
        const color = isActive ? 'bg-success-subtle text-success badge-label' : 'bg-danger-subtle text-danger badge-label'
        const label = isActive ? 'Actif' : 'Inactif'
        return <span className={`badge ${color}`}>{label}</span>
      },
      filterFn: (row, columnId, filterValue) => row.getValue(columnId) === filterValue,
      id: 'estActif',
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<EmployeTableType> }) => (
        <div className="d-flex gap-1">
          {row.original.estActif && (
            <Button variant="success" size="sm" className="btn-icon" title="Marquer Présence" onClick={() => handleMarkPresence(row.original._id)}>
              <TbCalendarCheck className="fs-lg" />
            </Button>
          )}
          <Button variant="info" size="sm" className="btn-icon" onClick={() => { setCurrentEmploye(row.original); console.log('Calcul salaire') }}>
            <TbCoin className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon" onClick={() => { setCurrentEmploye(row.original) }}>
            <TbEdit className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon" onClick={() => { setSelectedRowIds({ [row.id]: true }); toggleDeleteModal() }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

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

  const currentStatusFilter = columnFilters.find((f) => f.id === 'estActif')?.value
    ? columnFilters.find((f) => f.id === 'estActif')?.value.toString()
    : ''

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
                <Button className="btn btn-primary" onClick={() => console.log('Ajouter employé')}>
                  <TbPlus /> Ajouter Employé
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
                      <Dropdown.Item href="#" onClick={(e) => { e.preventDefault(); exportToXLSX(table.getFilteredRowModel().rows, 'employe_data') }}>XLSX</Dropdown.Item>
                      <Dropdown.Item href="#" onClick={(e) => { e.preventDefault(); exportToPDF(table.getFilteredRowModel().rows, 'employe_data').catch(console.error) }}>PDF</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </div>
              <div className="d-flex gap-2 align-items-center">
                <Form.Select value={currentStatusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)} className="form-select-sm" style={{ width: '150px' }}>
                  <option value="">Tous les status</option>
                  {statusValues.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </Form.Select>
                <InputGroup style={{ maxWidth: '300px' }}>
                  <InputGroup.Text><LuSearch className="fs-lg" /></InputGroup.Text>
                  <Form.Control type="text" placeholder="Recherche nom, poste..." value={globalFilter ?? ''} onChange={(e) => setGlobalFilter(e.target.value)} />
                </InputGroup>
              </div>
            </CardHeader>
            <DataTable table={table} emptyMessage="Aucun employé trouvé" />
            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0" suppressHydrationWarning>
                <TablePagination totalItems={totalItems} start={start} end={end} itemsName="employés"
                  showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()}
                  pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex}
                  nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
              </CardFooter>
            )}
          </Card>
        </Col>
      </Row>

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="employés" />
    </Container>
  )
}

export default EmployeCard
