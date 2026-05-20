'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Dropdown,
  Form,
  FormControl,
  FormLabel,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import {
  TbChevronLeft,
  TbChevronRight,
  TbDownload,
  TbEdit,
  TbEye,
  TbPlus,
  TbPrinter,
  TbRefresh,
  TbTrash,
} from 'react-icons/tb'
import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/flatpickr.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ColumnDef,
  PaginationState,
  Row as TableRow,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'

// ======================================================================
// CONFIG API
// ======================================================================
const API_ACHATS = 'http://localhost:8170/achats'
const API_PROPRIETAIRES = 'http://localhost:8170/proprietaires'
const API_CAISSE = 'http://localhost:8170/caisse'

const POID_CAISSE = 30
const POID_WIBA_DEFAUT = 27
const STANDARD_CAISSE_COMMENTAIRE = "J'ai choisi de ne pas diminuer le montant de la caisse"

// ======================================================================
// DTO
// ======================================================================
export class CreateCaisseDto {
  motif!: string
  montant!: number
  type!: string
  date!: string
  uniqueId!: string
  commentaire!: string
  nomutilisatuer?: string
}

// ======================================================================
// TYPES
// ======================================================================
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

// ======================================================================
// UTILS
// ======================================================================
const fmt2 = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const calculateDerivedValues = (formData: AchatPayload) => {
  const poidZitoun = Number(formData.quantiteOlive || 0)
  const nbreCaisse = Number(formData.nbreCaisse || 0)
  const poidWiba = Number(formData.poidWiba || 0)
  const prixWiba = Number(formData.prixWiba || 0)

  const quantiteOliveNet = Math.max(0, poidZitoun - nbreCaisse * POID_CAISSE)

  let produitWiba = 0
  let coutTotal = 0

  if (quantiteOliveNet > 0 && poidWiba > 0) {
    produitWiba = Math.round((quantiteOliveNet / poidWiba) * 100) / 100
    coutTotal = Math.round(produitWiba * prixWiba * 100) / 100
  }

  return { quantiteOliveNet, produitWiba, coutTotal }
}

// ======================================================================
// EXPORT PDF
// ======================================================================
const customExportToPDF = (
  data: ExportRow[],
  title: string,
  subtitle: string,
  totals: ExportTotals,
): void => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const margin = 14
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - margin * 2

  const cleanNumber = (value: unknown) => {
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

  const formatNumberFR = (n: number, decimals = 2) =>
    n.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })

  const fmtPdf2 = (v: unknown) => formatNumberFR(cleanNumber(v), 2)
  const fmtPdf0 = (v: unknown) => String(Math.round(cleanNumber(v)))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(title, margin, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(subtitle, margin, 22)

  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  doc.line(margin, 26, pageW - margin, 26)

  const body = data.map((row) => [
    String(row['Date Achat'] ?? ''),
    fmtPdf2(row['Olive Brut (kg)']),
    fmtPdf0(row['Nbre Caisse']),
    fmtPdf2(row['Olive Net (kg)']),
    fmtPdf2(row['Poids Wiba (kg)']),
    fmtPdf2(row['Prix Wiba']),
    fmtPdf2(row['Produit (Wiba)']),
    fmtPdf2(row['Coût Total (DT)']),
  ])

  autoTable(doc, {
    startY: 32,
    margin: { left: margin, right: margin, top: 12, bottom: 18 },
    head: [[
      'Date',
      'Olive Brut (kg)',
      'Caisses',
      'Olive Net (kg)',
      'Poids Wiba (kg)',
      'Prix Wiba',
      'Produit (Wiba)',
      'Coût Total (DT)',
    ]],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { halign: 'right' },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  })

  let y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 32) + 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: 12, bottom: 18 },
    head: [['Libellé', 'Valeur']],
    body: [
      ['Total Quantité Olive Brut', `${formatNumberFR(Number(totals.totalQuantiteOlive || 0), 2)} kg`],
      ['Total Quantité Olive Net', `${formatNumberFR(Number(totals.totalQuantiteOliveNet || 0), 2)} kg`],
      ['Total Produit', `${formatNumberFR(Number(totals.totalProduitWiba || 0), 2)} Wiba`],
      ['Total Coût', `${formatNumberFR(Number(totals.totalCout || 0), 2)} DT`],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Page ${i} / ${pageCount}`, pageW / 2, pageH - 10, { align: 'center' })
  }

  doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

// ======================================================================
// IMPRESSION THERMIQUE
// ======================================================================
function generateThermalTicketAchat(a: AchatData): string {
  const W = 32;
  const LINE = '-'.repeat(W);
  const SEP = '*'.repeat(W);

  const center = (text: string): string => {
    const len = [...text].length;
    const padding = Math.max(0, Math.floor((W - len) / 2));
    return ' '.repeat(padding) + text;
  };

  /**
   * Structure optimisée : 
   * FR court (8 chars) | Valeur centrée (10 chars) | AR complet (14 chars)
   */
  const row3 = (left: string, value: string | number, right: string): string => {
    const colFR = 8;  
    const colVal = 10; 
    const colAR = 14; 

    const L = left.padEnd(colFR, ' ').substring(0, colFR);
    const R = right.padStart(colAR, ' ').substring(0, colAR);
    const V = value.toString();
    
    const vPad = Math.max(0, Math.floor((colVal - V.length) / 2));
    const V_centered = ( ' '.repeat(vPad) + V ).padEnd(colVal, ' ');

    return L + V_centered + R;
  };

  const date = a.dateAchat || '';
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const rows: string[] = [];
  
  rows.push(center('🫒 ACHAT OLIVE / شراء زيتون 🫒'));
  rows.push(LINE);
  rows.push(center(`${date} ${time}`));
  rows.push(LINE);

  // FR abrégé (Ol.) | Chiffre au milieu | AR complet
  rows.push(row3(`Ol. brut`, fmt2(a.quantiteOlive), `زيتون خام`));
  rows.push(row3(`Caisses`, Number(a.nbreCaisse || 0), `عدد الصناديق`));
  rows.push(row3(`Ol. net`, fmt2(a.quantiteOliveNet), `زيتون صافي`));
  
  rows.push(LINE);
  
  // rows.push(row3(`Poids W.`, fmt2(a.poidWiba), `وزن الويبة`));
  rows.push(row3(`Prix W.`, fmt2(a.prixWiba), `سعر الويبة`));
  
  rows.push(SEP);
  
  rows.push(row3(`Produit`, fmt2(a.produitWiba), `عدد الويبات`)); 
  rows.push(row3(`TOTAL DT`, fmt2(a.coutTotal), `المجموع الجملي`));
  
  rows.push(SEP);
  rows.push(center('Merci / شكرا'));
  rows.push('\n\n');

  return rows.join('\n');
}

function printThermal(content: string) {
  const printWindow = window.open('', '', 'height=400,width=600')
  if (!printWindow) {
    alert("Impossible d'ouvrir la fenêtre d'impression.")
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
// PAGINATION CUSTOM
// ======================================================================
function RightTablePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  onPageChange,
  onPageSizeChange,
}: {
  pageIndex: number
  pageSize: number
  pageCount: number
  totalRows: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i)

  return (
    <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mt-3">
      <div className="text-muted small">
        Lignes: <span className="fw-semibold">{totalRows}</span>
      </div>

      <Form.Select
        size="sm"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        style={{ width: 90 }}
      >
        {[10, 20, 30, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </Form.Select>

      <div className="d-flex align-items-center gap-1">
        <Button
          variant="default"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex <= 0}
          title="Page précédente"
        >
          <TbChevronLeft />
        </Button>

        <div className="d-flex align-items-center gap-1">
          {pages.map((page) => (
            <Button
              key={`page-${page}`}
              size="sm"
              variant={page === pageIndex ? 'primary' : 'default'}
              onClick={() => onPageChange(page)}
            >
              {page + 1}
            </Button>
          ))}
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= pageCount - 1}
          title="Page suivante"
        >
          <TbChevronRight />
        </Button>
      </div>
    </div>
  )
}

// ======================================================================
// MODAL ADD / EDIT
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
    dateAchat: new Date().toISOString().substring(0, 10),
    quantiteOlive: 0,
    nbreCaisse: 0,
    poidWiba: POID_WIBA_DEFAUT,
    prixWiba: 0,
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

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'dateAchat'
          ? value
          : value === ''
            ? 0
            : parseFloat(value) || 0,
    }))
  }

  const derived = calculateDerivedValues(formData)

  const handleSubmit = async () => {
    if (!(formData.quantiteOlive > 0 && formData.nbreCaisse >= 0 && formData.prixWiba > 0 && formData.poidWiba > 0)) {
      alert('Veuillez vérifier les champs obligatoires.')
      return
    }

    setIsLoading(true)
    try {
      await handleSave(
        {
          dateAchat: formData.dateAchat,
          quantiteOlive: Number(formData.quantiteOlive || 0),
          nbreCaisse: Number(formData.nbreCaisse || 0),
          poidWiba: Number(formData.poidWiba || 0),
          prixWiba: Number(formData.prixWiba || 0),
        },
        dataToEdit?._id,
      )
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
              <FormControl
                type="date"
                name="dateAchat"
                value={formData.dateAchat}
                onChange={handleChange}
                required
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Quantité Olive Brut (kg) <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl
                type="number"
                name="quantiteOlive"
                value={formData.quantiteOlive || ''}
                onChange={handleChange}
                min="0"
                required
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Nombre Caisse <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl
                type="number"
                name="nbreCaisse"
                value={formData.nbreCaisse || ''}
                onChange={handleChange}
                min="0"
                required
              />
              <Form.Text className="text-muted">
                Poids caisses déduit : {Number(formData.nbreCaisse || 0) * POID_CAISSE} kg
              </Form.Text>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>Quantité Olive Net (kg)</FormLabel>
            <Col sm={7}>
              <div className="form-control bg-light fw-bold">{derived.quantiteOliveNet.toFixed(2)} kg</div>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Poids Wiba (kg) <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl
                type="number"
                name="poidWiba"
                value={formData.poidWiba || ''}
                onChange={handleChange}
                min="0.1"
                required
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <FormLabel column sm={5}>
              Prix Wiba <span className="text-danger">*</span>
            </FormLabel>
            <Col sm={7}>
              <FormControl
                type="number"
                name="prixWiba"
                value={formData.prixWiba || ''}
                onChange={handleChange}
                min="0.1"
                required
              />
            </Col>
          </Form.Group>

          <hr />

          <Row className="g-2">
            <Col sm={6}>
              <div className="p-2 border rounded bg-light">
                <div className="text-muted small">Produit estimé</div>
                <div className="fw-bold text-success">{derived.produitWiba.toFixed(2)} Wiba</div>
              </div>
            </Col>
            <Col sm={6}>
              <div className="p-2 border rounded bg-light">
                <div className="text-muted small">Coût total estimé</div>
                <div className="fw-bold text-primary">{derived.coutTotal.toFixed(2)} DT</div>
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
// DETAIL MODAL
// ======================================================================
function DetailModal({
  show,
  handleClose,
  data,
}: {
  show: boolean
  handleClose: () => void
  data: AchatData | null
}) {
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
              <td>{data.dateAchat || 'Date non disponible'}</td>
            </tr>
            <tr>
              <th>Quantité Olive Brut</th>
              <td>{fmt2(data.quantiteOlive)} kg</td>
            </tr>
            <tr>
              <th>Nombre Caisse</th>
              <td>{Number(data.nbreCaisse || 0)}</td>
            </tr>
            <tr>
              <th>Poids caisses déduit</th>
              <td>{fmt2(Number(data.nbreCaisse || 0) * POID_CAISSE)} kg</td>
            </tr>
            <tr>
              <th>Quantité Olive Net</th>
              <td className="fw-bold">{fmt2(data.quantiteOliveNet)} kg</td>
            </tr>
            <tr>
              <th>Poids Wiba</th>
              <td>{fmt2(data.poidWiba)} kg</td>
            </tr>
            <tr>
              <th>Prix Wiba</th>
              <td>{fmt2(data.prixWiba)} DT</td>
            </tr>
            <tr>
              <th>Produit</th>
              <td className="fw-bold text-success">{fmt2(data.produitWiba)} Wiba</td>
            </tr>
            <tr>
              <th>Coût Total</th>
              <td className="fw-bold text-primary">{fmt2(data.coutTotal)} DT</td>
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
// MODAL DECISION CAISSE
// ======================================================================
function CaisseDecisionModal({
  show,
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
    if (!m) {
      alert('Motif obligatoire.')
      return
    }
    onConfirm({ deduct, motif: m })
  }

  const amount = Number(achat?.coutTotal || 0)

  return (
    <Modal show={show} centered backdrop={loading ? 'static' : true}>
      <Modal.Header>
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
        <Button variant="secondary" disabled>
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
  const [isMounted, setIsMounted] = useState(false)

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

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const [caisseModalShow, setCaisseModalShow] = useState(false)
  const [pendingAchatForCaisse, setPendingAchatForCaisse] = useState<AchatData | null>(null)
  const [caisseLoading, setCaisseLoading] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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

      if (!dataRes.ok || !totalsRes.ok) {
        throw new Error("Erreur lors de la récupération des données de l'API.")
      }

      const data: AchatData[] = await dataRes.json()
      const totals: Omit<ExportTotals, 'totalNbreCaisse'> = await totalsRes.json()

      const safeData = Array.isArray(data) ? data : []
      const totalNbreCaisse = safeData.reduce((sum, item) => sum + Number(item.nbreCaisse || 0), 0)

      setAchatData(safeData)
      setAllTotals({
        ...totals,
        totalNbreCaisse,
      })
    } catch (e: unknown) {
      const error = e as Error
      console.error(error)
      setAchatData([])
      setAllTotals({
        totalCout: 0,
        totalProduitWiba: 0,
        totalQuantiteOlive: 0,
        totalQuantiteOliveNet: 0,
        totalNbreCaisse: 0,
      })
      setUiError(error?.message || 'Impossible de charger les achats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAchatData()
  }, [fetchAchatData])

  const filteredData = useMemo(() => {
    return achatData
      .filter((x) => {
        if (dateRange.length === 1) {
          const d = startOfDay(dateRange[0])
          const dt = new Date(`${x.dateAchat}T00:00:00`)
          if (startOfDay(dt).getTime() !== d.getTime()) return false
        }

        if (dateRange.length === 2) {
          const start = startOfDay(dateRange[0])
          const end = addDays(startOfDay(dateRange[1]), 1)
          const dt = new Date(`${x.dateAchat}T00:00:00`)
          if (!(dt >= start && dt < end)) return false
        }

        const min = costMin.trim() === '' ? null : Number(costMin)
        const max = costMax.trim() === '' ? null : Number(costMax)

        if (min !== null && Number.isFinite(min) && Number(x.coutTotal || 0) < min) return false
        if (max !== null && Number.isFinite(max) && Number(x.coutTotal || 0) > max) return false

        return true
      })
      .sort((a, b) => String(b.dateAchat).localeCompare(String(a.dateAchat)))
  }, [achatData, dateRange, costMin, costMax])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredData.length / pagination.pageSize) - 1)

    if (pagination.pageIndex > maxPage) {
      setPagination((prev) => ({
        ...prev,
        pageIndex: maxPage,
      }))
    }
  }, [filteredData.length, pagination.pageIndex, pagination.pageSize])

  const filteredTotals = useMemo(() => {
    return filteredData.reduce(
      (acc, x) => ({
        oliveBrut: acc.oliveBrut + Number(x.quantiteOlive || 0),
        oliveNet: acc.oliveNet + Number(x.quantiteOliveNet || 0),
        produit: acc.produit + Number(x.produitWiba || 0),
        cout: acc.cout + Number(x.coutTotal || 0),
      }),
      {
        oliveBrut: 0,
        oliveNet: 0,
        produit: 0,
        cout: 0,
      },
    )
  }, [filteredData])

  const pagedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filteredData.slice(start, start + pagination.pageSize)
  }, [filteredData, pagination.pageIndex, pagination.pageSize])

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pagination.pageSize))

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleAllSelection = (checked: boolean, rows: AchatData[]) => {
    if (!checked) {
      setSelectedRows([])
      return
    }
    setSelectedRows(rows.map((row) => row._id))
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
    } catch (e: unknown) {
      const error = e as Error
      console.error(error)
      setUiError(error?.message || 'Erreur suppression.')
    } finally {
      setLoading(false)
    }
  }

  const buildCaisseISODate = (selectedDate?: string) => {
    if (!selectedDate) return new Date().toISOString()

    const now = new Date()
    const [year, month, day] = String(selectedDate).split('-').map((p) => parseInt(p, 10))

    if (!year || !month || !day) return now.toISOString()

    now.setFullYear(year, month - 1, day)
    return now.toISOString()
  }

  const createCaisseMovement = async (params: {
    achat: AchatData
    deduct: boolean
    motif: string
  }) => {
    const { achat, deduct, motif } = params
    const montant = deduct ? Number(achat.coutTotal || 0) : 0

    const body = {
      motif,
      montant,
      type: 'debit',
      date: buildCaisseISODate(achat.dateAchat),
      commentaire: deduct ? '' : STANDARD_CAISSE_COMMENTAIRE,
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
          : 'Notification caisse envoyée (montant 0) avec commentaire standard.',
      )

      setCaisseModalShow(false)
      setPendingAchatForCaisse(null)
    } catch (e: unknown) {
      const error = e as Error
      console.error(error)
      setUiError(error?.message || 'Erreur caisse.')
    } finally {
      setCaisseLoading(false)
    }
  }

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

      if (!id && saved?._id) {
        setPendingAchatForCaisse(saved)
        setCaisseModalShow(true)
      }

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
    } catch (e: unknown) {
      const error = e as Error
      console.error(error)
      setUiError(error?.message || 'Erreur sauvegarde.')
    } finally {
      setLoading(false)
    }
  }

  const getExportData = (rows: AchatData[]): ExportRow[] =>
    rows.map((row) => ({
      'Date Achat': row.dateAchat ?? '',
      'Olive Brut (kg)': Number(row.quantiteOlive || 0).toFixed(2),
      'Nbre Caisse': Number(row.nbreCaisse || 0).toFixed(0),
      'Olive Net (kg)': Number(row.quantiteOliveNet || 0).toFixed(2),
      'Poids Wiba (kg)': Number(row.poidWiba || 0).toFixed(2),
      'Prix Wiba': Number(row.prixWiba || 0).toFixed(2),
      'Produit (Wiba)': Number(row.produitWiba || 0).toFixed(2),
      'Coût Total (DT)': Number(row.coutTotal || 0).toFixed(2),
    }))

  const handleExport = (format: 'csv' | 'pdf') => {
    if (selectedRows.length === 0) {
      setUiError('Veuillez sélectionner au moins une ligne à exporter.')
      return
    }

    const dataToExport = filteredData.filter((d) => selectedRows.includes(d._id))
    if (!dataToExport.length) {
      setUiError('Aucune ligne valide sélectionnée pour l’export.')
      return
    }

    const exportData = getExportData(dataToExport)

    const selectedTotals: ExportTotals = dataToExport.reduce(
      (acc, item) => ({
        totalCout: acc.totalCout + Number(item.coutTotal || 0),
        totalProduitWiba: acc.totalProduitWiba + Number(item.produitWiba || 0),
        totalQuantiteOlive: acc.totalQuantiteOlive + Number(item.quantiteOlive || 0),
        totalQuantiteOliveNet: acc.totalQuantiteOliveNet + Number(item.quantiteOliveNet || 0),
        totalNbreCaisse: acc.totalNbreCaisse + Number(item.nbreCaisse || 0),
      }),
      {
        totalCout: 0,
        totalProduitWiba: 0,
        totalQuantiteOlive: 0,
        totalQuantiteOliveNet: 0,
        totalNbreCaisse: 0,
      },
    )

    if (format === 'pdf') {
      customExportToPDF(
        exportData,
        "Rapport d'Achats d'Olives",
        `Exportation de ${dataToExport.length} lignes sélectionnées`,
        selectedTotals,
      )
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

  const columns = useMemo<ColumnDef<AchatData>[]>(() => [
    {
      id: 'select',
      header: () => {
        const isAllSelected =
          pagedRows.length > 0 &&
          pagedRows.every((row) => selectedRows.includes(row._id))

        return (
          <div className="d-flex justify-content-center">
            <Form.Check
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => toggleAllSelection(e.target.checked, pagedRows)}
              title="Sélectionner tout"
            />
          </div>
        )
      },
      cell: ({ row }: { row: TableRow<AchatData> }) => (
        <div className="d-flex justify-content-center">
          <Form.Check
            type="checkbox"
            checked={selectedRows.includes(row.original._id)}
            onChange={() => toggleRowSelection(row.original._id)}
            title="Sélectionner"
          />
        </div>
      ),
    },
    {
      header: 'Date Achat',
      accessorKey: 'dateAchat',
      cell: ({ row }: { row: TableRow<AchatData> }) => row.original.dateAchat || '-',
    },
    {
      header: 'Olive Brut (kg)',
      accessorKey: 'quantiteOlive',
      cell: ({ row }: { row: TableRow<AchatData> }) => fmt2(Number(row.original.quantiteOlive || 0)),
    },
    {
      header: 'Nbre Caisse',
      accessorKey: 'nbreCaisse',
      cell: ({ row }: { row: TableRow<AchatData> }) => (
       
          Number(row.original.nbreCaisse || 0)
       
      ),
    },
{
  header: 'Olive Net (kg)',
  accessorKey: 'quantiteOliveNet',
  cell: ({ row }: { row: TableRow<AchatData> }) => (
    <span className="badge rounded-pill border fw-semibold text-body bg-body-secondary">
      {fmt2(Number(row.original.quantiteOliveNet || 0))} kg
    </span>
  ),
},
    {
      header: 'Prix Wiba',
      accessorKey: 'prixWiba',
      cell: ({ row }: { row: TableRow<AchatData> }) => (
        <Badge bg="warning" text="dark" pill className="border">
          {fmt2(Number(row.original.prixWiba || 0))} DT
        </Badge>
      ),
    },
    {
      header: 'Produit Wiba',
      accessorKey: 'produitWiba',
      cell: ({ row }: { row: TableRow<AchatData> }) => (
        <Badge bg="success-subtle" text="success" pill className="border">
          {fmt2(Number(row.original.produitWiba || 0))} Wiba
        </Badge>
      ),
    },
    {
      header: 'Prix Final',
      accessorKey: 'coutTotal',
      cell: ({ row }: { row: TableRow<AchatData> }) => (
        <Badge bg="primary-subtle" text="primary" pill className="border">
          {fmt2(Number(row.original.coutTotal || 0))} DT
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<AchatData> }) => {
        const achat = row.original

        return (
          <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleView(achat)}
              title="Voir détails"
            >
              <TbEye className="fs-lg" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrint(achat)}
              title="Imprimer ticket"
            >
              <TbPrinter className="fs-lg" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handleEdit(achat)}
              title="Modifier"
            >
              <TbEdit className="fs-lg" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handleDelete(achat._id)}
              title="Supprimer"
            >
              <TbTrash className="fs-lg" />
            </Button>
          </div>
        )
      },
    },
  ], [pagedRows, selectedRows])

  const table = useReactTable({
    data: pagedRows,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount,
  })

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
                    <Dropdown.Toggle
                      variant="success"
                      id="dropdown-export"
                      disabled={selectedRows.length === 0}
                    >
                      <TbDownload className="me-1" /> Exporter ({selectedRows.length})
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleExport('csv')}>Exporter en CSV</Dropdown.Item>
                      <Dropdown.Item onClick={() => handleExport('pdf')}>Exporter en PDF</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setDataToEdit(null)
                      setModalShow(true)
                    }}
                    disabled={loading}
                  >
                    <TbPlus className="me-1" /> Nouveau Achat
                  </Button>
                </div>
              </div>

              <Alert variant="info" className="py-2">
                <Row className="text-center g-2">
                  <Col md={3}>
                    <div className="fw-semibold">Olive Brut</div>
                    <div className="fs-5">{fmt2(allTotals.totalQuantiteOlive)} kg</div>
                  </Col>
                  <Col md={3}>
                    <div className="fw-semibold">Olive Net</div>
                    <div className="fs-5">{fmt2(allTotals.totalQuantiteOliveNet)} kg</div>
                  </Col>
                  <Col md={3}>
                    <div className="fw-semibold">Produit</div>
                    <div className="fs-5 text-success">{fmt2(allTotals.totalProduitWiba)} Wiba</div>
                  </Col>
                  <Col md={3}>
                    <div className="fw-semibold">Coût Total</div>
                    <div className="fs-5 text-primary">{fmt2(allTotals.totalCout)} DT</div>
                  </Col>
                </Row>
              </Alert>

              <Row className="g-2 align-items-end mb-3">
                <Col lg={4}>
                  <Form.Label className="mb-1">Filtre date (range)</Form.Label>
                  {isMounted ? (
                    <Flatpickr
                      className="form-control"
                      options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                      value={dateRange}
                      onChange={(dates: Date[]) => {
                        setDateRange(dates)
                        setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                      }}
                    />
                  ) : (
                    <FormControl disabled placeholder="Chargement..." />
                  )}
                </Col>

                <Col lg={3}>
                  <Form.Label className="mb-1">Coût min</Form.Label>
                  <FormControl
                    type="number"
                    value={costMin}
                    onChange={(e) => {
                      setCostMin(e.target.value)
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
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
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                    }}
                    placeholder="ex: 500"
                    min={0}
                  />
                </Col>

                <Col lg={2}>
                  <Button
                    variant="secondary"
                    className="w-100"
                    onClick={() => {
                      setDateRange([])
                      setCostMin('')
                      setCostMax('')
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                    }}
                    disabled={loading}
                  >
                    Effacer
                  </Button>
                </Col>
              </Row>

              <Row className="g-2 mb-3">
                {/* <Col md={4}>
                  <Card className="p-2">
                    <div className="fw-semibold mb-1">Filtre courant</div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg="secondary">Lignes: {filteredData.length}</Badge>
                      <Badge bg="primary">Page: {pagination.pageIndex + 1}/{pageCount}</Badge>
                      <Badge bg="info">Sélection: {selectedRows.length}</Badge>
                    </div>
                  </Card>
                </Col> */}

                <Col md={8}>
                  <Card className="p-2">
                    <div className="fw-semibold mb-1">Totaux (filtre courant)</div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg="secondary">Olive brut: {fmt2(filteredTotals.oliveBrut)} kg</Badge>
                      <Badge bg="secondary">Olive net: {fmt2(filteredTotals.oliveNet)} kg</Badge>
                      <Badge bg="success">Produit: {fmt2(filteredTotals.produit)} Wiba</Badge>
                      <Badge bg="primary">Coût: {fmt2(filteredTotals.cout)} DT</Badge>
                    </div>
                  </Card>
                </Col>
              </Row>

              <div className="table-responsive">
                <DataTable<AchatData>
                  table={table}
                  emptyMessage="Aucun achat d'olive enregistré."
                  loading={loading}
                />
              </div>

              {!loading && (
                <RightTablePagination
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  pageCount={pageCount}
                  totalRows={filteredData.length}
                  onPageChange={(page) => {
                    if (page < 0 || page >= pageCount) return
                    setPagination((prev) => ({ ...prev, pageIndex: page }))
                  }}
                  onPageSizeChange={(size) => {
                    setPagination({
                      pageIndex: 0,
                      pageSize: size,
                    })
                  }}
                />
              )}

              {loading && (
                <div className="text-center py-3">
                  <Spinner animation="border" />
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <NouveauAchatModal
        show={modalShow}
        handleClose={handleModalClose}
        handleSave={handleSave}
        dataToEdit={dataToEdit}
      />

      <DetailModal
        show={detailModalShow}
        handleClose={handleDetailModalClose}
        data={dataToView}
      />

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