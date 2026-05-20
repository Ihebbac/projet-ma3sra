'use client'

import { Alert, Badge, Button, CardFooter, Col, Container, Row, Modal, Form, ProgressBar, Toast, ToastContainer } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbPlus, TbTrash, TbDownload, TbRefresh, TbTank, TbTransfer, TbDroplet } from 'react-icons/tb'
import { LuSearch } from 'react-icons/lu'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Row as TableRow, type Table as TableType } from '@tanstack/table-core'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { useToggle } from 'usehooks-ts'
import CreateDealModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/CreateDealModal'
import ViewDetailModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/ViewDetailModal'
import EditModal from '@/app/(admin)/(apps)/crm/Qteproprietaire/components/EditModal'
import { exportToPDF } from './components/TableExporter'

// ======================================================================
// Types
// ======================================================================
type OilType = 'bio' | 'extra' | 'normal'

type Tank = {
  id: string
  name: string
  capacity: number
  currentAmount: number
  oilType: OilType | null
  fillPercentage: number
  status: 'empty' | 'filling' | 'almost_full' | 'full'
}

type ToastMessage = {
  id: number
  message: string
  type: 'success' | 'danger' | 'warning' | 'info'
}

type CustomerType = {
  _id: string
  nomPrenom: string
  dateCreation: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  quantiteOliveNet?: number
  kattou3?: number
  nisba?: number
  numCIN?: number
  numTelephone?: number
  type?: string
}

type TableCustomerType = CustomerType & { selected?: boolean }

const columnHelper = createColumnHelper<TableCustomerType>()

const defaultRowData: CustomerType = {
  _id: '',
  nomPrenom: 'Propriétaire',
  dateCreation: new Date().toISOString(),
  nombreCaisses: 0,
  quantiteOlive: 0,
  quantiteHuile: 0,
  kattou3: 0,
  nisba: 0,
  quantiteOliveNet: 0,
}

// ======================================================================
// CSS Styles for Tank
// ======================================================================
const tankStyles = {
  container: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '200px',
    margin: '0 auto',
    cursor: 'pointer',
    transition: 'transform 0.3s ease',
  },
  cylinder: {
    position: 'relative' as const,
    borderRadius: '50% / 10%',
    border: '3px solid #2d3748',
    overflow: 'hidden',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    height: '280px',
    transition: 'all 0.3s ease',
  },
  tankTop: {
    position: 'absolute' as const,
    top: '-5px',
    left: '25%',
    width: '50%',
    height: '15px',
    background: '#718096',
    borderRadius: '5px',
    zIndex: 3,
  },
  oilDrop: {
    position: 'absolute' as const,
    top: '-20px',
    width: '8px',
    height: '12px',
    background: '#ffd700',
    borderRadius: '50%',
    animation: 'pulse 1s ease-in-out infinite',
  },
}

// Add keyframes to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes liquidFill {
      0% { transform: translateY(100%); }
      100% { transform: translateY(0); }
    }
    
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    
    .tank-container:hover {
      transform: translateY(-5px);
    }
    
    .liquid {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      transition: height 0.5s ease;
      animation: liquidFill 0.8s ease-out;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
    }
    
    .liquid::before {
      content: '';
      position: absolute;
      top: -5px;
      left: 0;
      right: 0;
      height: 5px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
    }
    
    .wave {
      position: absolute;
      height: 10px;
      background: rgba(255, 255, 255, 0.4);
      animation: pulse 2s ease-in-out infinite;
      pointer-events: none;
    }
    
    .cylinder::before {
      content: '';
      position: absolute;
      top: -10px;
      left: 10%;
      width: 80%;
      height: 20px;
      background: #4a5568;
      border-radius: 50%;
      z-index: 2;
    }
    
    .cylinder::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 10%;
      width: 80%;
      height: 15px;
      background: #2d3748;
      border-radius: 50%;
      z-index: 2;
    }
    
    .oil-drop {
      position: absolute;
      top: -20px;
      width: 8px;
      height: 12px;
      background: #ffd700;
      border-radius: 50%;
      animation: pulse 1s ease-in-out infinite;
    }
    
    .oil-drop::before {
      content: '';
      position: absolute;
      top: -5px;
      left: -2px;
      width: 12px;
      height: 12px;
      background: #ffd700;
      border-radius: 50%;
    }
  `
  document.head.appendChild(style)
}

// ======================================================================
// Helpers
// ======================================================================
type RangeKey = '0-50' | '51-200' | '201+'
type HuileRange = 'All' | RangeKey
type StockType = 'All' | 'olive' | 'olive_huile'

const matchHuileRange = (value: number, range: RangeKey) => {
  if (range === '0-50') return value >= 0 && value <= 50
  if (range === '51-200') return value >= 51 && value <= 200
  return value >= 201
}

const n2 = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0)

const datePart = (value: any): string => {
  const s = String(value ?? '')
  if (!s) return ''
  if (s.length >= 10) return s.slice(0, 10)
  return s
}

const getOilTypeColor = (oilType: OilType | null): string => {
  switch(oilType) {
    case 'bio': return 'success'
    case 'extra': return 'warning'
    case 'normal': return 'info'
    default: return 'secondary'
  }
}

const getOilTypeLabel = (oilType: OilType | null): string => {
  switch(oilType) {
    case 'bio': return 'Bio'
    case 'extra': return 'Extra'
    case 'normal': return 'Normal'
    default: return 'Vide'
  }
}

// Couleurs de la citerne selon le niveau de remplissage
const getTankColorByFillLevel = (percentage: number): string => {
  if (percentage >= 80) return '#ef4444' // Rouge - presque plein ou plein
  if (percentage >= 50) return '#f59e0b' // Orange - remplissage moyen
  return '#10b981' // Vert - faible remplissage
}

// Couleurs du liquide selon le niveau de remplissage
const getLiquidColorByFillLevel = (percentage: number): string => {
  if (percentage >= 80) return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' // Rouge
  if (percentage >= 50) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' // Orange
  return 'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Vert
}

// Message de statut selon le niveau
const getStatusMessage = (percentage: number): string => {
  if (percentage >= 95) return '⚠️ Citerne presque pleine!'
  if (percentage >= 80) return '🔴 Niveau élevé'
  if (percentage >= 50) return '🟠 Niveau moyen'
  if (percentage > 0) return '🟢 Niveau bas'
  return '⚪ Citerne vide'
}

// ======================================================================
// Page Component
// ======================================================================
const Qteclient = () => {
  const [data, setData] = useState<TableCustomerType[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [selectedRow, setSelectedRow] = useState<CustomerType>(defaultRowData)

  const [typeFilter, setTypeFilter] = useState<StockType>('All')
  const [huileRange, setHuileRange] = useState<HuileRange>('All')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const [tanks, setTanks] = useState<Tank[]>([])
  const [showTankModal, setShowTankModal] = useState<boolean>(false)
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false)
  const [showAddOilModal, setShowAddOilModal] = useState<boolean>(false)
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null)
  const [newTankCapacity, setNewTankCapacity] = useState<number>(1000)
  const [newTankName, setNewTankName] = useState<string>('')
  const [newTankOilType, setNewTankOilType] = useState<OilType>('normal')
  const [transferData, setTransferData] = useState({
    fromTankId: '',
    toTankId: '',
    amount: 0
  })
  const [addOilAmount, setAddOilAmount] = useState<number>(100)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [showDealModal, toggleDealModal] = useToggle(false)
  const [showViewModal, setShowViewModal] = useState<boolean>(false)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)

  const toggleDeleteModal = () => setShowDeleteModal((v) => !v)

  const addToast = (message: string, type: 'success' | 'danger' | 'warning' | 'info') => {
    const newToast = {
      id: Date.now(),
      message,
      type
    }
    setToasts(prev => [...prev, newToast])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id))
    }, 5000)
  }

  const fetchProprietaires = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8170/proprietaires', { cache: 'no-store' as any })
      if (!response.ok) throw new Error('Failed to fetch data')
      const json: CustomerType[] = await response.json()
      setData(Array.isArray(json) ? (json as any) : [])
    } catch (err) {
      console.error('Error fetching proprietaires:', err)
      setData([])
      addToast('Erreur lors du chargement des données', 'danger')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProprietaires()
    const savedTanks = localStorage.getItem('oilTanks')
    if (savedTanks) {
      setTanks(JSON.parse(savedTanks))
    } else {
      const initialTanks: Tank[] = [
        {
          id: '1',
          name: 'Citerne Nord',
          capacity: 1000,
          currentAmount: 450,
          oilType: 'extra',
          fillPercentage: 45,
          status: 'filling'
        },
        {
          id: '2',
          name: 'Citerne Sud',
          capacity: 1500,
          currentAmount: 1350,
          oilType: 'bio',
          fillPercentage: 90,
          status: 'almost_full'
        },
        {
          id: '3',
          name: 'Citerne Est',
          capacity: 800,
          currentAmount: 200,
          oilType: 'normal',
          fillPercentage: 25,
          status: 'filling'
        }
      ]
      setTanks(initialTanks)
      localStorage.setItem('oilTanks', JSON.stringify(initialTanks))
    }
  }, [fetchProprietaires])

  useEffect(() => {
    if (tanks.length > 0) {
      localStorage.setItem('oilTanks', JSON.stringify(tanks))
    }
  }, [tanks])

  useEffect(() => {
    setTanks(prevTanks => 
      prevTanks.map(tank => ({
        ...tank,
        fillPercentage: (tank.currentAmount / tank.capacity) * 100,
        status: tank.currentAmount === 0 ? 'empty' 
          : tank.currentAmount >= tank.capacity * 0.9 ? 'almost_full'
          : tank.currentAmount >= tank.capacity ? 'full'
          : 'filling'
      }))
    )
  }, [tanks.map(t => t.currentAmount).join(',')])

  const addTank = () => {
    if (newTankCapacity <= 0) {
      addToast('La capacité doit être supérieure à 0', 'warning')
      return
    }

    if (!newTankName.trim()) {
      addToast('Veuillez donner un nom à la citerne', 'warning')
      return
    }

    const newTank: Tank = {
      id: Date.now().toString(),
      name: newTankName,
      capacity: newTankCapacity,
      currentAmount: 0,
      oilType: newTankOilType,
      fillPercentage: 0,
      status: 'empty'
    }

    setTanks([...tanks, newTank])
    addToast(`Citerne "${newTankName}" créée avec succès avec de l'huile ${getOilTypeLabel(newTankOilType)}`, 'success')
    setNewTankCapacity(1000)
    setNewTankName('')
    setNewTankOilType('normal')
    setShowTankModal(false)
  }

  const deleteTank = (tankId: string) => {
    const tankToDelete = tanks.find(t => t.id === tankId)
    setTanks(tanks.filter(tank => tank.id !== tankId))
    addToast(`Citerne "${tankToDelete?.name}" supprimée`, 'info')
  }

  const addOilToTank = () => {
    if (!selectedTank) return
    
    if (addOilAmount <= 0) {
      addToast('La quantité doit être supérieure à 0', 'warning')
      return
    }

    if (!selectedTank.oilType) {
      addToast('Cette citerne n\'a pas de type d\'huile défini', 'danger')
      return
    }

    if (selectedTank.currentAmount + addOilAmount > selectedTank.capacity) {
      addToast(`Capacité insuffisante. Espace disponible: ${(selectedTank.capacity - selectedTank.currentAmount).toFixed(2)} kg`, 'warning')
      return
    }

    setTanks(tanks.map(t => 
      t.id === selectedTank.id 
        ? { ...t, currentAmount: t.currentAmount + addOilAmount }
        : t
    ))
    
    addToast(`${addOilAmount} kg d'huile ${getOilTypeLabel(selectedTank.oilType)} ajoutés à "${selectedTank.name}"`, 'success')
    setAddOilAmount(100)
    setShowAddOilModal(false)
    setSelectedTank(null)
  }

  const transferOil = () => {
    const fromTank = tanks.find(t => t.id === transferData.fromTankId)
    const toTank = tanks.find(t => t.id === transferData.toTankId)

    if (!fromTank || !toTank) {
      addToast('Citerne source ou destination invalide', 'danger')
      return
    }

    if (transferData.amount <= 0) {
      addToast('La quantité doit être supérieure à 0', 'warning')
      return
    }

    if (fromTank.currentAmount < transferData.amount) {
      addToast(`Quantité insuffisante dans "${fromTank.name}". Disponible: ${fromTank.currentAmount.toFixed(2)} kg`, 'warning')
      return
    }

    if (toTank.oilType && toTank.oilType !== fromTank.oilType) {
      addToast(`Transfert impossible: "${toTank.name}" contient déjà de l'huile ${getOilTypeLabel(toTank.oilType)}. Les types doivent être identiques.`, 'danger')
      return
    }

    if (toTank.currentAmount + transferData.amount > toTank.capacity) {
      addToast(`Capacité insuffisante dans "${toTank.name}". Espace disponible: ${(toTank.capacity - toTank.currentAmount).toFixed(2)} kg`, 'warning')
      return
    }

    setTanks(tanks.map(t => {
      if (t.id === transferData.fromTankId) {
        return { ...t, currentAmount: t.currentAmount - transferData.amount }
      }
      if (t.id === transferData.toTankId) {
        return { ...t, currentAmount: t.currentAmount + transferData.amount, oilType: t.oilType || fromTank.oilType }
      }
      return t
    }))

    addToast(`${transferData.amount} kg d'huile ${getOilTypeLabel(fromTank.oilType)} transférés de "${fromTank.name}" vers "${toTank.name}"`, 'success')
    setShowTransferModal(false)
    setTransferData({ fromTankId: '', toTankId: '', amount: 0 })
  }

  const filteredByUi = useMemo(() => {
    const src = Array.isArray(data) ? data : []

    const from = dateFrom && dateFrom.length >= 10 ? dateFrom.slice(0, 10) : ''
    const to = dateTo && dateTo.length >= 10 ? dateTo.slice(0, 10) : ''
    const minDate = from && to && from > to ? to : from
    const maxDate = from && to && from > to ? from : to

    return src.filter((row) => {
      const huile = n2(row.quantiteHuile)

      if (typeFilter === 'olive' && !(huile === 0)) return false
      if (typeFilter === 'olive_huile' && !(huile > 0)) return false

      if (huileRange !== 'All') {
        if (!matchHuileRange(huile, huileRange)) return false
      }

      if (minDate || maxDate) {
        const dc = datePart(row.dateCreation)
        if (!dc) return false
        if (minDate && dc < minDate) return false
        if (maxDate && dc > maxDate) return false
      }

      return true
    })
  }, [data, typeFilter, huileRange, dateFrom, dateTo])

  const columns = useMemo(
    () => [
      {
        id: 'select',
        maxSize: 45,
        size: 45,
        header: ({ table }: { table: any }) => (
          <input
            type="checkbox"
            className="form-check-input form-check-input-light fs-14"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }: { row: any }) => (
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
        cell: ({ row }) => <span className="fw-semibold">{row.original.nomPrenom}</span>,
      }),
      columnHelper.accessor('nombreCaisses', {
        header: 'Nombre de caisses',
        cell: ({ row }) => <span>{n2(row.original.nombreCaisses).toFixed(0)}</span>,
      }),
      columnHelper.accessor('quantiteOliveNet', {
        header: 'Quantité Olive net (kg)',
        cell: ({ row }) => <span>{n2(row.original.quantiteOliveNet).toFixed(2)}</span>,
      }),
      columnHelper.accessor('quantiteHuile', {
        header: 'Quantité Huile (kg)',
        cell: ({ row }) => <span>{n2(row.original.quantiteHuile).toFixed(2)}</span>,
      }),
      columnHelper.accessor('dateCreation', {
        header: 'Date création',
        cell: ({ row }) => <span>{new Date(row.original.dateCreation).toLocaleDateString('fr-FR')}</span>,
      }),
      {
        header: 'Actions',
        cell: ({ row }: { row: any }) => (
          <div className="d-flex gap-1">
            <Button variant="default" size="sm" className="btn-icon" onClick={() => handleViewDetails(row.original)}>
              <TbEye className="fs-lg" />
            </Button>
            <Button variant="default" size="sm" className="btn-icon" onClick={() => handleEdit(row.original)}>
              <TbEdit className="fs-lg" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="btn-icon"
              onClick={() => {
                toggleDeleteModal()
                setSelectedRowIds((prev) => ({ ...prev, [row.id]: true }))
              }}>
              <TbTrash className="fs-lg" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: filteredByUi,
    columns,
    state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
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
  const selectedCount = Object.keys(selectedRowIds).length

  const handleViewDetails = (rowData: CustomerType) => {
    setSelectedRow(rowData)
    setShowViewModal(true)
  }

  const handleEdit = (rowData: CustomerType) => {
    setSelectedRow(rowData)
    setShowEditModal(true)
  }

  const totals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows
    const len = rows.length
    const oliveNet = rows.reduce((sum, r) => sum + n2(r.original.quantiteOliveNet), 0)
    const huile = rows.reduce((sum, r) => sum + n2(r.original.quantiteHuile), 0)
    return { oliveNet, huile, len }
  }, [table, globalFilter, sorting, pagination, filteredByUi])

  const handleSaveEdit = async (updatedData: CustomerType) => {
    try {
      const response = await fetch(`http://localhost:8170/proprietaires/${updatedData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      if (!response.ok) throw new Error('Failed to update proprietaire')
      await fetchProprietaires()
      setShowEditModal(false)
      addToast('Propriétaire mis à jour avec succès', 'success')
    } catch (err) {
      console.error('Error updating proprietaire:', err)
      addToast('Erreur lors de la mise à jour', 'danger')
    }
  }

  const handleDelete = async () => {
    try {
      const selectedRows = table.getSelectedRowModel().rows
      const deletePromises = selectedRows.map((r) => fetch(`http://localhost:8170/proprietaires/${r.original._id}`, { method: 'DELETE' }))
      await Promise.all(deletePromises)

      await fetchProprietaires()
      setSelectedRowIds({})
      setPagination((p) => ({ ...p, pageIndex: 0 }))
      setShowDeleteModal(false)
      addToast(`${selectedRows.length} propriétaire(s) supprimé(s) avec succès`, 'success')
    } catch (err) {
      console.error('Error deleting proprietaires:', err)
      addToast('Erreur lors de la suppression', 'danger')
    }
  }

  const Exportpdf = () => {
    const rawDataToExport = table.getFilteredRowModel().rows.map((row) => row.original)
    exportToPDF(rawDataToExport)
    addToast('Export PDF lancé', 'info')
  }

  const resetFilters = () => {
    setGlobalFilter('')
    setTypeFilter('All')
    setHuileRange('All')
    setDateFrom('')
    setDateTo('')
    setSorting([])
    setSelectedRowIds({})
    setPagination((p) => ({ ...p, pageIndex: 0 }))
    addToast('Filtres réinitialisés', 'info')
  }

  return (
    <Container fluid>
      <PageBreadcrumb title={'Stock Ma3sra'} subtitle={'Stock propriétaire (Olive / Huile)'} />

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            bg={toast.type} 
            autohide 
            delay={5000}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            <Toast.Header closeButton>
              <strong className="me-auto">
                {toast.type === 'success' && '✓ Succès'}
                {toast.type === 'danger' && '✗ Erreur'}
                {toast.type === 'warning' && '⚠ Attention'}
                {toast.type === 'info' && 'ℹ Information'}
              </strong>
            </Toast.Header>
            <Toast.Body className="text-white">{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Tank Management Section */}
      <Row className="mb-4">
        <Col xs={12}>
          <div className="card">
            <div className="card-header border-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <TbTank className="me-2" />
                Gestion des Citernes d'Huile
              </h5>
              <div>
                <Button variant="primary" size="sm" onClick={() => setShowTransferModal(true)} className="me-2">
                  <TbTransfer className="me-1" /> Transférer
                </Button>
                <Button variant="success" size="sm" onClick={() => setShowTankModal(true)}>
                  <TbPlus className="me-1" /> Ajouter Citerne
                </Button>
              </div>
            </div>
            <div className="card-body">
              <Row>
                {tanks.map((tank) => {
                  const tankColor = getTankColorByFillLevel(tank.fillPercentage)
                  const liquidColor = getLiquidColorByFillLevel(tank.fillPercentage)
                  const statusMessage = getStatusMessage(tank.fillPercentage)
                  
                  return (
                    <Col key={tank.id} md={6} lg={4} xl={3} className="mb-4">
                      <div className="tank-container" style={tankStyles.container}>
                        <div 
                          className="cylinder" 
                          style={{
                            ...tankStyles.cylinder,
                            background: tankColor,
                            border: `3px solid ${tankColor}`,
                          }}
                        >
                          <div 
                            className="liquid"
                            style={{
                              height: `${tank.fillPercentage}%`,
                              background: liquidColor,
                            }}
                          />
                          {tank.fillPercentage > 0 && tank.fillPercentage < 100 && (
                            <div 
                              className="wave"
                              style={{
                                top: `${100 - tank.fillPercentage}%`,
                                left: 0,
                                right: 0,
                              }}
                            />
                          )}
                          {tank.oilType && tank.fillPercentage < 100 && (
                            <>
                              <div className="oil-drop" style={{ ...tankStyles.oilDrop, right: '10px', animationDelay: '0s' }} />
                              <div className="oil-drop" style={{ ...tankStyles.oilDrop, right: '25px', animationDelay: '0.5s' }} />
                            </>
                          )}
                          <div style={tankStyles.tankTop} />
                        </div>
                        
                        <div className="mt-3 text-center">
                          <h6 className="mb-1">{tank.name}</h6>
                          <Badge bg={getOilTypeColor(tank.oilType)} className="mb-2">
                            {getOilTypeLabel(tank.oilType)}
                          </Badge>
                          <div className="d-flex justify-content-between mb-2">
                            <small className="text-muted">{tank.currentAmount.toFixed(0)} kg</small>
                            <small className="text-muted">/ {tank.capacity.toFixed(0)} kg</small>
                          </div>
                          <ProgressBar 
                            variant={tank.fillPercentage >= 80 ? 'danger' : tank.fillPercentage >= 50 ? 'warning' : 'success'}
                            now={tank.fillPercentage}
                            animated={tank.fillPercentage > 0 && tank.fillPercentage < 100}
                            className="mb-2"
                            style={{ height: '8px' }}
                          />
                          <small className={`text-${
                            tank.fillPercentage >= 80 ? 'danger' : 
                            tank.fillPercentage >= 50 ? 'warning' : 
                            tank.fillPercentage > 0 ? 'success' : 'secondary'
                          } d-block mb-2`}>
                            {statusMessage}
                          </small>
                          <div className="d-flex gap-2 mt-2">
                            {tank.fillPercentage < 100 && tank.oilType && (
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="flex-grow-1"
                                onClick={() => {
                                  setSelectedTank(tank)
                                  setShowAddOilModal(true)
                                }}
                              >
                                <TbDroplet className="me-1" /> Ajouter
                              </Button>
                            )}
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => deleteTank(tank.id)}
                            >
                              <TbTrash />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Col>
                  )
                })}
              </Row>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={12}>
          <div className="card">
            <div className="card-header border-light">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div className="app-search">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Rechercher propriétaire..."
                      value={globalFilter ?? ''}
                      onChange={(e) => {
                        setGlobalFilter(e.target.value)
                        setPagination((p) => ({ ...p, pageIndex: 0 }))
                      }}
                    />
                    <LuSearch className="app-search-icon text-muted" />
                  </div>

                  <Button variant="primary" onClick={toggleDealModal}>
                    <TbPlus className="me-1" /> Nouveau
                  </Button>

                  <Button variant="outline-secondary" onClick={fetchProprietaires} disabled={loading}>
                    <TbRefresh className="me-1" /> Actualiser
                  </Button>

                  <Button variant="outline-primary" onClick={Exportpdf} disabled={loading || totalItems === 0}>
                    <TbDownload className="me-1" /> Export PDF
                  </Button>

                  {selectedCount > 0 && (
                    <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                      <TbTrash className="me-1" /> Supprimer ({selectedCount})
                    </Button>
                  )}
                </div>

                <div className="d-flex align-items-end gap-2 flex-nowrap overflow-auto">
                  <span className="fw-semibold mb-2 flex-shrink-0">Filtres:</span>
                  <select
                    className="form-select"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as StockType)
                      setPagination((p) => ({ ...p, pageIndex: 0 }))
                    }}
                    style={{ minWidth: 260 }}>
                    <option value="All">Tous</option>
                    <option value="olive">Olive seulement</option>
                    <option value="olive_huile">Olive + Huile</option>
                  </select>
                  <div className="flex-shrink-0">
                    <div className="text-muted small">Du</div>
                    <input
                      type="date"
                      className="form-control"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value)
                        setPagination((p) => ({ ...p, pageIndex: 0 }))
                      }}
                      style={{ minWidth: 170 }}
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-muted small">Au</div>
                    <input
                      type="date"
                      className="form-control"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value)
                        setPagination((p) => ({ ...p, pageIndex: 0 }))
                      }}
                      style={{ minWidth: 170 }}
                    />
                  </div>
                  <Button variant="outline-secondary" onClick={resetFilters} disabled={loading} className="flex-shrink-0">
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              <Alert variant="info" className="py-2">
                <Row className="text-center g-2 align-items-center">
                  <Col md={4} sm={6}>
                    <div className="fw-semibold">Olive Net</div>
                    <div className="fs-5">{totals.oliveNet.toFixed(2)} kg</div>
                    <div className="small text-muted">Lignes: {totals.len}</div>
                  </Col>
                  <Col md={4} sm={6}>
                    <div className="fw-semibold">Huile</div>
                    <div className="fs-5 text-success">{totals.huile.toFixed(2)} kg</div>
                    <div className="small text-muted">Range: {huileRange}</div>
                  </Col>
                  <Col md={4} sm={12}>
                    <div className="fw-semibold">Filtre type</div>
                    <div className="fs-6">{typeFilter === 'All' ? 'Tous' : typeFilter === 'olive' ? 'Olive seulement' : 'Olive + Huile'}</div>
                    <div className="small text-muted">{dateFrom || dateTo ? `Date: ${dateFrom || '…'} → ${dateTo || '…'}` : 'Date: toutes'}</div>
                  </Col>
                </Row>
              </Alert>
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                </div>
              ) : (
                <DataTable<TableCustomerType> table={table} emptyMessage="Aucun propriétaire trouvé" loading={loading} />
              )}
            </div>

            {!loading && table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">Nombre de lignes à afficher:</span>
                    <select
                      className="form-select"
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => {
                        table.setPageSize(Number(e.target.value))
                        setPagination((p) => ({ ...p, pageIndex: 0 }))
                      }}
                      style={{ width: 110 }}>
                      {[5, 8, 10, 15, 20].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
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
                </div>
              </CardFooter>
            )}

            {/* Modals */}
            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={toggleDeleteModal}
              onConfirm={handleDelete}
              selectedCount={selectedCount}
              itemName="propriétaire"
            />
            <CreateDealModal show={showDealModal} toggleModal={toggleDealModal} onProprietaireCreated={fetchProprietaires} />
            <ViewDetailModal show={showViewModal} toggleModal={() => setShowViewModal(false)} data={selectedRow} />
            <EditModal show={showEditModal} toggleModal={() => setShowEditModal(false)} data={selectedRow} onSave={handleSaveEdit} />
          </div>
        </Col>
      </Row>

      {/* Add Tank Modal */}
      <Modal show={showTankModal} onHide={() => setShowTankModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <TbTank className="me-2" />
            Ajouter une nouvelle citerne
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom de la citerne</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: Citerne Nord"
                value={newTankName}
                onChange={(e) => setNewTankName(e.target.value)}
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Capacité (kg)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Capacité en kilogrammes"
                value={newTankCapacity}
                onChange={(e) => setNewTankCapacity(Number(e.target.value))}
                min={1}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type d'huile</Form.Label>
              <Form.Select
                value={newTankOilType}
                onChange={(e) => setNewTankOilType(e.target.value as OilType)}
              >
                <option value="bio">Bio</option>
                <option value="extra">Extra</option>
                <option value="normal">Normal</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Cette citerne sera dédiée exclusivement à ce type d'huile
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTankModal(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={addTank}>
            Créer la citerne
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Oil Modal */}
      <Modal show={showAddOilModal} onHide={() => setShowAddOilModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <TbDroplet className="me-2" />
            Ajouter de l'huile - {selectedTank?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTank && (
            <Form>
              <Alert variant="info">
                <strong>Type d'huile:</strong> {getOilTypeLabel(selectedTank.oilType)}
                <br />
                <strong>Capacité disponible:</strong> {(selectedTank.capacity - selectedTank.currentAmount).toFixed(2)} kg
                <br />
                <strong>Niveau actuel:</strong> {getStatusMessage(selectedTank.fillPercentage)}
              </Alert>
              <Form.Group>
                <Form.Label>Quantité à ajouter (kg)</Form.Label>
                <Form.Control
                  type="number"
                  value={addOilAmount}
                  onChange={(e) => setAddOilAmount(Number(e.target.value))}
                  min={1}
                  max={selectedTank.capacity - selectedTank.currentAmount}
                  step={10}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddOilModal(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={addOilToTank}>
            Ajouter
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Transfer Oil Modal */}
      <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <TbTransfer className="me-2" />
            Transférer de l'huile entre citernes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Alert variant="info">
              <strong>⚠ Important:</strong> Le transfert n'est possible qu'entre citernes contenant le même type d'huile.
              Les types d'huile doivent être identiques.
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Citerne source</Form.Label>
              <Form.Select
                value={transferData.fromTankId}
                onChange={(e) => setTransferData({ ...transferData, fromTankId: e.target.value, toTankId: '' })}
              >
                <option value="">Sélectionner une citerne</option>
                {tanks.filter(t => t.currentAmount > 0 && t.oilType).map(tank => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name} - {tank.currentAmount.toFixed(0)} kg - {getOilTypeLabel(tank.oilType)} - {getStatusMessage(tank.fillPercentage)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            {transferData.fromTankId && (
              <Form.Group className="mb-3">
                <Form.Label>Citerne destination</Form.Label>
                <Form.Select
                  value={transferData.toTankId}
                  onChange={(e) => setTransferData({ ...transferData, toTankId: e.target.value })}
                >
                  <option value="">Sélectionner une citerne</option>
                  {tanks
                    .filter(t => {
                      const sourceTank = tanks.find(st => st.id === transferData.fromTankId)
                      return t.id !== transferData.fromTankId && 
                             (!t.oilType || (sourceTank && t.oilType === sourceTank.oilType))
                    })
                    .map(tank => {
                      const sourceTank = tanks.find(st => st.id === transferData.fromTankId)
                      const isCompatible = !tank.oilType || (sourceTank && tank.oilType === sourceTank.oilType)
                      return (
                        <option key={tank.id} value={tank.id} disabled={!isCompatible}>
                          {tank.name} - {tank.currentAmount.toFixed(0)}/{tank.capacity.toFixed(0)} kg - {getOilTypeLabel(tank.oilType)} - {getStatusMessage(tank.fillPercentage)}
                          {!isCompatible && ' (Type incompatible)'}
                        </option>
                      )
                    })}
                </Form.Select>
                {transferData.toTankId && (() => {
                  const toTank = tanks.find(t => t.id === transferData.toTankId)
                  const fromTank = tanks.find(t => t.id === transferData.fromTankId)
                  if (toTank && fromTank && toTank.oilType && toTank.oilType !== fromTank.oilType) {
                    return (
                      <Form.Text className="text-danger">
                        ⚠ Attention: Cette citerne contient déjà de l'huile {getOilTypeLabel(toTank.oilType)}. 
                        Le transfert n'est pas possible car les types sont différents.
                      </Form.Text>
                    )
                  }
                  return null
                })()}
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Quantité à transférer (kg)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Quantité en kg"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                min={1}
                max={tanks.find(t => t.id === transferData.fromTankId)?.currentAmount || 0}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTransferModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={transferOil}
            disabled={!transferData.fromTankId || !transferData.toTankId || transferData.amount <= 0}
          >
            Transférer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default Qteclient