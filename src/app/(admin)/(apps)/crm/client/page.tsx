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
import { Badge, Button, Card, CardFooter, CardHeader, Col, Container, Row, Dropdown } from 'react-bootstrap'
import { LuGlobe, LuSearch } from 'react-icons/lu'
import { CgUnavailable } from 'react-icons/cg'
import { TbEdit, TbEye, TbPlus, TbTrash, TbPrinter, TbCash, TbFileExport } from 'react-icons/tb'
// NOTE: jsPDF is no longer needed for thermal print text
// import jsPDF from 'jspdf' 
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'

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

const columnHelper = createColumnHelper<CustomerType>()

// helper date format dd-mm-yyyy
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatDateDDMMYYYY = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

// Les constantes pour le ticket PDF (not used anymore)
// const TICKET_WIDTH = 80 // mm
// const MARGIN = 6 // mm

/**
 * Generates the raw text content for a thermal printer ticket.
 * This is a minimal, plain text representation for fast printing.
 */
const generateThermalTicketContent = (customer: CustomerType): string => {
  const now = new Date()
  const ticketId = customer._id ?? 'TEMP_ID'
const now1 = customer.dateCreation
  const line = '--------------------------------' // 32 حرفًا لعرض 80 ملم
  const separator = '********************************'
  const tel = '+216 9X XXX XXX' // رقم هاتف مؤقت

  const content: string[] = []

  // --- الرأس ---

  content.push('      معصرة - بوشامة         ')
  content.push(line)
  content.push(`الرقم: ${ticketId.slice(-8).padEnd(14)}   السحب تاريخ:  ${formatDateDDMMYYYY(now.toISOString())}`)
  content.push(` التاريخ: ${formatDateDDMMYYYY(now1.toString())}`)
  content.push(`الوقت: ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)
  content.push(line)

  // --- معلومات الزبون ---
  content.push('   :معلومات الزبون          ')

  content.push(`الاسم واللقب : ${customer.nomPrenom}`)
  content.push(`الهاتف: ${customer.numTelephone ?? '-'}`)
  content.push(line)

  // --- تفاصيل المعالجة ---
  content.push('   تفاصيل المعالجة        ')
  content.push(line)
  content.push(`الزيتون الصافي (كلغ): ${customer.quantiteOliveNet?.toFixed(2) ?? '-'}`)
  content.push(`الزيت المستخرج (كلغ): ${customer.quantiteHuile ?? '-'}`)


  // --- ملخص الدفع (إذا كان مطبقًا) ---
  if (customer.prixFinal && customer.prixKg) {
    content.push('      ملخص الدفع             ')
    content.push(separator)
    content.push(`المبلغ الإجمالي (د.ت): ${customer.prixFinal.toFixed(2)}`)
    content.push(separator)
 
  }

  // --- خط القص ---
  content.push('')
  content.push('- - - - - - - - إيصال الزبون - - - - - - - -')
  content.push('')

  // --- إيصال الزبون ---


  content.push(`الزبون: ${customer.nomPrenom}`)
  content.push(`التاريخ: ${formatDateDDMMYYYY(now.toISOString())}`)
  content.push(line)
  content.push('   :ملحص المردودية             ')

  content.push(`الزيتون الصافي (كلغ): ${customer.quantiteOliveNet?.toFixed(2) ?? '-'}`)
  content.push(`الزيت المستخرج (كلغ): ${customer.quantiteHuile ?? '-'}`)
 

  // --- المبلغ الواجب تسديده (إذا كان مطبقًا) ---
  if (customer.prixFinal) {
    content.push(separator)
    content.push(`الصافي الإجمالي (د.ت): ${customer.prixFinal.toFixed(2)}`)
    content.push(separator)
  }

  // --- التذييل ---
  content.push('')
  content.push(' هذا الإيصال هو دليل السحب الخاص بك')

  content.push('') // إضافة أسطر إضافية لقص الورق (قد تتطلب أوامر خاصة بالطابعة)

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

  // fetch clients
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('http://192.168.1.15:8170/clients')
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

      if (customer.status !== 'payé') {
        const body = {
          motif: `Payment Client`,
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

      // Recharger les données
      fetchClients()

      // Message de confirmation
      alert(`Statut mis à jour : ${newStatus}`)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du changement de statut')
    }
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


  const today = new Date()
  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    )
  }

  const clientsToday = data.filter((c) => isToday(c.dateCreation))
  const clientsPayes = clientsToday.filter((c) => c.status === 'payé').length
  const clientsNonPayes = clientsToday.filter((c) => c.status !== 'payé').length
  const totalClientsToday = clientsToday.length
  console.log("clientsToday,,clientsPayes,,clientsNonPayes,,totalClientsToday",clientsToday,clientsPayes,clientsNonPayes,totalClientsToday)
  // =========================================================================
  // CORRIGÉ: Fonction pour imprimer un ticket texte pour imprimante thermique
  // =========================================================================
  const handlePrintTicket = (customer: CustomerType) => {
    const ticketContent = generateThermalTicketContent(customer)

    // Créer une fenêtre ou un iframe temporaire pour imprimer le contenu texte
    const printWindow = window.open('', '', 'height=400,width=600')

    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression. Veuillez vérifier les bloqueurs de pop-up.")
      return
    }

    // Le style est crucial pour l'impression thermique afin d'assurer
    // que la mise en page à largeur fixe (monospace) est respectée.
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Ma3sra</title>
          <style>
            @page {
              size: 80mm auto; /* Spécifie une largeur de 80mm */
              margin: 0;
            }
            body {
              font-family: 'Consolas', 'Courier New', monospace; /* Police monospace pour alignement fixe */
              font-size: 9pt; /* Taille de police petite typique des tickets */
              line-height: 1.2;
              margin: 5mm; /* Petite marge sur le papier */
            }
            pre {
                margin: 0;
                padding: 0;
                white-space: pre-wrap; /* Permet le retour à la ligne si la ligne est trop longue */
                word-wrap: break-word; /* Force le mot à se couper si nécessaire */
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
  // =========================================================================
  // FIN CORRECTION
  // =========================================================================

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
      cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> 
    }),
    columnHelper.accessor('nombreCaisses', { 
      header: 'nombreCaisses', 
      cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> 
    }),
    columnHelper.accessor('quantiteOliveNet', { 
      header: 'quantiteOliveNet', 
      cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> 
    }),
    columnHelper.accessor('quantiteHuile', { 
      header: 'quantiteHuile', 
      cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> 
    }),
    columnHelper.accessor('kattou3', {
      header: 'kattou3',
      cell: (info) => (
        <Badge bg="warning">
          {info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}
        </Badge>
      ),
    }),
    columnHelper.accessor('nisbaReelle', {
      header: 'nisba %',
      cell: (info) => (
        <Badge bg="success">
          {info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}
        </Badge>
      ),
    }),
    columnHelper.accessor('prixFinal', {
      header: 'prix Dinar',
      cell: (info) => (
        <Badge bg="secondary">
          {info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}
        </Badge>
      ),
    }),
    columnHelper.accessor('numTelephone', { header: 'Téléphone' }),
    columnHelper.accessor('dateCreation', { 
      header: 'Date de création', 
      cell: (info) => formatDateDDMMYYYY(info.getValue() as string) 
    }),
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
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModalDetail(true)
              setSelectedCustomer(row.original)
            }}>
            <TbEye className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowModalEdit(true)
              setSelectedCustomer(row.original)
            }}>
            <TbEdit className="fs-lg" />
          </Button>

          {/* Bouton compact avec statut */}
          <Button
            variant={row.original.status === 'payé' ? 'success' : 'danger'}
            size="sm"
            onClick={() => handleTogglePaymentStatus(row.original)}
            title={`Statut: ${row.original.status}. Cliquer pour changer`}
            className="position-relative">
            <TbCash className="fs-lg" />
            <span
              className={`position-absolute top-0 start-100 translate-middle p-1 border border-light rounded-circle ${
                row.original.status === 'payé' ? 'bg-success' : 'bg-danger'
              }`}>
              <span className="visually-hidden">Statut</span>
            </span>
          </Button>

          <Button variant="default" size="sm" onClick={() => handlePrintTicket(row.original)}>
            <TbPrinter className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowDeleteModal(true)
              setSelectedRowIds({ [row.id]: true })
            }}>
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
console.log("data",data)
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

  // Utiliser selectedRows APRÈS l'initialisation de table
  const selectedRows = table.getSelectedRowModel().rows

  return (
    <Container fluid>
      <PageBreadcrumb title="Clients" subtitle="CRM" />
      
      <Row className="g-3">
        <Col xl={3} md={6}>
          <Card className="h-100 text-center">
            <CardHeader className="border-light">
              <h6>Clients payés / total (Aujourd'hui)</h6>
              <h4 className="mb-0 text-success">
                {clientsPayes} / {totalClientsToday}
              </h4>
            </CardHeader>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card className="h-100 text-center">
            <CardHeader className="border-light">
              <h6>Clients non payés / total (Aujourd'hui)</h6>
              <h4 className="mb-0 text-danger">
                {clientsNonPayes} / {totalClientsToday}
              </h4>
            </CardHeader>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex gap-2 align-items-center">
                <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  <TbPlus className="fs-lg" /> Ajouter un client
                </Button>
                <CustomerModal show={showModal} onHide={() => setShowModal(false)} onClientSaved={handleClientSaved} />
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
                        // Ajout pour éviter les problèmes d'hydratation
                        defaultDate: selectedDates,
                        static: true
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

      <CustomerModalViewDetail 
        show={showModalDetail} 
        onHide={() => setShowModalDetail(false)} 
        customer={selectedCustomer} 
      />
      <CustomerEditModal 
        show={showModalEdit} 
        onHide={() => setShowModalEdit(false)} 
        customer={selectedCustomer} 
        onClientSaved={handleClientSaved} 
      />
    </Container>
  )
}

export default CustomersCard