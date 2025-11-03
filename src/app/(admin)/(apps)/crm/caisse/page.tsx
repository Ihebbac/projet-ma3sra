'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { Button, Card, CardFooter, CardHeader, Col, Container, Row, Badge, ButtonGroup } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { CgUnavailable } from 'react-icons/cg'
import { TbEdit, TbEye, TbPlus, TbTrash, TbHistory, TbFileExport } from 'react-icons/tb'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import PageBreadcrumb from '@/components/PageBreadcrumb'

import CaisseViewModal from './components/CustomerModalViewDetail'
import CaisseEditModal from './components/CustomerEditModal'
import CaisseAddModal from './components/CustomerModal'
import CaissesHistoryModal from './components/CaissesHistoryModal'
import { exportToExcel, exportToPDF } from './components/exportUtils'

type Caisse = {
  _id: string
  motif: string
  montant: number
  type: string
  date: string | null // ISO string
  commentaire: string
  nomutilisatuer:string
}

type User = {
    roles?: string[]
} | null

const columnHelper = createColumnHelper<Caisse>()

// utils
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const isCredit = (t?: string) => (t ? /cred/i.test(t) : false)
const isDebit = (t?: string) => (t ? /deb/i.test(t) : false)
const fmtMoney = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CustomersCard = () => {
  const [data, setData] = useState<Caisse[]>([])
  const [filteredData, setFilteredData] = useState<Caisse[]>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // 1. GESTION DE L'UTILISATEUR ET DU RÔLE
  const [user, setUser] = useState<User>(null)
  
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [selectedCaisse, setSelectedCaisse] = useState<Caisse | null>(null)
  const [showView, setShowView] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // 2. CHARGEMENT DU RÔLE DEPUIS LOCALSTORAGE
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing user from localStorage:', error)
        setUser(null)
      }
    }
  }, [])

  // Variable dérivée pour vérifier le rôle
  const isCaissier = user?.roles?.includes('caissier') ?? false

  // fetch caisses
  const fetchCaisses = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8170/caisse')
      if (!res.ok) throw new Error('Fetch caisses failed')
      const json = await res.json()
      const normalized: Caisse[] = (Array.isArray(json) ? json : []).map((c: any) => ({
        _id: String(c._id ?? c.id ?? crypto.randomUUID()),
        motif: String(c.motif ?? ''),
        montant: Number(c.montant ?? 0),
        type: String(c.type ?? ''),
        date: c.date ? new Date(c.date).toISOString() : null,
        commentaire: String(c.commentaire ?? ''),
        nomutilisatuer: String(c.nomutilisatuer ?? ''),
      }))
      setData(normalized)
    } catch (err) {
      console.error('Error fetching caisses:', err)
      setData([])
    }
  }, [])

  useEffect(() => {
    void fetchCaisses()
  }, [fetchCaisses])

  const handleRefetchAfterSave = useCallback(async () => {
    await fetchCaisses()
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [fetchCaisses])

  // Filtrage global + par date (jour exact ou plage)
  useEffect(() => {
    let result = [...data]

    if (globalFilter.trim() !== '') {
      const term = globalFilter.trim().toLowerCase()
      result = result.filter((item) => {
        const motif = item.motif?.toLowerCase() ?? ''
        const type = item.type?.toLowerCase() ?? ''
        const commentaire = item.commentaire?.toLowerCase() ?? ''
        const nomutilisatuer = item.nomutilisatuer?.toLowerCase() ?? ''
        const montant = String(item.montant ?? '').toLowerCase()
        return motif.includes(term) || type.includes(term) || commentaire.includes(term) || montant.includes(term)
      })
    }

    if (selectedDates.length === 1) {
      const d = startOfDay(selectedDates[0])
      result = result.filter((item) => {
        if (!item.date) return false
        const dt = startOfDay(new Date(item.date))
        return sameDay(dt, d)
      })
    } else if (selectedDates.length === 2) {
      const start = startOfDay(selectedDates[0])
      const end = addDays(startOfDay(selectedDates[1]), 1) // inclure la fin
      result = result.filter((item) => {
        if (!item.date) return false
        const dt = new Date(item.date)
        return dt >= start && dt < end
      })
    }

    setFilteredData(result)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [globalFilter, selectedDates, data])

  // 3. CALCUL DES TOTAUX FILTRÉS (Doit être avant les fonctions d'export)
  const filteredCredit = filteredData.filter((it) => isCredit(it.type)).reduce((a, b) => a + (b.montant || 0), 0)
  const filteredDebit = filteredData.filter((it) => isDebit(it.type)).reduce((a, b) => a + (b.montant || 0), 0)
  const filteredNet = filteredCredit - filteredDebit


  // Fonctions d'export
  const handleExportPDF = useCallback(() => {
    const exportData = filteredData.map((item) => ({
      Motif: item.motif,
      Montant: `${isCredit(item.type) ? '+' : '-'} ${fmtMoney(Math.abs(item.montant))} DT`,
      Type: isCredit(item.type) ? 'Crédit' : 'Débit',
      Date: formatDateDDMMYYYY(item.date),
      Commentaire: item.commentaire,
      nomutilisatuer: item.nomutilisatuer,
    }))

    const totals = {
      'Total Crédit': `${fmtMoney(filteredData.filter((it) => isCredit(it.type)).reduce((a, b) => a + (b.montant || 0), 0))} DT`,
      'Total Débit': `${fmtMoney(filteredData.filter((it) => isDebit(it.type)).reduce((a, b) => a + (b.montant || 0), 0))} DT`,
      'Total Net': `${filteredNet >= 0 ? '+' : '-'} ${fmtMoney(Math.abs(filteredNet))} DT`,
    }

    exportToPDF(
      exportData,
      'Rapport_Caisses',
      `Caisses - ${
        selectedDates.length === 1
          ? formatDateDDMMYYYY(selectedDates[0].toISOString())
          : selectedDates.length === 2
            ? `${formatDateDDMMYYYY(selectedDates[0].toISOString())} à ${formatDateDDMMYYYY(selectedDates[1].toISOString())}`
            : 'Toutes les dates'
      }`,
      totals,
    )
  }, [filteredData, selectedDates, filteredNet])

  const handleExportExcel = useCallback(() => {
    const exportData = filteredData.map((item) => ({
      Motif: item.motif,
      Montant: item.montant,
      Type: isCredit(item.type) ? 'Crédit' : 'Débit',
      Date: item.date ? new Date(item.date) : null,
      Commentaire: item.commentaire,
      nomutilisatuer: item.nomutilisatuer,
      Signe: isCredit(item.type) ? '+' : '-',
    }))

    const totals = [
      {
        Motif: 'TOTAUX',
        'Total Crédit': filteredData.filter((it) => isCredit(it.type)).reduce((a, b) => a + (b.montant || 0), 0),
        'Total Débit': filteredData.filter((it) => isDebit(it.type)).reduce((a, b) => a + (b.montant || 0), 0),
        'Total Net': filteredNet,
      },
    ]

    exportToExcel(exportData, 'Caisses', `Rapport_Caisses_${new Date().toISOString().split('T')[0]}`, totals)
  }, [filteredData, filteredNet])

  // 4. DÉFINITION DES COLONNES AVEC RESTRICTION D'ACCÈS
  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }: { table: TableType<Caisse> }) => (
          <input
            type="checkbox"
            className="form-check-input form-check-input-light fs-14"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }: { row: TableRow<Caisse> }) => (
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
      columnHelper.accessor('motif', {
        header: 'Motif',
        cell: (ctx) => <span className="fw-semibold">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('montant', {
        header: 'Montant',
        cell: (ctx) => {
          const row = ctx.row.original
          const value = Number(ctx.getValue() ?? 0)
          const isCred = isCredit(row.type)
          const sign = isCred ? '+' : '-' // convention: Crédit = +, Débit = -
          return (
            <span className={`fw-bold ${isCred ? 'text-success' : 'text-danger'}`}>
              {sign} {fmtMoney(Math.abs(value))} DT
            </span>
          )
        },
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (ctx) => {
          const t = String(ctx.getValue() ?? '').toLowerCase()
          const isCred = isCredit(t)
          return (
            <Badge bg={isCred ? 'success' : 'danger'} pill className="text-uppercase">
              {isCred ? 'Crédit' : 'Débit'}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (ctx) => formatDateDDMMYYYY(ctx.getValue()),
      }),
      columnHelper.accessor('commentaire', {
        header: 'Commentaire',
        cell: (ctx) => <span className="text-muted">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('nomutilisatuer', {
        header: 'Ajouter Par',
        cell: (ctx) => {console.log("ctx",ctx.column);
          return (<Badge bg="danger">{ctx.getValue().split('@')[0] || "N/A"}</Badge>)},
      }),
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: TableRow<Caisse> }) => {
          const caisse = row.original
          
          // Définition des motifs protégés
          const isProtectedMotif = caisse.motif === 'Payment Client' || caisse.motif === 'Paiement Employé'
          
          // Condition de désactivation : Rôle 'caissier' ET motif protégé
          const actionsDisabled = isCaissier && isProtectedMotif
          
          return (
            <div className="d-flex gap-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedCaisse(row.original)
                  setShowView(true)
                }}
                title="Voir">
                <TbEye className="fs-lg" />
              </Button>
              
              {/* Bouton Modifier (affiché seulement si non désactivé) */}
              {!actionsDisabled && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setSelectedCaisse(row.original)
                    setShowEdit(true)
                  }}
                  title="Modifier">
                  <TbEdit className="fs-lg" />
                </Button>
              )}
              
              {/* Bouton Supprimer (affiché seulement si non désactivé) */}
              {!actionsDisabled && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setRowSelection({ [row.id]: true })
                    setShowDeleteModal(true)
                  }}
                  title="Supprimer">
                  <TbTrash className="fs-lg" />
                </Button>
              )}
              
              {/* Icône de non-disponibilité (Optionnel) */}
              {actionsDisabled && (
                <span title="Action restreinte pour les caissiers sur ce motif">
                  <CgUnavailable className="fs-lg text-secondary" />
                </span>
              )}
            </div>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [isCaissier], 
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
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

  const handleDelete = async () => {
    const selectedRows = table.getSelectedRowModel().flatRows
    const idsToDelete = new Set<string>(selectedRows.map((r) => r.original._id))

    // 5. VÉRIFICATION SUPPLÉMENTAIRE AVANT SUPPRESSION
    if (isCaissier) {
        const hasProtected = selectedRows.some(row => 
            row.original.motif === 'Payment Client' || row.original.motif === 'Paiement Employé'
        )
        if (hasProtected) {
            console.error("Caissier a tenté de supprimer un motif protégé. Opération annulée.")
            alert("Vous n'êtes pas autorisé à supprimer les motifs 'Payment Client' ou 'Paiement Employé'.")
            setRowSelection({})
            setShowDeleteModal(false)
            return
        }
    }
    
    // API DELETE
    await Promise.all([...idsToDelete].map((id) => fetch(`http://localhost:8170/caisse/${id}`, { method: 'DELETE' }).catch(() => null)))

    setData((old) => old.filter((item) => !idsToDelete.has(item._id)))
    setRowSelection({})
    setShowDeleteModal(false)
  }

  // Totaux du jour (basés sur date == aujourd'hui)
  const today = new Date()
  const todaysItems = data.filter((d) => (d.date ? sameDay(new Date(d.date), today) : false))
  const totalCreditToday = todaysItems.filter((it) => isCredit(it.type)).reduce((acc, it) => acc + (Number(it.montant) || 0), 0)
  const totalDebitToday = todaysItems.filter((it) => isDebit(it.type)).reduce((acc, it) => acc + (Number(it.montant) || 0), 0)
  const totalTodayNet = totalCreditToday - totalDebitToday

  // 💡 Note: filteredNet est défini plus haut pour être accessible par les fonctions d'export.

  // 🧭 Filtres rapides
  const applyQuickRange = (mode: 'today' | '7d' | '30d' | 'all') => {
    const now = new Date()
    if (mode === 'today') return setSelectedDates([now])
    if (mode === '7d') return setSelectedDates([addDays(now, -6), now]) // inclut aujourd'hui
    if (mode === '30d') return setSelectedDates([addDays(now, -29), now])
    return setSelectedDates([])
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Caisses" subtitle="CRM" />

      <Row className="g-3">
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Total net (Aujourd'hui)
              <span className={`fw-bold ${totalTodayNet >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalTodayNet >= 0 ? '+' : '-'} {fmtMoney(Math.abs(totalTodayNet))} DT
              </span>
            </CardHeader>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Crédit (Aujourd'hui)
              <span className="fw-bold text-success">+ {fmtMoney(totalCreditToday)} DT</span>
            </CardHeader>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Débit (Aujourd'hui)
              <span className="fw-bold text-danger">- {fmtMoney(totalDebitToday)} DT</span>
            </CardHeader>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light d-flex justify-content-between align-items-center">
              Total (Filtre courant)
              <span className={`fw-bold ${filteredNet >= 0 ? 'text-success' : 'text-danger'}`}>
                {filteredNet >= 0 ? '+' : '-'} {fmtMoney(Math.abs(filteredNet))} DT
              </span>
            </CardHeader>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Motif, Type, Commentaire ..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                <Button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                  <TbPlus className="fs-lg" /> Ajouter une caisse
                </Button>

                <Button variant="outline-secondary" onClick={() => setShowHistory(true)}>
                  <TbHistory className="me-1" /> Historique
                </Button>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Boutons d'export */}
                <ButtonGroup aria-label="Export buttons">
                  <Button variant="outline-success" size="sm" onClick={handleExportExcel} title="Exporter en Excel">
                    <TbFileExport className="me-1" /> Excel
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={handleExportPDF} title="Exporter en PDF">
                    <TbFileExport className="me-1" /> PDF
                  </Button>
                </ButtonGroup>

                <ButtonGroup aria-label="Quick ranges">
                  <Button variant="outline-dark" size="sm" onClick={() => applyQuickRange('today')}>
                    Aujourd'hui
                  </Button>
                  <Button variant="outline-dark" size="sm" onClick={() => applyQuickRange('7d')}>
                    7j
                  </Button>
                  <Button variant="outline-dark" size="sm" onClick={() => applyQuickRange('30d')}>
                    30j
                  </Button>
                  <Button variant="outline-dark" size="sm" onClick={() => applyQuickRange('all')}>
                    Tout
                  </Button>
                </ButtonGroup>
                <div className="d-flex align-items-center gap-3">
                  <span className="fw-semibold">Date</span>
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
              </div>
            </CardHeader>

            <DataTable<Caisse> table={table} emptyMessage="Aucune caisse trouvée" />

            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="caisses"
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
              selectedCount={table.getSelectedRowModel().flatRows.length}
              itemName="caisses"
            />
          </Card>
        </Col>
      </Row>

      {/* Add / View / Edit */}
      <CaisseAddModal show={showAdd} onHide={() => setShowAdd(false)} onAdded={handleRefetchAfterSave} />
      <CaisseViewModal show={showView} onHide={() => setShowView(false)} caisse={selectedCaisse} />
      {/* 6. PASSAGE DE LA PROP isCaissier AU MODAL D'ÉDITION */}
      <CaisseEditModal show={showEdit} onHide={() => setShowEdit(false)} caisse={selectedCaisse} onUpdated={handleRefetchAfterSave} isCaissier={isCaissier} />

      {/* Historique complet */}
      <CaissesHistoryModal show={showHistory} onHide={() => setShowHistory(false)} data={data} />
    </Container>
  )
}

export default CustomersCard