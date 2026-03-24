'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormControl,
  FormLabel,
  Modal,
  Row,
  Table,
  Dropdown,
  Alert,
  Badge,
  Spinner,
} from 'react-bootstrap'
import { TbEdit, TbTrash, TbPlus, TbDownload, TbEye, TbRefresh, TbPrinter } from 'react-icons/tb'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import TablePagination from '@/components/table/TablePagination'

// ======================================================================
// ⚙️ CONFIG API
// ======================================================================
const API_ACHATS = 'http://192.168.1.15:8170/achats'
const API_PROPRIETAIRES = 'http://192.168.1.15:8170/proprietaires'
const API_CAISSE = 'http://192.168.1.15:8170/caisse' // ✅ endpoint correct (singulier)

const POID_CAISSE = 30
const POID_WIBA_DEFAUT = 27

// ✅ commentaire standard automatique (quand on ne déduit pas la caisse)
const STANDARD_CAISSE_COMMENTAIRE = "J'ai choisi de ne pas diminuer le montant de la caisse"

// ======================================================================
// DTO (référence backend)
// ======================================================================
export class CreateCaisseDto {
  motif: string
  montant: number
  type: string
  date: string
  uniqueId: string
  commentaire: string
  nomutilisatuer?: string
}

// ======================================================================
// 📥 EXPORT PDF
// ======================================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportRow {
  [key: string]: string | number
}

interface ExportTotals {
  totalQuantiteOlive: number
  totalQuantiteOliveNet: number
  totalNbreCaisse: number
  totalProduitWiba: number
  totalCout: number
}

const customExportToPDF = (data: ExportRow[], title: string, subtitle: string, totals: ExportTotals): void => {
  if (typeof jsPDF === 'undefined') {
    alert("Erreur: jsPDF non chargé. Assurez-vous d'avoir installé 'jspdf' et 'jspdf-autotable'.")
    return
  }

  const doc = new jsPDF('p', 'mm', 'a4')

  const margin = 14
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - margin * 2
  const thousandsSep: ' ' | '.' = ' '

  const sanitize = (s: any) => {
    const str = String(s ?? '')
    return str
      .replace(/\b(nom\s*utilisateur|nomutilisateur|utilisateur|username|user)\s*[:\-]\s*[^|•\n\r]+/gi, '')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const cleanNumber = (value: any) => {
    if (typeof value === 'number') return value
    const s = String(value ?? '')
    return (
      parseFloat(
        s
          .replace(/[\u00A0\u202F]/g, ' ')
          .replace(/[^0-9.,-]/g, '')
          .replace(',', '.'),
      ) || 0
    )
  }

  const formatNumberFR = (n: number, decimals = 2) => {
    const s = n.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return s.replace(/[\u00A0\u202F]/g, thousandsSep)
  }

  const fmt2 = (v: any) => formatNumberFR(cleanNumber(v), 2)
  const fmt0 = (v: any) => String(Math.round(cleanNumber(v)))

  const norm = (s: string) =>
    String(s ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_/.-]/g, ' ')
      .replace(/\s+/g, ' ')

  const flattenRow = (obj: any, prefix = '', out: Record<string, any> = {}) => {
    if (!obj || typeof obj !== 'object') return out
    for (const k of Object.keys(obj)) {
      const val = obj[k]
      const key = prefix ? `${prefix}.${k}` : k
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        flattenRow(val, key, out)
      } else {
        out[key] = val
      }
    }
    return out
  }

  const bestMatchValue = (row: any, keywordGroups: string[][], fallbackKeys: string[] = []) => {
    const flat = flattenRow(row)
    const keys = Object.keys(flat)

    for (const fk of fallbackKeys) {
      if (Object.prototype.hasOwnProperty.call(row as any, fk)) return (row as any)[fk]
      const foundDirect = keys.find((k) => k.trim() === fk.trim())
      if (foundDirect) return flat[foundDirect]
    }

    let bestKey: string | null = null
    let bestScore = -1

    for (const k of keys) {
      const nk = norm(k)
      let score = 0
      for (const group of keywordGroups) {
        const ok = group.every((w) => nk.includes(norm(w)))
        if (ok) score += 10
      }
      if (score > 0) score += Math.max(0, 8 - nk.length / 6)
      if (score > bestScore) {
        bestScore = score
        bestKey = k
      }
    }
    return bestKey ? flat[bestKey] : undefined
  }

  // Header page 1 only
  const subtitleClean = sanitize(subtitle)
  const drawHeaderFirstPageOnly = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(0)
    doc.text(title, margin, 15)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0)

    let bottomY = 19
    if (subtitleClean) {
      const lines = doc.splitTextToSize(subtitleClean, contentW)
      doc.text(lines, margin, 22)
      bottomY = 22 + lines.length * 4.2 + 2
    }

    doc.setDrawColor(0)
    doc.setLineWidth(0.2)
    doc.line(margin, bottomY, pageW - margin, bottomY)
    return bottomY
  }

  const headerBottomY = drawHeaderFirstPageOnly()
  const startYFirstPage = headerBottomY + 6

  const body =
    data?.length > 0
      ? (data as any[]).map((row) => {
          const date =
            bestMatchValue(row, [['date']], ['Date Achat', 'Date', 'date', 'createdAt', 'dateAchat']) ?? ''

          const brut = bestMatchValue(
            row,
            [
              ['quantite', 'olive', 'kg'],
              ['olive', 'brut'],
            ],
            ['Quantité Olive (kg)', 'Quantite Olive (kg)', 'Olive Brut (kg)'],
          )

          const caisses = bestMatchValue(
            row,
            [
              ['nbre', 'caisse'],
              ['nombre', 'caisse'],
              ['caisse'],
            ],
            ['Nbre Caisse', 'Nombre Caisse', 'Caisses'],
          )

          const net = bestMatchValue(
            row,
            [
              ['quantite', 'olive', 'net'],
              ['olive', 'net'],
            ],
            ['Quantité Olive Net (kg)', 'Quantite Olive Net (kg)', 'Olive Net (kg)'],
          )

          const poidsWiba = bestMatchValue(
            row,
            [
              ['poids', 'wiba'],
              ['wiba', 'kg'],
            ],
            ['Poids Wiba (kg)', 'Poids Wiba'],
          )

          const prixWiba = bestMatchValue(row, [['prix', 'wiba'], ['wiba', 'prix']], ['Prix Wiba'])
          const produit = bestMatchValue(row, [['produit', 'wiba'], ['produit']], ['Produit (Wiba)', 'Produit Wiba'])

          const cout = bestMatchValue(
            row,
            [
              ['cout', 'total'],
              ['cout'],
              ['total', 'dinar'],
              ['montant', 'total'],
            ],
            ['Coût Total (Dinar)', 'Cout Total (Dinar)', 'Total (Dinar)'],
          )

          return [String(date ?? ''), fmt2(brut), fmt0(caisses), fmt2(net), fmt2(poidsWiba), fmt2(prixWiba), fmt2(produit), fmt2(cout)]
        })
      : []

  if (!body.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text('Aucune donnée à exporter.', margin, startYFirstPage)

    doc.setFontSize(8)
    doc.text('Page 1 / 1', pageW / 2, pageH - 10, { align: 'center' })
    doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    return
  }

  autoTable(doc, {
    startY: startYFirstPage,
    margin: { left: margin, right: margin, top: 12, bottom: 18 },
    head: [[
      'Date',
      'Olive Brut (kg)',
      'Caisses',
      'Olive Net (kg)',
      'Poids Wiba (kg)',
      'Prix Wiba',
      'Produit (Wiba)',
      'Coût Total (Dinar)',
    ]],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 2.0,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { halign: 'right' },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  })

  let y = ((doc as any).lastAutoTable?.finalY ?? startYFirstPage) + 10

  if (totals) {
    const totalsRows = [
      ['Total Quantité Olive Brut', `${formatNumberFR(cleanNumber(totals.totalQuantiteOlive), 2)} kg`],
      ['Total Quantité Olive Net', `${formatNumberFR(cleanNumber(totals.totalQuantiteOliveNet), 2)} kg`],
      ['Total Produit', `${formatNumberFR(cleanNumber(totals.totalProduitWiba), 2)} Wiba`],
      ['Total Coût', `${formatNumberFR(cleanNumber(totals.totalCout), 2)} Dinar`],
    ]

    if (y + 25 > pageH - 18) {
      doc.addPage()
      y = 12
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text('Totaux', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, top: 12, bottom: 18 },
      head: [['Libellé', 'Valeur']],
      body: totalsRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        cellPadding: 2.0,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: contentW * 0.68 },
        1: { halign: 'right' },
      },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.text(`Page ${i} / ${pageCount}`, pageW / 2, pageH - 10, { align: 'center' })
  }

  doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

// ======================================================================
// Types
// ======================================================================
interface AchatData {
  _id: string
  dateAchat: string
  quantiteOlive: number
  quantiteOliveNet: number
  nbreCaisse: number
  poidWiba: number
  prixWiba: number
  produitWiba: number
  coutTotal: number
  createdAt?: string
  updatedAt?: string
}

interface AchatPayload {
  dateAchat: string
  quantiteOlive: number
  nbreCaisse: number
  poidWiba: number
  prixWiba: number
}

interface Column {
  Header: string
  accessor: keyof AchatData | 'actions' | 'select'
  className?: string
}

// ======================================================================
// Utils
// ======================================================================
const fmt2 = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

// ======================================================================
// Colonnes table
// ======================================================================
const COLUMNS: Column[] = [
  { Header: '', accessor: 'select', className: 'text-center' },
  { Header: 'Date Achat', accessor: 'dateAchat' },
  { Header: 'Olive Brut (kg)', accessor: 'quantiteOlive' },
  { Header: 'Nbre Caisse', accessor: 'nbreCaisse' },
  { Header: 'Olive Net (kg)', accessor: 'quantiteOliveNet', className: 'fw-bold' },
  { Header: 'Poids Wiba (kg)', accessor: 'poidWiba' },
  { Header: 'Prix Wiba', accessor: 'prixWiba' },
  { Header: 'Produit (Wiba)', accessor: 'produitWiba', className: 'fw-semibold text-success' },
  { Header: 'Coût Total (DT)', accessor: 'coutTotal', className: 'fw-semibold text-primary' },
  { Header: 'Actions', accessor: 'actions', className: 'text-center' },
]

// ======================================================================
// Impression thermique
// ======================================================================
function generateThermalTicketAchat(a: AchatData): string {
  const W = 32
  const LINE = '-'.repeat(W)
  const SEP = '*'.repeat(W)

  const center = (text: string): string => {
    const len = [...text].length
    const padding = Math.max(0, Math.floor((W - len) / 2))
    return ' '.repeat(padding) + text
  }

  const date = a.dateAchat || new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const rows: string[] = []
  rows.push(center('🫒 ACHAT OLIVE 🫒'))
  rows.push(LINE)
  rows.push(center(`Date: ${date} ${time}`))
  rows.push(LINE)
  rows.push(`Olive brut : ${fmt2(a.quantiteOlive)} kg`)
  rows.push(`Caisses    : ${Number(a.nbreCaisse || 0)}`)
  rows.push(`Olive net  : ${fmt2(a.quantiteOliveNet)} kg`)
  rows.push(LINE)
  rows.push(`Poids Wiba : ${fmt2(a.poidWiba)} kg`)
  rows.push(`Prix Wiba  : ${fmt2(a.prixWiba)} DT`)
  rows.push(SEP)
  rows.push(center(`Produit: ${fmt2(a.produitWiba)} Wiba`))
  rows.push(center(`TOTAL : ${fmt2(a.coutTotal)} DT`))
  rows.push(SEP)
  rows.push(center('Merci'))
  rows.push('')
  return rows.join('\n')
}

function printThermal(content: string) {
  const printWindow = window.open('', '', 'height=400,width=600')
  if (!printWindow) {
    alert("Impossible d'ouvrir la fenêtre d'impression (popup bloqué).")
    return
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Ticket Achat</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Consolas','Courier New',monospace; font-size: 9pt; line-height: 1.2; margin: 5mm; }
          pre { margin: 0; padding: 0; white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <pre>${content}</pre>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

// ======================================================================
// Table component
// ======================================================================
function CustomDataTable({
  columns,
  data,
  onView,
  onEdit,
  onDelete,
  onPrint,
  selectedRows,
  toggleRowSelection,
  toggleAllSelection,
}: {
  columns: Column[]
  data: AchatData[]
  onView: (row: AchatData) => void
  onEdit: (row: AchatData) => void
  onDelete: (id: string) => void
  onPrint: (row: AchatData) => void
  selectedRows: string[]
  toggleRowSelection: (id: string) => void
  toggleAllSelection: (checked: boolean) => void
}) {
  const isAllSelected = data.length > 0 && selectedRows.length === data.length

  if (!data || data.length === 0) {
    return <p className="text-center text-muted p-4 mb-0">Aucun achat d'olive enregistré.</p>
  }

  return (
    <div className="table-responsive">
      <Table className="mb-0 table-striped table-hover align-middle">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.className}>
                {col.accessor === 'select' ? (
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => toggleAllSelection(e.target.checked)}
                    title="Sélectionner tout"
                  />
                ) : (
                  col.Header
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row._id}>
              {columns.map((col, idx) => {
                let content: any = null

                if (col.accessor === 'select') {
                  content = (
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row._id)}
                      onChange={() => toggleRowSelection(row._id)}
                    />
                  )
                } 
                else if (col.accessor === 'actions') {
  content = (
    <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center justify-content-center">
      <Button
        variant="default"
        size="sm"
        onClick={() => onView(row)}
        title="Voir"
      >
        <TbEye className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={() => onPrint(row)}
        title="Imprimer ticket"
      >
        <TbPrinter className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={() => onEdit(row)}
        title="Modifier"
      >
        <TbEdit className="fs-lg" />
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={() => onDelete(row._id)}
        title="Supprimer"
      >
        <TbTrash className="fs-lg" />
      </Button>
    </div>
  )
}
                else {
                  const v = row[col.accessor as keyof AchatData]
                  if (typeof v === 'number') {
                    if (col.accessor === 'nbreCaisse') content = Number(v).toFixed(0)
                    else content = Number(v).toFixed(2)
                  } else {
                    content = v
                  }
                }

                return (
                  <td key={idx} className={col.className}>
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

// ======================================================================
// Modal add/edit
// ======================================================================
function NouveauAchatModal({
  show,
  handleClose,
  handleSave,
  dataToEdit,
}: {
  show: boolean
  handleClose: () => void
  handleSave: (data: AchatPayload, id?: string) => Promise<void>
  dataToEdit: AchatData | null
}) {
  const isEditMode = !!dataToEdit

  const [formData, setFormData] = useState<AchatPayload>({
    dateAchat: dataToEdit?.dateAchat || new Date().toISOString().substring(0, 10),
    quantiteOlive: dataToEdit?.quantiteOlive || 0,
    nbreCaisse: dataToEdit?.nbreCaisse || 0,
    poidWiba: dataToEdit?.poidWiba || POID_WIBA_DEFAUT,
    prixWiba: dataToEdit?.prixWiba || 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!show) return
    setFormData({
      dateAchat: dataToEdit?.dateAchat || new Date().toISOString().substring(0, 10),
      quantiteOlive: dataToEdit?.quantiteOlive || 0,
      nbreCaisse: dataToEdit?.nbreCaisse || 0,
      poidWiba: dataToEdit?.poidWiba || POID_WIBA_DEFAUT,
      prixWiba: dataToEdit?.prixWiba || 0,
    })
  }, [show, dataToEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let val: number | string = value
    if (name !== 'dateAchat') val = value === '' ? 0 : parseFloat(value) || 0
    setFormData((prev) => ({ ...prev, [name]: val }))
  }

  const { produitWiba, coutTotal, quantiteOliveNet } = useMemo(() => {
    const poidZitoun = Number(formData.quantiteOlive || 0)
    const nbreCaisse = Number(formData.nbreCaisse || 0)
    const poidWiba = Number(formData.poidWiba || 0)
    const prixWiba = Number(formData.prixWiba || 0)

    const net = Math.max(0, poidZitoun - nbreCaisse * POID_CAISSE)

    let p = 0
    let c = 0
    if (net > 0 && poidWiba > 0) {
      p = Math.round((net / poidWiba) * 100) / 100
      c = Math.round(p * prixWiba * 100) / 100
    }
    return { quantiteOliveNet: net, produitWiba: p, coutTotal: c }
  }, [formData])

  const handleSubmit = async () => {
    if (!(formData.quantiteOlive > 0 && formData.nbreCaisse >= 0 && formData.prixWiba > 0 && formData.poidWiba > 0)) {
      alert('Veuillez vérifier les champs obligatoires.')
      return
    }

    setIsLoading(true)
    try {
      const payload: AchatPayload = {
        dateAchat: formData.dateAchat,
        quantiteOlive: Number(formData.quantiteOlive || 0),
        nbreCaisse: Number(formData.nbreCaisse || 0),
        poidWiba: Number(formData.poidWiba || 0),
        prixWiba: Number(formData.prixWiba || 0),
      }
      await handleSave(payload, dataToEdit?._id)
      handleClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditMode ? 'Modifier Achat' : "Ajouter un Nouvel Achat d'Olive"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Date Achat <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl type="date" name="dateAchat" value={formData.dateAchat} onChange={handleChange} required />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Quantité Olive Brut (kg) <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl type="number" name="quantiteOlive" value={formData.quantiteOlive || ''} onChange={handleChange} min="0" required />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Nombre Caisse <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl type="number" name="nbreCaisse" value={formData.nbreCaisse || ''} onChange={handleChange} min="0" required />
              <Form.Text className="text-muted">Poids caisses déduit : {Number(formData.nbreCaisse || 0) * POID_CAISSE} kg</Form.Text>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Quantité Olive Net (kg)
            </FormLabel>
            <Col sm={7}>
              <div className="form-control bg-light fw-bold">{quantiteOliveNet.toFixed(2)} kg</div>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Poids Wiba (kg) <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl type="number" name="poidWiba" value={formData.poidWiba || ''} onChange={handleChange} min="0.1" required />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Prix Wiba <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl type="number" name="prixWiba" value={formData.prixWiba || ''} onChange={handleChange} min="0.1" required />
            </Col>
          </Form.Group>

          <hr />

          <Row className="g-2">
            <Col sm={6}>
              <div className="p-2 border rounded bg-light">
                <div className="text-muted small">Produit estimé</div>
                <div className="fw-bold text-success">{produitWiba.toFixed(2)} Wiba</div>
              </div>
            </Col>
            <Col sm={6}>
              <div className="p-2 border rounded bg-light">
                <div className="text-muted small">Coût total estimé</div>
                <div className="fw-bold text-primary">{coutTotal.toFixed(2)} DT</div>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Sauvegarde…' : isEditMode ? 'Sauvegarder' : 'Enregistrer'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ======================================================================
// Detail Modal
// ======================================================================
function DetailModal({ show, handleClose, data }: { show: boolean; handleClose: () => void; data: AchatData | null }) {
  if (!data) return null

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Détail Achat — …{data._id.slice(-6)}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Table bordered striped className="mb-0">
          <tbody>
            <tr>
              <th>Date Achat</th>
              <td>
  {data.createdAt 
    ? new Date(data.createdAt).toLocaleString('fr-FR') 
    : 'Date non disponible'}
</td>
            </tr>
            <tr>
              <th>Quantité Olive Brut</th>
              <td>{data.quantiteOlive.toFixed(2)} kg</td>
            </tr>
            <tr>
              <th>Nombre Caisse</th>
              <td>{data.nbreCaisse.toFixed(0)}</td>
            </tr>
            <tr>
              <th>Poids caisses déduit</th>
              <td>{(data.nbreCaisse * POID_CAISSE).toFixed(2)} kg</td>
            </tr>
            <tr>
              <th>Quantité Olive Net</th>
              <td className="fw-bold">{data.quantiteOliveNet.toFixed(2)} kg</td>
            </tr>
            <tr>
              <th>Poids Wiba</th>
              <td>{data.poidWiba.toFixed(2)} kg</td>
            </tr>
            <tr>
              <th>Prix Wiba</th>
              <td>{data.prixWiba.toFixed(2)} DT</td>
            </tr>
            <tr>
              <th>Produit</th>
              <td className="fw-bold text-success">{data.produitWiba.toFixed(2)} Wiba</td>
            </tr>
            <tr>
              <th>Coût Total</th>
              <td className="fw-bold text-primary">{data.coutTotal.toFixed(2)} DT</td>
            </tr>
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ======================================================================
// ✅ Modal décision caisse (commentaire standard auto)
// ======================================================================
function CaisseDecisionModal({
  show,
  // onHide,
  achat,
  onConfirm,
  loading,
}: {
  show: boolean
  onHide: () => void
  achat: AchatData | null
  onConfirm: (params: { deduct: boolean; motif: string }) => void
  loading: boolean
}) {
  const [deduct, setDeduct] = useState(true)
  const [motif, setMotif] = useState('')

  useEffect(() => {
    if (!show) return
    setDeduct(true)
    if (achat) {
      setMotif(`Achat زيتون — ${achat.dateAchat} — Total ${Number(achat.coutTotal || 0).toFixed(2)} DT`)
    } else {
      setMotif('Achat زيتون')
    }
  }, [show, achat])

  const handleSubmit = () => {
    const m = motif.trim()
    if (!m) return alert('Motif obligatoire.')
    onConfirm({ deduct, motif: m })
  }

  const amount = Number(achat?.coutTotal || 0)

  return (
    <Modal show={show}  centered backdrop={loading ? 'static' : true}>
      <Modal.Header >
        <Modal.Title>Validation caisse</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="mb-2">
          <div className="fw-semibold">Achat du {achat?.dateAchat}</div>
          <div className="text-muted small">
            Montant achat: <span className="fw-bold">{amount.toFixed(2)} DT</span>
          </div>
        </div>

        <div className="border rounded p-2">
          <Form.Check
            type="radio"
            id="deduct-yes"
            name="deduct"
            label="✅ Oui — Déduire automatiquement de la caisse"
            checked={deduct}
            onChange={() => setDeduct(true)}
            disabled={loading}
            className="mb-2"
          />

          <Form.Check
            type="radio"
            id="deduct-no"
            name="deduct"
            label="❌ Non — Ne pas diminuer la caisse (montant caisse = 0)"
            checked={!deduct}
            onChange={() => setDeduct(false)}
            disabled={loading}
          />

          {!deduct && (
            <Alert variant="warning" className="py-2 mt-2 mb-0">
              Commentaire automatique: <b>{STANDARD_CAISSE_COMMENTAIRE}</b>
            </Alert>
          )}

          <hr className="my-2" />

          <Form.Group className="mb-0">
            <Form.Label className="mb-1">Motif (obligatoire)</Form.Label>
            <FormControl value={motif} onChange={(e) => setMotif(e.target.value)} disabled={loading} />
          </Form.Group>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary"  disabled={true}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Envoi…' : 'Valider'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ======================================================================
// PAGE
// ======================================================================
export default function Page() {
  const [achatData, setAchatData] = useState<AchatData[]>([])
  const [allTotals, setAllTotals] = useState<ExportTotals>({
    totalCout: 0,
    totalProduitWiba: 0,
    totalQuantiteOlive: 0,
    totalQuantiteOliveNet: 0,
    totalNbreCaisse: 0,
  })

  const [modalShow, setModalShow] = useState(false)
  const [detailModalShow, setDetailModalShow] = useState(false)
  const [dataToEdit, setDataToEdit] = useState<AchatData | null>(null)
  const [dataToView, setDataToView] = useState<AchatData | null>(null)

  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [uiError, setUiError] = useState<string | null>(null)
  const [uiSuccess, setUiSuccess] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<Date[]>([])
  const [costMin, setCostMin] = useState<string>('')
  const [costMax, setCostMax] = useState<string>('')

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  // ✅ caisse decision
  const [caisseModalShow, setCaisseModalShow] = useState(false)
  const [pendingAchatForCaisse, setPendingAchatForCaisse] = useState<AchatData | null>(null)
  const [caisseLoading, setCaisseLoading] = useState(false)

  const resetMessages = () => {
    setUiError(null)
    setUiSuccess(null)
  }

  const fetchAchatData = useCallback(async () => {
    setLoading(true)
    resetMessages()
    try {
      const [dataRes, totalsRes] = await Promise.all([
        fetch(API_ACHATS, { cache: 'no-store' }),
        fetch(`${API_ACHATS}/totals`, { cache: 'no-store' }),
      ])

      if (!dataRes.ok || !totalsRes.ok) throw new Error("Erreur lors de la récupération des données de l'API.")

      const data: AchatData[] = await dataRes.json()
      const totals: Omit<ExportTotals, 'totalNbreCaisse'> = await totalsRes.json()
      const totalNbreCaisse = (Array.isArray(data) ? data : []).reduce((sum, item) => sum + Number(item.nbreCaisse || 0), 0)

      setAchatData(Array.isArray(data) ? data : [])
      setAllTotals({ ...totals, totalNbreCaisse })
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    } catch (e: any) {
      console.error(e)
      setAchatData([])
      setAllTotals({ totalCout: 0, totalProduitWiba: 0, totalQuantiteOlive: 0, totalQuantiteOliveNet: 0, totalNbreCaisse: 0 })
      setUiError(e?.message || "Impossible de charger les achats.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAchatData()
  }, [fetchAchatData])

  const filtered = useMemo(() => {
    let res = [...achatData]

    if (dateRange.length === 1) {
      const d = startOfDay(dateRange[0])
      res = res.filter((x) => {
        const dt = new Date(`${x.dateAchat}T00:00:00`)
        return startOfDay(dt).getTime() === d.getTime()
      })
    } else if (dateRange.length === 2) {
      const start = startOfDay(dateRange[0])
      const end = addDays(startOfDay(dateRange[1]), 1)
      res = res.filter((x) => {
        const dt = new Date(`${x.dateAchat}T00:00:00`)
        return dt >= start && dt < end
      })
    }

    const min = costMin.trim() === '' ? null : Number(costMin)
    const max = costMax.trim() === '' ? null : Number(costMax)

    if (min !== null && Number.isFinite(min)) res = res.filter((x) => Number(x.coutTotal || 0) >= min)
    if (max !== null && Number.isFinite(max)) res = res.filter((x) => Number(x.coutTotal || 0) <= max)

    res.sort((a, b) => String(b.dateAchat).localeCompare(String(a.dateAchat)))
    return res
  }, [achatData, dateRange, costMin, costMax])

  const pageIndex = pagination.pageIndex
  const pageSize = pagination.pageSize
  const totalItems = filtered.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))

  const paged = useMemo(() => {
    const startIdx = pageIndex * pageSize
    return filtered.slice(startIdx, startIdx + pageSize)
  }, [filtered, pageIndex, pageSize])

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleAllSelection = (checked: boolean) => {
    setSelectedRows(checked ? paged.map((d) => d._id) : [])
  }

  const handleView = (row: AchatData) => {
    setDataToView(row)
    setDetailModalShow(true)
  }

  const handleEdit = (row: AchatData) => {
    setDataToEdit(row)
    setModalShow(true)
  }

  const handleModalClose = () => {
    setModalShow(false)
    setDataToEdit(null)
  }

  const handleDetailModalClose = () => {
    setDetailModalShow(false)
    setDataToView(null)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet achat ?")) return

    setLoading(true)
    resetMessages()
    try {
      const res = await fetch(`${API_ACHATS}/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Suppression échouée.')
      }

      setUiSuccess('Achat supprimé.')
      await fetchAchatData()
      setSelectedRows((prev) => prev.filter((x) => x !== id))
    } catch (e: any) {
      console.error(e)
      setUiError(e?.message || 'Erreur suppression.')
    } finally {
      setLoading(false)
    }
  }

  // ✅ logique date caisse: date sélectionnée + heure actuelle (comme ta page caisse)
  const buildCaisseISODate = (selectedDate?: string) => {
    if (!selectedDate) return new Date().toISOString()

    const now = new Date()
    const [year, month, day] = String(selectedDate).split('-').map((p) => parseInt(p, 10))
    if (!year || !month || !day) return now.toISOString()

    now.setFullYear(year, month - 1, day)
    return now.toISOString()
  }

  // ✅ crée mouvement caisse (endpoint /caisse)
  const createCaisseMovement = async (params: { achat: AchatData; deduct: boolean; motif: string }) => {
    const { achat, deduct, motif } = params

    const montant = deduct ? Number(achat.coutTotal || 0) : 0

    const body = {
      motif,
      montant,
      type: 'debit',
      date: buildCaisseISODate(achat.dateAchat),
      commentaire: deduct ? '' : STANDARD_CAISSE_COMMENTAIRE,
      // uniqueId: achat._id, // ⚠️ active seulement si ton backend l'accepte
    }

    const res = await fetch(API_CAISSE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => null)
      throw new Error(text || "Erreur lors de l’ajout caisse")
    }
  }

  const handleCaisseConfirm = async (params: { deduct: boolean; motif: string }) => {
    if (!pendingAchatForCaisse) return

    setCaisseLoading(true)
    resetMessages()
    try {
      await createCaisseMovement({
        achat: pendingAchatForCaisse,
        deduct: params.deduct,
        motif: params.motif,
      })

      setUiSuccess(
        params.deduct
          ? `Caisse mise à jour: -${Number(pendingAchatForCaisse.coutTotal || 0).toFixed(2)} DT`
          : `Notification caisse envoyée (montant 0) avec commentaire standard.`,
      )

      setCaisseModalShow(false)
      setPendingAchatForCaisse(null)
    } catch (e: any) {
      console.error(e)
      setUiError(e?.message || 'Erreur caisse.')
    } finally {
      setCaisseLoading(false)
    }
  }

  // Save (create/update) + add to proprietaires on create
  const handleSave = async (payload: AchatPayload, id?: string) => {
    setLoading(true)
    resetMessages()

    try {
      const method = id ? 'PUT' : 'POST'
      const url = id ? `${API_ACHATS}/${id}` : API_ACHATS

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.message || response.statusText)
      }

      const saved: AchatData = await response.json().catch(() => null)

      // ✅ Sur création seulement: ouvrir modal caisse
      if (!id && saved?._id) {
        setPendingAchatForCaisse(saved)
        setCaisseModalShow(true)
      }

      // ✅ Ajout stock propriétaire seulement sur création
      if (!id && saved?._id) {
        const proprietairePayload = {
          nomPrenom: `Achat olive — ${saved.dateAchat} — Total ${fmt2(Number(saved.coutTotal || 0))} DT`,
          type: 'proprietaire' as const,
          dateCreation: new Date(saved.dateAchat || payload.dateAchat).toISOString(),

          nombreCaisses: Number(saved.nbreCaisse ?? payload.nbreCaisse ?? 0),
          quantiteOlive: Number(saved.quantiteOlive ?? payload.quantiteOlive ?? 0),
          quantiteOliveNet: Number(saved.quantiteOliveNet ?? 0),

          quantiteHuile: 0,
          kattou3: 0,
          nisba: 0,
          nisbaReelle: 0,
          quantiteHuileTheorique: 0,
          differenceHuile: 0,
          nombreWiba: 0,
          nombreQfza: 0,
          huileParQfza: 0,
        }

        const resStock = await fetch(API_PROPRIETAIRES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proprietairePayload),
        })

        if (!resStock.ok) {
          const err = await resStock.json().catch(() => null)
          setUiError(`Achat sauvegardé, mais ajout stock propriétaire échoué: ${String(err?.message || resStock.statusText)}`)
        } else {
          setUiSuccess('Achat sauvegardé + stock propriétaire ajouté.')
        }
      } else {
        setUiSuccess('Achat sauvegardé.')
      }

      await fetchAchatData()
      setSelectedRows([])
    } finally {
      setLoading(false)
    }
  }

  const getExportData = (rows: AchatData[]): ExportRow[] => {
    return rows.map((row) => {
      const rowData: ExportRow = {}
      COLUMNS.forEach((col) => {
        if (col.accessor !== 'actions' && col.accessor !== 'select') {
          const key = col.Header.trim()
          const value = row[col.accessor as keyof AchatData]
          if (typeof value === 'number') {
            rowData[key] = col.accessor === 'nbreCaisse' ? value.toFixed(0) : value.toFixed(2)
          } else {
            rowData[key] = value ?? ''
          }
        }
      })
      return rowData
    })
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    if (selectedRows.length === 0) {
      setUiError('Veuillez sélectionner au moins une ligne à exporter.')
      return
    }

    const dataToExport = achatData.filter((d) => selectedRows.includes(d._id))
    const exportData = getExportData(dataToExport)

    const selectedTotals: ExportTotals = dataToExport.reduce(
      (acc, item) => ({
        totalCout: acc.totalCout + Number(item.coutTotal || 0),
        totalProduitWiba: acc.totalProduitWiba + Number(item.produitWiba || 0),
        totalQuantiteOlive: acc.totalQuantiteOlive + Number(item.quantiteOlive || 0),
        totalQuantiteOliveNet: acc.totalQuantiteOliveNet + Number(item.quantiteOliveNet || 0),
        totalNbreCaisse: acc.totalNbreCaisse + Number(item.nbreCaisse || 0),
      }),
      { totalCout: 0, totalProduitWiba: 0, totalQuantiteOlive: 0, totalQuantiteOliveNet: 0, totalNbreCaisse: 0 },
    )

    if (format === 'pdf') {
      customExportToPDF(exportData, "Rapport d'Achats d'Olives", `Exportation de ${dataToExport.length} lignes sélectionnées`, selectedTotals)
    } else {
      const headers = Object.keys(exportData[0]).join(',')
      const csvRows = exportData.map((r) => Object.values(r).join(','))
      const csvContent = [headers, ...csvRows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `achats_olives_export_${new Date().toISOString().substring(0, 10)}.csv`)
      link.click()
      URL.revokeObjectURL(url)
    }

    setSelectedRows([])
  }

  const handlePrint = (row: AchatData) => {
    const content = generateThermalTicketAchat(row)
    printThermal(content)
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Achats Olives" subtitle="Gestion" />

      {uiError && (
        <Alert variant="danger" dismissible onClose={() => setUiError(null)}>
          {uiError}
        </Alert>
      )}
      {uiSuccess && (
        <Alert variant="success" dismissible onClose={() => setUiSuccess(null)}>
          {uiSuccess}
        </Alert>
      )}

      <Row className="g-3">
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <h4 className="header-title mb-0">Historique des Achats 🫒</h4>
                </div>

                <div className="d-flex flex-wrap gap-2">
                  <Button variant="outline-secondary" onClick={fetchAchatData} disabled={loading}>
                    <TbRefresh className="me-1" />
                    Actualiser
                  </Button>

                  <Dropdown>
                    <Dropdown.Toggle variant="success" id="dropdown-export" disabled={selectedRows.length === 0}>
                      <TbDownload className="me-1" /> Exporter ({selectedRows.length})
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleExport('csv')}>Exporter en CSV</Dropdown.Item>
                      <Dropdown.Item onClick={() => handleExport('pdf')}>Exporter en PDF</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>

                  <Button variant="primary" onClick={() => setModalShow(true)} disabled={loading}>
                    <TbPlus className="me-1" /> Nouveau Achat
                  </Button>
                </div>
              </div>

              <Alert variant="info" className="py-2">
                <Row className="text-center g-2">
                  <Col md={3}>
                    <div className="fw-semibold">Olive Brut</div>
                    <div className="fs-5">{allTotals.totalQuantiteOlive.toFixed(2)} kg</div>
                  </Col>
                  <Col md={3}>
                    <div className="fw-semibold">Olive Net</div>
                    <div className="fs-5">{allTotals.totalQuantiteOliveNet.toFixed(2)} kg</div>
                  </Col>
                  <Col md={3}>
                    <div className="fw-semibold">Produit</div>
                    <div className="fs-5 text-success">{allTotals.totalProduitWiba.toFixed(2)} Wiba</div>
                  </Col>
                  <Col md={3}>
                    <div className="fw-semibold">Coût Total</div>
                    <div className="fs-5 text-primary">{allTotals.totalCout.toFixed(2)} DT</div>
                  </Col>
                </Row>
              </Alert>

              <Row className="g-2 align-items-end mb-3">
                <Col lg={4}>
                  <Form.Label className="mb-1">Filtre date (range)</Form.Label>
                  <Flatpickr
                    className="form-control"
                    options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                    value={dateRange}
                    onChange={(dates: Date[]) => {
                      setDateRange(dates)
                      setPagination((p) => ({ ...p, pageIndex: 0 }))
                    }}
                  />
                </Col>

                <Col lg={3}>
                  <Form.Label className="mb-1">Coût min</Form.Label>
                  <FormControl
                    type="number"
                    value={costMin}
                    onChange={(e) => {
                      setCostMin(e.target.value)
                      setPagination((p) => ({ ...p, pageIndex: 0 }))
                    }}
                    placeholder="ex: 100"
                    min={0}
                  />
                </Col>

                <Col lg={3}>
                  <Form.Label className="mb-1">Coût max</Form.Label>
                  <FormControl
                    type="number"
                    value={costMax}
                    onChange={(e) => {
                      setCostMax(e.target.value)
                      setPagination((p) => ({ ...p, pageIndex: 0 }))
                    }}
                    placeholder="ex: 500"
                    min={0}
                  />
                </Col>

                <Col lg={2} className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    className="w-100"
                    onClick={() => {
                      setDateRange([])
                      setCostMin('')
                      setCostMax('')
                      setPagination((p) => ({ ...p, pageIndex: 0 }))
                    }}
                    disabled={loading}
                  >
                    Effacer
                  </Button>
                </Col>
              </Row>

              <Row className="g-2 mb-3">
                <Col md={4}>
                  <Card className="p-2">
                    <div className="fw-semibold mb-1">Filtre courant</div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg="secondary">Lignes: {filtered.length}</Badge>
                      <Badge bg="primary">
                        Page: {pageIndex + 1}/{pageCount}
                      </Badge>
                      <Badge bg="info">Sélection: {selectedRows.length}</Badge>
                    </div>
                  </Card>
                </Col>

                <Col md={8}>
                  <Card className="p-2">
                    <div className="fw-semibold mb-1">Totaux (filtre courant)</div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg="secondary">
                        Olive brut: {fmt2(filtered.reduce((s, x) => s + Number(x.quantiteOlive || 0), 0))} kg
                      </Badge>
                      <Badge bg="secondary">
                        Olive net: {fmt2(filtered.reduce((s, x) => s + Number(x.quantiteOliveNet || 0), 0))} kg
                      </Badge>
                      <Badge bg="success">
                        Produit: {fmt2(filtered.reduce((s, x) => s + Number(x.produitWiba || 0), 0))} Wiba
                      </Badge>
                      <Badge bg="primary">
                        Coût: {fmt2(filtered.reduce((s, x) => s + Number(x.coutTotal || 0), 0))} DT
                      </Badge>
                    </div>
                  </Card>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <CustomDataTable
                  columns={COLUMNS}
                  data={paged}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPrint={handlePrint}
                  selectedRows={selectedRows}
                  toggleRowSelection={toggleRowSelection}
                  toggleAllSelection={toggleAllSelection}
                />
              )}

              <div className="mt-2">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="achats"
                  showInfo
                  previousPage={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                  canPreviousPage={pageIndex > 0}
                  pageCount={pageCount}
                  pageIndex={pageIndex}
                  setPageIndex={(i) => setPagination((p) => ({ ...p, pageIndex: Math.min(Math.max(0, i), pageCount - 1) }))}
                  nextPage={() => setPagination((p) => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }))}
                  canNextPage={pageIndex < pageCount - 1}
                  pageSize={pageSize}
                  setPageSize={(size) => setPagination({ pageIndex: 0, pageSize: size })}
                />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <NouveauAchatModal show={modalShow} handleClose={handleModalClose} handleSave={handleSave} dataToEdit={dataToEdit} />
      <DetailModal show={detailModalShow} handleClose={handleDetailModalClose} data={dataToView} />

      <CaisseDecisionModal
        show={caisseModalShow}
        onHide={() => {
          if (caisseLoading) return
          setCaisseModalShow(false)
          setPendingAchatForCaisse(null)
        }}
        achat={pendingAchatForCaisse}
        onConfirm={handleCaisseConfirm}
        loading={caisseLoading}
      />
    </Container>
  )
}