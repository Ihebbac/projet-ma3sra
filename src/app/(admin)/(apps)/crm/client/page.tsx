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
import { Badge, Button, Card, CardFooter, CardHeader, Col, Container, Row, Dropdown, CardBody } from 'react-bootstrap'
import { LuGlobe, LuSearch } from 'react-icons/lu'
import { CgUnavailable } from 'react-icons/cg'
import { TbEdit, TbEye, TbPlus, TbTrash, TbPrinter, TbCash, TbFileExport, TbChartBar } from 'react-icons/tb'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'
import logo from '@/assets/images/logo.jpg'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import CustomerModal from './components/CustomerModal'
import CustomerModalViewDetail from '../client/components/CustomerModalViewDetail'
import CustomerEditModal from '../client/components/CustomerEditModal'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { exportToPDF, exportToXLSX } from './components/TableExporter'

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
  quantiteOliveNet?: number
  nisbaReelle?: number
  quantiteHuileTheorique?: number
  differenceHuile?: number
  nombreWiba?: number
  nombreQfza?: number
  huileParQfza?: number
  prixFinal?: number
  prixKg?: number
  status: 'payé' | 'non payé'
}

// Nouveau type pour les statistiques
type DailyStatsType = {
  date: string
  totalQuantiteHuile: number
  totalQuantiteOlive: number
  totalPrixFinal: number
  clientCount: number
  clientsPayes: number
  clientsNonPayes: number
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

const formatDateDDMMYYYY1 = (dateString: string): string => {
  try {
    const d = new Date(dateString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (error) {
    return 'DD/MM/YYYY'
  }
}

const LINE_LENGTH = 32
const LINE = '-'.repeat(LINE_LENGTH)
const SEPARATOR = '*'.repeat(LINE_LENGTH)
const TEL = '+216 9X XXX XXX'
const LOGO_PLACEHOLDER = '     🌿 معصرة - بوشامة 🌿      '

const generateThermalTicketContent = (customer: CustomerType): string => {
  const ticketId = customer._id ?? 'TEMP_ID'
  const creationDate = customer.dateCreation
  const content: string[] = []
  const W = 32

  const LINE = '-'.repeat(W)
  const SEP = '*'.repeat(W)

  // Helper corrigé pour centrer (compte les caractères unicode correctement)
  const center = (text: string): string => {
    const len = [...text].length // Utilise spread pour compter correctement
    const padding = Math.max(0, Math.floor((W - len) / 2))
    return ' '.repeat(padding) + text
  }

  // Ligne bilingue optimisée
  const bi = (fr: string, ar: string): string => {
    const frLen = [...fr].length
    const arLen = [...ar].length
    const total = frLen + arLen
    if (total >= W) return fr.slice(0, W)
    return fr + ' '.repeat(W - total) + ar
  }

  // Données
  const date = formatDateDDMMYYYY1(creationDate)
  const time = new Date(creationDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const num = `#${ticketId.slice(-6)}`
  const olive = customer.quantiteOliveNet?.toFixed(2) ?? '-'
  const huile = customer.quantiteHuile?.toFixed(2) ?? '-'
  const nom = customer.nomPrenom.slice(0, W)
  const tel = customer.numTelephone ?? '-'

  // === TICKET PRINCIPAL ===
  content.push(center(LOGO_PLACEHOLDER))
  content.push(LINE)
  content.push(`${num} ${date} ${time}`)
  content.push(bi('Client', 'الحريف'))
  content.push(center(nom))
  content.push(bi('Téléphone', 'الهاتف'))
  content.push(center(String(tel)))
  content.push(LINE)
  content.push(bi(`Olive`, 'زيتون'))
  content.push(center(String (`${olive}kg`)))
  content.push(bi(`Huile`, 'زيت'))
  content.push(center(String (`${huile}kg`)))
  

  // Montant
  if (customer.prixFinal && customer.prixKg) {
    content.push(SEP)
    content.push(bi('Montant total','المبلغ الجملي'))
    content.push(center(`💵💵${customer.prixFinal.toFixed(2)}💵💵 TND`))
    content.push(SEP)
  } else {
    content.push(center("---------"))
    content.push(LINE)
  }

  
  content.push(center('سعداء بخدمتكم'))
  content.push(center('52 417 792-52 112 478'))
  content.push(LINE)

  // === COPIE CAISSE ===
  content.push(center('✂ CAISSE / صندوق ✂'))
  content.push(`${num} ${date}`)
  content.push(center(nom))
  content.push(center(`Olive: ${olive} Kg`))
  content.push(center(`Olive: ${huile} Kg`))

  if (customer.prixFinal && customer.prixKg) {
  
    content.push(SEP)
    content.push(bi('Montant total','المبلغ الجملي'))
    content.push(center(`${customer.prixFinal.toFixed(2)} TND`))
    content.push(SEP)
  } else {
    content.push(center('GRATUIT'))
  }

  content.push('')
  return content.join('\n')
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
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false)
  const [dailyStats, setDailyStats] = useState<DailyStatsType | null>(null)
  const [showStats, setShowStats] = useState(false)


  // Fonction pour calculer les statistiques quotidiennes
  const calculateDailyStats = useCallback((customers: CustomerType[], dateFilter: Date[] = []) => {
    let clientsToCalculate = customers

    // Appliquer le filtre de date si sélectionné
    if (dateFilter.length > 0) {
      if (dateFilter.length === 1) {
        const d = dateFilter[0]
        clientsToCalculate = clientsToCalculate.filter((item) => {
          if (!item.dateCreation) return false
          const dt = new Date(item.dateCreation)
          return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate()
        })
      } else if (dateFilter.length === 2) {
        const start = dateFilter[0]
        const end = dateFilter[1]
        clientsToCalculate = clientsToCalculate.filter((item) => {
          if (!item.dateCreation) return false
          const dt = new Date(item.dateCreation)
          return dt >= start && dt <= end
        })
      }
    }

    const totalQuantiteHuile = clientsToCalculate.reduce((sum, client) => sum + (client.quantiteHuile || 0), 0)
    const totalQuantiteOlive = clientsToCalculate.reduce((sum, client) => sum + (client.quantiteOliveNet || 0), 0)
    const totalPrixFinal = clientsToCalculate.reduce((sum, client) => sum + (client.prixFinal || 0), 0)
    const clientCount = clientsToCalculate.length
    const clientsPayes = clientsToCalculate.filter((client) => client.status === 'payé').length
    const clientsNonPayes = clientCount - clientsPayes
    const totalPrixpayer = clientsToCalculate.reduce((sum, client) => {
      // S'assurer que sum est un nombre et que prixFinal existe
      const prixFinal = client.prixFinal ?? 0

      // N'ajouter le prix que si le statut est 'payé'
      if (client.status === 'payé') {
        return sum + prixFinal
      }

      // Retourner la somme actuelle si le statut n'est pas 'payé'
      return sum
    }, 0) // L'initialisation à 0 est crucialeconsole.log('clientsPayes',clientsPayes)
    const totalPrixnonpayer = clientsToCalculate.reduce((sum, client) => {
      // S'assurer que sum est un nombre et que prixFinal existe
      const prixFinal = client.prixFinal ?? 0

      // N'ajouter le prix que si le statut est 'payé'
      if (client.status != 'payé') {
        return sum + prixFinal
      }

      // Retourner la somme actuelle si le statut n'est pas 'payé'
      return sum
    }, 0) // L'initialisation à 0 est crucialeconsole.log('clientsPayes',clientsPayes)
    const dateLabel =
      dateFilter.length === 0
        ? "Aujourd'hui"
        : dateFilter.length === 1
          ? `Le ${formatDateDDMMYYYY(dateFilter[0].toISOString())}`
          : `Du ${formatDateDDMMYYYY(dateFilter[0].toISOString())} au ${formatDateDDMMYYYY(dateFilter[1].toISOString())}`

    return {
      date: dateLabel,
      totalQuantiteHuile,
      totalQuantiteOlive,
      totalPrixFinal,
      clientCount,
      clientsPayes,
      clientsNonPayes,
      totalPrixpayer,
      totalPrixnonpayer,
    }
  }, [])

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

      // Calculer les stats pour aujourd'hui par défaut
      const todayStats = calculateDailyStats(normalized, [])
      setDailyStats(todayStats)
    } catch (err) {
      console.error('Error fetching clients:', err)
      setData([])
      setFilteredData([])
      setDailyStats(null)
    }
  }, [calculateDailyStats])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  // Mettre à jour les stats quand les dates changent
  useEffect(() => {
    if (data.length > 0) {
      const stats = calculateDailyStats(data, selectedDates)
      setDailyStats(stats)
    }
  }, [selectedDates, data, calculateDailyStats])

  const handleClientSaved = async () => {
    await fetchClients()
    setPagination({ ...pagination, pageIndex: 0 })
  }

  const handleTogglePaymentStatus = async (customer: CustomerType) => {
    const newStatus = customer.status === 'payé' ? 'non payé' : 'payé'

    if (!confirm(`Voulez-vous vraiment marquer ce client comme "${newStatus}" ?`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:8170/clients/${customer._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut')
      }

      if (newStatus !== 'payé') {
        await fetch(`http://localhost:8170/caisse/removeByUniqueId/${customer._id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
      } else {
        const body = {
          motif: `Payment Client`,
          uniqueId: customer._id,
          montant: customer.prixFinal,
          type: 'credit',
          date: new Date().toISOString(),
          commentaire: `payment de Client : ${customer.nomPrenom} Telephone :${customer?.numTelephone ?? ''} - quantiteHuile : ${customer.quantiteHuile}
        quantiteOliveNet : ${customer.quantiteOliveNet} `,
        }

        await fetch('http://localhost:8170/caisse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      fetchClients()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du changement de statut')
    }
  }

  // Filtrage global et par date
  useEffect(() => {
    let result = [...data]

    if (globalFilter.trim() !== '') {
      const term = globalFilter.trim().toLowerCase()
      result = result.filter((item) => {
        const name = item.nomPrenom?.toLowerCase() ?? ''
        const _id = item._id ?? ''
        const phone = String(item.numTelephone ?? '')
        return name.includes(term) || _id.includes(term) || phone.includes(term)
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

  const handlePrintTicket = (customer: CustomerType) => {
    const ticketContent = generateThermalTicketContent(customer)

    const printWindow = window.open('', '', 'height=400,width=600')

    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression. Veuillez vérifier les bloqueurs de pop-up.")
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Ma3sra</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Consolas', 'Courier New', monospace;
              font-size: 9pt;
              line-height: 1.2;
              margin: 5mm;
            }
            pre {
                margin: 0;
                padding: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <pre>${ticketContent}</pre>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
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
  columnHelper.accessor('nomPrenom', {
    header: 'Nom & Prénom',
    cell: (info) => <h5 className="mb-0">{info.getValue()}</h5>,
  }),
  columnHelper.accessor('nombreCaisses', {
    header: 'nombreCaisses',
    cell: (info) => <h5 className="mb-0">{info.getValue()}</h5>,
  }),
  columnHelper.accessor('quantiteOliveNet', {
    header: 'quantiteOliveNet',
    cell: (info) => <h5 className="mb-0">{info.getValue()}</h5>,
  }),
  columnHelper.accessor('quantiteHuile', {
    header: 'quantiteHuile',
    cell: (info) => <h5 className="mb-0">{info.getValue()}</h5>,
  }),
  columnHelper.accessor('kattou3', {
    header: 'kattou3',
    cell: (info) => <Badge bg="warning">{info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}</Badge>,
  }),
  columnHelper.accessor('nisbaReelle', {
    header: 'nisba %',
    cell: (info) => <Badge bg="success">{info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}</Badge>,
  }),
  columnHelper.accessor('prixFinal', {
    header: 'prix Dinar',
    cell: (info) => <Badge bg="secondary">{info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}</Badge>,
  }),
  columnHelper.accessor('numTelephone', { header: 'Téléphone' }),
  columnHelper.accessor('dateCreation', {
    header: 'Date de création',
    cell: (info) => formatDateDDMMYYYY(info.getValue() as string),
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => (
      <span className={`badge ${info.getValue() === 'فلاح' ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'}`}>
        {info.getValue()}
      </span>
    ),
  }),
  // Nouvelle colonne pour le statut de paiement
  columnHelper.accessor('status', {
    header: 'Statut Paiement',
    cell: (info) => (
      <Badge bg={info.getValue() === 'payé' ? 'success' : 'danger'}>
        {info.getValue() === 'payé' ? 'Payé' : 'Non Payé'}
      </Badge>
    ),
  }),
  {
    header: 'Actions',
    cell: ({ row }: { row: TableRow<CustomerType> }) => {
      const customer = row.original;
      const isPaid = customer.status === 'payé';
      const hasPrinted = customer.aImprimer; // Supposons que vous avez un champ aImprimer dans CustomerType

      return (
        <div className="d-flex gap-1">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModalDetail(true)
              setSelectedCustomer(customer)
            }}>
            <TbEye className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModalEdit(true)
              setSelectedCustomer(customer)
            }}>
            <TbEdit className="fs-lg" />
          </Button>

          <Button
            variant={isPaid ? 'success' : 'danger'}
            size="sm"
            onClick={() => handleTogglePaymentStatus(customer)}
            title={`Statut: ${customer.status}. Cliquer pour changer`}
            className="position-relative">
            <TbCash className="fs-lg" />
            <span
              className={`position-absolute top-0 start-100 translate-middle p-1 border border-light rounded-circle ${
                isPaid ? 'bg-success' : 'bg-danger'
              }`}>
              <span className="visually-hidden">Statut</span>
            </span>
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            onClick={() => handlePrintTicket(customer)}
            disabled={!isPaid} // Désactivé si non payé
            title={!isPaid ? "Impossible d'imprimer - Client non payé" : "Imprimer le ticket"}
          >
            <TbPrinter className="fs-lg" />
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowDeleteModal(true)
              setSelectedRowIds({ [customer._id]: true })
            }}
            disabled={hasPrinted} // Désactivé si déjà imprimé
            title={hasPrinted ? "Impossible de supprimer - Déjà imprimé" : "Supprimer"}
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      );
    },
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
    globalFilterFn: 'includesString',
    enableRowSelection: true,
 
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = filteredData.length
  const start = pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    await Promise.all(selectedIds.map((id) => fetch(`http://localhost:8170/clients/${id}`, { method: 'DELETE' })))
    setSelectedRowIds({})
    setShowDeleteModal(false)
    setShowMultiDeleteModal(false)
    await fetchClients()
  }

  const handleMultiDelete = () => {
    const selectedCount = Object.keys(selectedRowIds).length
    if (selectedCount === 0) {
      alert('Veuillez sélectionner au moins un client à supprimer.')
      return
    }
    setShowMultiDeleteModal(true)
  }
  // const pageSize = table.getState().pagination.pageSize // Récupère la taille de page actuelle
  const setPageSize = table.setPageSize
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = Object.keys(selectedRowIds).length

  return (
    <Container fluid>
      <PageBreadcrumb title="Clients" />

      {/* Section Statistiques */}
      {showStats && dailyStats && (
        <Row className="mb-3">
          <Col xs={12}>
            <Card className="bg-light">
              <CardHeader className="border-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <TbChartBar className="me-2" />
                  Statistiques {dailyStats.date}
                </h5>
                <Button variant="outline-secondary" size="sm" onClick={() => setShowStats(false)}>
                  ×
                </Button>
              </CardHeader>
              <CardBody className="border-light">
                <Row className="text-center">
                  <Col xs>
                    <h6>Quantité Huile (kg)</h6>
                    <h4 className="mb-0 text-primary">{dailyStats.totalQuantiteHuile.toFixed(2)}</h4>
                  </Col>
                  <Col xs>
                    <h6>Quantité Olive Net (kg)</h6>
                    <h4 className="mb-0 text-success">{dailyStats.totalQuantiteOlive.toFixed(2)}</h4>
                  </Col>
                  <Col xs>
                    <h6>Total Paiements (DT)</h6>
                    <h4 className="mb-0 text-warning">{dailyStats.totalPrixFinal.toFixed(2)}</h4>
                  </Col>
                  <Col xs>
                    <h6>Total Clients</h6>
                    <h4 className="mb-0 text-info">
                      {dailyStats.clientsPayes} / {dailyStats.clientCount}
                    </h4>
                    <small className="text-muted">
                      (Payés: {dailyStats.clientsPayes}, Non payés: {dailyStats.clientsNonPayes})
                    </small>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="justify-content-md-center">
        <Col xs>
          <Card className="border-light">
            <h6>Clients payés / total (Aujourd'hui)</h6>
            <h4 className="mb-0 text-success">
              {dailyStats?.clientsPayes || 0} / {dailyStats?.clientCount || 0} = {dailyStats?.totalPrixpayer.toFixed(2)}DT
            </h4>
          </Card>
        </Col>

        <Col xs>
          <Card className="border-light">
            <h6>Clients non payés / total (Aujourd'hui)</h6>
            <h4 className="mb-0 text-danger">
              {dailyStats?.clientsNonPayes || 0} / {dailyStats?.clientCount || 0}= {dailyStats?.totalPrixnonpayer.toFixed(2)}DT
            </h4>
          </Card>
        </Col>

        <Col xs>
          <Card className="border-light">
            <h6>Quantité Huile (kg)</h6>
            <h4 className="mb-0 text-primary">{dailyStats?.totalQuantiteHuile.toFixed(2) || '0.00'} KG</h4>
          </Card>
        </Col>

        <Col xs>
          <Card className="border-light">
            <h6>Total Paiements (DT)</h6>
            <h4 className="mb-0 text-warning">{dailyStats?.totalPrixFinal.toFixed(2) || '0.00'} DT</h4>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex gap-2 align-items-center">
                <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  <TbPlus className="fs-lg" /> Ajouter
                </Button>
                <CustomerModal show={showModal} onHide={() => setShowModal(false)} onClientSaved={handleClientSaved} />

                {selectedCount > 0 && (
                  <Button variant="danger" onClick={handleMultiDelete}>
                    <TbTrash className="fs-lg" /> Supprimer ({selectedCount})
                  </Button>
                )}

                <Button variant="info" onClick={() => setShowStats(!showStats)}>
                  <TbChartBar className="fs-lg" /> Statistiques
                </Button>

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
              <Row>
                <Col>
                  <div className="app-search">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nom, Tél ..."
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                    <LuSearch className="app-search-icon text-muted" />
                  </div>
                </Col>
                <Col>
                  <div className="d-flex gap-2 align-items-center">
                    <span className="app-search">Filtrer:</span>
                    <Flatpickr
                      className="form-control"
                      options={{
                        mode: 'range',
                        dateFormat: 'Y-m-d',
                        defaultDate: selectedDates,
                        static: true,
                      }}
                      value={selectedDates}
                      onChange={(dates: Date[]) => setSelectedDates(dates)}
                    />
                    <Button variant="secondary" size="sm" onClick={() => setSelectedDates([])}>
                      <CgUnavailable />
                    </Button>
                  </div>
                </Col>
              </Row>
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
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
            </CardFooter>

            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={() => setShowDeleteModal(false)}
              onConfirm={handleDelete}
              selectedCount={Object.keys(selectedRowIds).length}
              itemName="clients"
            />

            <DeleteConfirmationModal
              show={showMultiDeleteModal}
              onHide={() => setShowMultiDeleteModal(false)}
              onConfirm={handleDelete}
              selectedCount={selectedCount}
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
