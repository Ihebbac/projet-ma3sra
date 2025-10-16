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
import { Badge, Button, Card, CardFooter, CardHeader, Col, Container, Row } from 'react-bootstrap'
import { LuGlobe, LuSearch } from 'react-icons/lu'
import { CgUnavailable } from 'react-icons/cg'

import { TbEdit, TbEye, TbPlus, TbTrash, TbPrinter, TbCash } from 'react-icons/tb'
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

  // print ticket PDF
  // Je suppose que ces types, fonctions utilitaires et constantes sont définis ailleurs
  // et les ai incluses ici comme des placeholders pour la complétude du code.
  type CustomerType = {
    _id?: string
    nomPrenom: string
    numCIN?: string | number
    numTelephone?: string | number
    nombreCaisses: number
    quantiteOlive: number
    quantiteHuile: number
    quantiteOliveNet?: number
    nisba?: number
    kattou3?: number
    prixKg?: number // Ajout si non inclus
    prixFinal?: number // Ajout si non inclus
  }

  // Placeholder: remplacez par votre implémentation réelle
  const formatDateDDMMYYYY = (isoDate: string) => {
    if (!isoDate) return '-'
    return new Date(isoDate).toLocaleDateString('fr-FR')
  }

  // Les constantes de vos formules pour plus de clarté sur le ticket
  const POIDS_CAISSE = 30
  const DENSITE_HUILE = 0.916

  // La taille du ticket est 80mm de large, la hauteur est ajustée automatiquement
  const TICKET_WIDTH = 80 // mm
  const MARGIN = 6 // mm
  const CONTENT_WIDTH = TICKET_WIDTH - 2 * MARGIN
  const COL_1_X = MARGIN
  const COL_2_X = TICKET_WIDTH / 2 + 5

  const handlePrintTicket = (customer: CustomerType) => {
    // Le format [80, 150] est pour un ticket long
    const doc = new jsPDF({ unit: 'mm', format: [TICKET_WIDTH, 170] })
    let y = MARGIN

    // --- Fonction pour imprimer une section de données ---
    const printDataSection = (
      title: string,
      data: { label: string; value: string | number }[],
      docY: number,
      options?: {
        highlightImportant?: boolean
        compact?: boolean
        showBorders?: boolean
      },
    ) => {
      const { highlightImportant = false, compact = false, showBorders = false } = options || {}

      const sectionMargin = MARGIN + 2
      const contentWidth = TICKET_WIDTH - sectionMargin * 2
      const lineHeight = compact ? 3.5 : 4
      const valueWidth = 40

      docY += 5

      // En-tête de section avec fond coloré
      if (showBorders) {
        doc.setFillColor(240, 248, 255) // Bleu très clair
        doc.rect(sectionMargin - 1, docY - 4, contentWidth + 2, 6, 'F')
      }

      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(30, 64, 124) // Bleu foncé
      doc.text(title, sectionMargin, docY)

      // Ligne de séparation stylisée
      docY += 2
      doc.setDrawColor(100, 149, 237) // Bleu moyen
      doc.setLineWidth(0.4)
      doc.line(sectionMargin, docY, TICKET_WIDTH - sectionMargin, docY)

      docY += 3

      // Contenu des données
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)

      data.forEach((item, index) => {
        const isImportant = highlightImportant && index === data.length - 1
        const label = `${item.label}:`
        const value = String(item.value ?? '-')

        // Style pour les éléments importants (dernier élément)
        if (isImportant) {
          doc.setFillColor(255, 250, 240) // Fond orange clair
          doc.rect(sectionMargin, docY - 3, contentWidth, lineHeight, 'F')
          doc.setFont(undefined, 'bold')
          doc.setTextColor(210, 105, 30) // Orange foncé
        } else {
          // Fond alterné pour meilleure lisibilité
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250)
            doc.rect(sectionMargin, docY - 3, contentWidth, lineHeight, 'F')
          }
          doc.setFont(undefined, 'bold')
          doc.setTextColor(80, 80, 80)
        }

        // Label
        doc.text(label, sectionMargin, docY)

        // Valeur
        doc.setFont(undefined, isImportant ? 'bold' : 'normal')
        doc.setTextColor(isImportant ? 210 : 0, isImportant ? 105 : 0, isImportant ? 30 : 0)

        const lines = doc.splitTextToSize(value, valueWidth)

        if (lines.length === 1) {
          doc.text(value, TICKET_WIDTH - sectionMargin, docY, {
            align: 'right',
          })
          docY += lineHeight
        } else {
          doc.text(lines[0], TICKET_WIDTH - sectionMargin, docY, {
            align: 'right',
          })
          docY += lineHeight

          for (let i = 1; i < lines.length; i++) {
            doc.text(lines[i], TICKET_WIDTH - sectionMargin, docY, {
              align: 'right',
            })
            docY += lineHeight
          }
        }

        // Ligne séparatrice fine entre les éléments
        if (!compact && index < data.length - 1) {
          docY += 1
          doc.setDrawColor(230, 230, 230)
          doc.setLineWidth(0.1)
          doc.line(sectionMargin, docY, TICKET_WIDTH - sectionMargin, docY)
          docY += 2
        }
      })

      return docY
    }

    // --- Fonction pour dessiner la ligne de coupe ---
    const drawCutLine = (docY: number) => {
      docY += 3
      doc.setLineWidth(0.3)
      doc.setDrawColor(0)

      // Ligne pointillée (perforation)
      const lineLength = 2
      const gap = 2
      for (let x = MARGIN; x < TICKET_WIDTH - MARGIN - lineLength; x += lineLength + gap) {
        doc.line(x, docY, x + lineLength, docY)
      }
      docY += 5
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.text('--- Ligne de coupe / Reçu client ---', TICKET_WIDTH / 2, docY, { align: 'center' })
      docY += 4
      return docY
    }

    // Obtenir la date et l'heure actuelles
    const now = new Date()
    const ticketId = customer._id ?? 'TEMP_ID'

    // =======================================================
    //                                 SECTION 1: MA3SRA (GARDE)
    // =======================================================

    // 1. En-tête de la ma3sra
    doc.setFontSize(14).setFont(undefined, 'bold')
    doc.text('MA3SRA - BOUCHEMA', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(8).setFont(undefined, 'normal')
    doc.text('COPIE INTERNE', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 4
    doc.setLineWidth(0.3).line(MARGIN, y, TICKET_WIDTH - MARGIN, y)
    y += 4

    // 2. Infos Transaction
    doc.setFontSize(9)
    doc.text(`ID Transaction: ${ticketId.slice(-8)}`, MARGIN, y)
    doc.text(`Date: ${formatDateDDMMYYYY(now.toISOString())}`, TICKET_WIDTH - MARGIN, y, { align: 'right' })
    y += 4
    doc.text(`Heure: ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, TICKET_WIDTH - MARGIN, y, { align: 'right' })
    y += 6

    // 3. Infos Client
    y = printDataSection(
      'INFORMATIONS CLIENT',
      [
        { label: 'Nom & Prénom', value: customer.nomPrenom },
        { label: 'Téléphone', value: customer.numTelephone ?? '-' },
      ],
      y,
    )
    y += 3

    // 4. Détails du traitement (MA3SRA)
    y = printDataSection(
      'DÉTAILS DU TRAITEMENT',
      [
        { label: 'Qté Olive NETTE (kg)', value: customer.quantiteOliveNet?.toFixed(2) ?? '-' },
        { label: 'Qté Huile Obtenue (kg)', value: customer.quantiteHuile },
        { label: 'Rendement (Nisba %)', value: customer.nisba?.toFixed(2) ?? '-' },
        { label: 'Kattou3 (L/100kg huile)', value: customer.kattou3?.toFixed(2) ?? '-' },
      ],
      y,
    )
    y += 3

    // 5. Total A Payer (si les prix sont inclus)
    if (customer.prixFinal && customer.prixKg) {
      y = printDataSection(
        'RÉSUMÉ CAISSE',
        [
          { label: `Prix/kg (DT)`, value: customer.prixKg.toFixed(2) },
          { label: 'MONTANT TOTAL (DT)', value: customer.prixFinal.toFixed(2) },
        ],
        y,
      )
      y += 3
    }

    // =======================================================
    //                          LIGNE DE COUPE ET SECTION CLIENT
    // =======================================================
    y = drawCutLine(y)

    // 1. En-tête du Reçu Client
    doc.setFontSize(12).setFont(undefined, 'bold')
    doc.text('REÇU CLIENT', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 4
    doc.setFontSize(8).setFont(undefined, 'normal')
    doc.text('MA3SRA - BOUCHEMA | Tél: +216 9X XXX XXX', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 5
    doc.setLineWidth(0.2).line(MARGIN, y, TICKET_WIDTH - MARGIN, y)
    y += 4

    // 2. Infos Client & Transaction (Minimales)
    doc.setFontSize(9)
    doc.text(`Client: ${customer.nomPrenom}`, MARGIN, y)
    doc.text(`ID: ${ticketId.slice(-8)}`, TICKET_WIDTH - MARGIN, y, { align: 'right' })
    y += 4
    doc.text(`Date: ${formatDateDDMMYYYY(now.toISOString())} - ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, MARGIN, y)
    y += 6

    // 3. Détails du Rendement (CLIENT)
    y = printDataSection(
      'RÉSUMÉ RENDEMENT',
      [
        { label: 'Olive Nette (kg)', value: customer.quantiteOliveNet?.toFixed(2) ?? '-' },
        { label: 'Huile Obtenue (kg)', value: customer.quantiteHuile },
        { label: 'Rendement (Nisba %)', value: customer.nisba?.toFixed(2) ?? '-' },
      ],
      y,
    )
    y += 3

    // 4. Montant Final
    if (customer.prixFinal) {
      y = printDataSection('MONTANT À RÉGLER', [{ label: 'Total Net (DT)', value: customer.prixFinal.toFixed(2) }], y)
      y += 3
    }

    // 5. Bas de page Client
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.text('MERCI POUR VOTRE CONFIANCE !', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 4
    doc.setFontSize(7).setFont(undefined, 'normal')
    doc.text('Ce reçu est votre preuve de dépôt.', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 4
    doc.text('Powered by Ma3sra Software', TICKET_WIDTH / 2, y, { align: 'center' })

    // --- Sauvegarde ---
    doc.save(`ticket_ma3sra_${ticketId}_${formatDateDDMMYYYY(now.toISOString()).replace(/\//g, '-')}.pdf`)
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
    // columnHelper.accessor('numCIN', { header: 'CIN' }),
    columnHelper.accessor('nomPrenom', { header: 'Nom & Prénom', cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> }),
    columnHelper.accessor('nombreCaisses', { header: 'nombreCaisses', cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> }),
    columnHelper.accessor('quantiteOliveNet', { header: 'quantiteOliveNet', cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> }),
    columnHelper.accessor('quantiteHuile', { header: 'quantiteHuile', cell: (info) => <h5 className="mb-0">{info.getValue()}</h5> }),
    columnHelper.accessor('kattou3', {
      header: 'kattou3',
      cell: (info) => (
        <Badge bg="warning">
          {' '}
          {/* Utilisez une balise Badge ou span */}
          {/* Arrondi à 3 décimales */}
          {info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}
        </Badge>
      ),
    }),

    columnHelper.accessor('nisbaReelle', {
      header: 'nisba %',
      cell: (info) => (
        <Badge bg="success">
          {' '}
          {/* Choisissez la couleur de votre badge */}
          {/* Arrondi à 3 décimales */}
          {info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}
        </Badge>
      ),
    }),
    columnHelper.accessor('prixFinal', {
      header: 'prix Dinar',
      cell: (info) => (
        <Badge bg="secondary">
          {' '}
          {/* Choisissez la couleur de votre badge */}
          {/* Arrondi à 3 décimales */}
          {info.getValue() != null ? info.getValue().toFixed(3) : 'N/A'}
        </Badge>
      ),
    }),
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
                    placeholder="Nom, Tél ..."
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
