'use client'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
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
import 'flatpickr/dist/flatpickr.css'
import { useCallback, useEffect, useState } from 'react'
import Flatpickr from 'react-flatpickr'
import { CgUnavailable } from 'react-icons/cg'
import { LuSearch } from 'react-icons/lu'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Col,
  Container,
  Dropdown,
  Modal,
  OverlayTrigger,
  Row,
  Tooltip,
} from 'react-bootstrap'
import {
  TbCash,
  TbChartBar,
  TbEdit,
  TbEye,
  TbFileExport,
  TbNote,
  TbPlus,
  TbPrinter,
  TbQrcode,
  TbRefresh,
  TbTrash,
} from 'react-icons/tb'
import CustomerEditModal from '../client/components/CustomerEditModal'
import CustomerModalViewDetail from '../client/components/CustomerModalViewDetail'
import CustomerModal from './components/CustomerModal'
import { exportToPDF, exportToXLSX } from './components/TableExporter'
import withReactContent from 'sweetalert2-react-content'
import Swal, { SweetAlertOptions } from 'sweetalert2'
import QRCode from 'qrcode'

type CustomerType = {
  _id: string
  numCIN: string
  nomPrenom: string
  commentaire: string
  numTelephone: number
  type: string
  dateCreation?: string | null
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
  nomutilisatuer: string
  depotStatus?: 'pret' | 'en_cours'
  aImprimer?: boolean
  publicTrackingToken?: string
  trackingEnabled?: boolean
}

type DailyStatsType = {
  date: string
  totalQuantiteHuile: number
  totalQuantiteOlive: number
  totalPrixFinal: number
  clientCount: number
  clientsPayes: number
  clientsNonPayes: number
  totalPrixpayer: number
  totalPrixnonpayer: number
}

const columnHelper = createColumnHelper<CustomerType>()
const ReactSwal = withReactContent(Swal)
const API_BASE_URL = 'http://192.168.1.15:8170'

const showAlert = (options: SweetAlertOptions) => {
  ReactSwal.fire({
    buttonsStyling: false,
    customClass: { confirmButton: 'btn btn-primary mt-2' },
    ...options,
  })
}

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
  } catch {
    return 'DD/MM/YYYY'
  }
}

const normalize = (str: string | undefined | null) =>
  (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const normalizePhone = (value: string | number | undefined | null) =>
  (value ?? '').toString().replace(/\D/g, '')

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

const smartMatch = (text: string, term: string): boolean => {
  const normText = normalize(text)
  const normTerm = normalize(term)

  if (!normText || !normTerm) return false
  if (normText.includes(normTerm)) return true

  const textWords = normText.split(' ').filter(Boolean)
  const termWords = normTerm.split(' ').filter(Boolean)

  if (termWords.length > 1) {
    return termWords.every((word) => textWords.some((tw) => tw.includes(word)))
  }

  if (normTerm.length < 6) return false

  const dist = levenshtein(normText, normTerm)
  const tolerance = Math.floor(normTerm.length * 0.4)

  return dist <= tolerance
}

const LINE_LENGTH = 32
const LOGO_PLACEHOLDER = '     🌿 معصرة - 🌿      '

const generateThermalTicketContent = (customer: CustomerType): string => {
  const ticketId = customer._id ?? 'TEMP_ID'
  const creationDate = customer.dateCreation ?? new Date().toISOString()
  const content: string[] = []
  const W = LINE_LENGTH

  const LINE = '-'.repeat(W)
  const SEP = '*'.repeat(W)

  const center = (text: string): string => {
    const len = [...text].length
    const padding = Math.max(0, Math.floor((W - len) / 2))
    return ' '.repeat(padding) + text
  }

  const bi = (fr: string, ar: string): string => {
    const frLen = [...fr].length
    const arLen = [...ar].length
    const total = frLen + arLen
    if (total >= W) return fr.slice(0, W)
    return fr + ' '.repeat(W - total) + ar
  }

  const date = formatDateDDMMYYYY1(creationDate)
  const time = new Date(creationDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const num = `#${ticketId.slice(-6)}`
  const olive = customer.quantiteOliveNet?.toFixed(2) ?? '-'
  const huile = customer.quantiteHuile?.toFixed(2) ?? '-'
  const masseVolumiqueHuile = 0.918

  const huileKg = customer.quantiteHuile ?? 0
  const huileLitres = huileKg / masseVolumiqueHuile
  const totalGalba = huileLitres / 10

  const galbaEntier = Math.floor(totalGalba)
  const resteGalba = (totalGalba - galbaEntier).toFixed(1)
  const huile_converti = huileLitres.toFixed(1)
  const GALBA = `${galbaEntier} GALBA (${resteGalba} فاصل)`
  const kattou3 = customer.kattou3?.toFixed(1) ?? '-'
  const nisba = customer.nisba?.toFixed(1) ?? '-'
  const nom = customer.nomPrenom.slice(0, W)
  const tel = customer.numTelephone ?? '-'
  const caissier = customer?.nomutilisatuer
    ? customer.nomutilisatuer.split('@')[0]
    : '—'

  content.push(center(LOGO_PLACEHOLDER))
  content.push(LINE)
  content.push(`${num} ${date} ${time} ${caissier}`)
  content.push(bi('Client', 'الحريف'))
  content.push(center(nom))
  content.push(bi('Téléphone', 'الهاتف'))
  content.push(center(String(tel)))
  content.push(LINE)
  content.push(bi('Olive', 'زيتون'))
  content.push(center(String(`${olive}kg`)))
  content.push(bi('Huile', 'زيت'))
  content.push(center(String(`${huile}kg`)))
  content.push(LINE)
  content.push(bi('القطوع', 'القطوع'))
  content.push(center(String(`${kattou3}%`)))
  content.push(bi('النسبة ', 'النسبة '))
  content.push(center(String(`${nisba} %`)))
  content.push(bi('عدد القلبات ', 'اللتر'))
  content.push(center(String(`${huile_converti} L = ${GALBA} `)))

  if (customer.prixFinal && customer.prixKg) {
    content.push(SEP)
    content.push(bi('Montant total', 'المبلغ الجملي'))
    content.push(center(`########### <b>${customer.prixFinal.toFixed(2)} TND </b> ########`))
    content.push(SEP)
  } else {
    content.push(center('---------'))
    content.push(LINE)
  }

  content.push(center('سعداء بخدمتكم'))
  content.push(center('52 417 792-52 112 478'))
  content.push(LINE)
  content.push(center('✂ مركز توزيع الزيت ✂'))
  content.push(`${num} ${date}`)
  content.push(center(nom))
  content.push(center(`huile: ${huile} Kg`))
  content.push(center(`GALBA: ${galbaEntier} + ${resteGalba} L`))
  content.push(LINE)
  content.push(center('✂ CAISSE / صندوق ✂'))
  content.push(`${num} ${date}`)
  content.push(center(nom))
  content.push(center(`Olive: ${olive} Kg`))
  content.push(center(`huile: ${huile} Kg`))

  if (customer.prixFinal && customer.prixKg) {
    content.push(SEP)
    content.push(bi('Montant total', 'المبلغ الجملي'))
    content.push(center(`${customer.prixFinal.toFixed(2)} TND`))
    content.push(SEP)
  } else {
    content.push(center('------'))
  }

  content.push('')
  return content.join('\n')
}

const CustomersCard = () => {
  const [data, setData] = useState<CustomerType[]>([])
  const [filteredData, setFilteredData] = useState<CustomerType[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()])
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
  const [user, setUser] = useState<any>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [loading, setLoading] = useState(false)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<Date | null>(new Date())
  const [customerToPay, setCustomerToPay] = useState<CustomerType | null>(null)

  const getPublicTrackingUrl = useCallback((customer: CustomerType) => {
    if (!customer?.publicTrackingToken) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/suivi/${customer.publicTrackingToken}`
  }, [])

const handlePrintQrTicket = useCallback(async (customer: CustomerType) => {
  try {
    const trackingUrl = getPublicTrackingUrl(customer)

    if (!trackingUrl) {
      showAlert({
        icon: 'warning',
        text: 'Aucun lien de suivi disponible pour ce client.',
        confirmButtonText: 'OK',
      })
      return
    }

    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 180,
      margin: 1,
    })

    const isTrackingActive =
      customer.status !== 'payé' && customer.trackingEnabled !== false

    const printWindow = window.open('', '', 'height=400,width=600')

    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression. Veuillez vérifier les bloqueurs de pop-up.")
      return
    }

    const creationDate = customer.dateCreation ?? new Date().toISOString()
    const date = formatDateDDMMYYYY1(creationDate)
    const time = new Date(creationDate).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const num = `#${customer._id.slice(-6)}`

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket QR Suivi</title>
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
            .ticket {
              width: 100%;
            }
            .center {
              text-align: center;
            }
            .line {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .bold {
              font-weight: bold;
            }
            .small {
              font-size: 8pt;
            }
            .qr {
              display: block;
              margin: 8px auto;
              width: 180px;
              height: 180px;
              object-fit: contain;
            }
            .url {
              word-break: break-all;
              font-size: 7pt;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="center bold">🌿 معصرة - QR Tracking 🌿</div>
            <div class="line"></div>

            <div class="center">${num} ${date} ${time}</div>
            <div class="center bold">${customer.nomPrenom ?? '-'}</div>
            <div class="center">Tél: ${customer.numTelephone ?? '-'}</div>

            <div class="line"></div>

            <div class="center bold">رابط تتبع الحريف</div>
            <img class="qr" src="${qrDataUrl}" alt="QR Code" />

            <div class="center bold">
              Statut QR: ${isTrackingActive ? 'Actif' : 'Désactivé'}
            </div>
            <div class="center small">
              ${isTrackingActive ? 'Le client peut encore suivre sa commande' : 'Lien fermé après paiement'}
            </div>

            <div class="line"></div>
            <div class="url">${trackingUrl}</div>
            <div class="line"></div>

            <div class="center">سعداء بخدمتكم</div>
          </div>

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
  } catch (error) {
    console.error('Erreur impression QR:', error)
    showAlert({
      icon: 'error',
      text: "Erreur lors de l'impression du QR code",
      confirmButtonText: 'OK',
    })
  }
}, [getPublicTrackingUrl])

  const calculateDailyStats = useCallback(
    (customers: CustomerType[], dateFilter: Date[] = []) => {
      let clientsToCalculate = customers

      if (dateFilter.length > 0) {
        if (dateFilter.length === 1) {
          const d = dateFilter[0]
          clientsToCalculate = clientsToCalculate.filter((item) => {
            if (!item.dateCreation) return false
            const dt = new Date(item.dateCreation)
            return (
              dt.getFullYear() === d.getFullYear() &&
              dt.getMonth() === d.getMonth() &&
              dt.getDate() === d.getDate()
            )
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

      const totalQuantiteHuile = clientsToCalculate.reduce(
        (sum, client) => sum + (client.quantiteHuile || 0),
        0,
      )
      const totalQuantiteOlive = clientsToCalculate.reduce(
        (sum, client) => sum + (client.quantiteOliveNet || 0),
        0,
      )
      const totalPrixFinal = clientsToCalculate.reduce(
        (sum, client) => sum + (client.prixFinal || 0),
        0,
      )
      const clientCount = clientsToCalculate.length
      const clientsPayes = clientsToCalculate.filter(
        (client) => client.status === 'payé',
      ).length
      const clientsNonPayes = clientCount - clientsPayes

      const totalPrixpayer = clientsToCalculate.reduce((sum, client) => {
        const prixFinal = client.prixFinal ?? 0
        if (client.status === 'payé') return sum + prixFinal
        return sum
      }, 0)

      const totalPrixnonpayer = clientsToCalculate.reduce((sum, client) => {
        const prixFinal = client.prixFinal ?? 0
        if (client.status !== 'payé') return sum + prixFinal
        return sum
      }, 0)

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
    },
    [],
  )

  useEffect(() => {
    const rawUser =
      typeof window !== 'undefined' ? localStorage.getItem('user') : null
    setUser(rawUser ? JSON.parse(rawUser) : null)
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients`)
      if (!res.ok) throw new Error('Fetch clients failed')
      const json = await res.json()

      const normalized: CustomerType[] = (Array.isArray(json) ? json : []).map(
        (c: any) => ({
          ...c,
          numCIN: c.numCIN ?? '',
          dateCreation: c.dateCreation ? new Date(c.dateCreation).toISOString() : null,
          depotStatus: Number(c.quantiteHuile ?? 0) > 0 ? 'pret' : 'en_cours',
          publicTrackingToken: c.publicTrackingToken ?? '',
          trackingEnabled:
            typeof c.trackingEnabled === 'boolean'
              ? c.trackingEnabled
              : c.status !== 'payé',
        }),
      )

      setData(normalized)
      setFilteredData(normalized)
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

  useEffect(() => {
    if (data.length > 0) {
      const stats = calculateDailyStats(data, selectedDates)
      setDailyStats(stats)
    }
  }, [selectedDates, data, calculateDailyStats])

  const handleClientSaved = async () => {
    await fetchClients()
    setPagination((p: any) => ({ ...p, pageIndex: 0 }))
  }

  const handleConfirmPayment = async () => {
    if (!customerToPay || !selectedPaymentDate) return

    try {
      const body = {
        motif: 'Payment Client',
        uniqueId: customerToPay._id,
        montant: customerToPay.prixFinal,
        nomutilisatuer: customerToPay.nomutilisatuer,
        dateCreation: customerToPay.dateCreation,
        type: 'credit',
        date: selectedPaymentDate.toISOString(),
        commentaire: `payment de Client : ${customerToPay.nomPrenom} Téléphone :${customerToPay?.numTelephone ?? ''} - quantiteHuileNet : ${customerToPay.quantiteHuile}
        quantiteOliveNet : ${customerToPay.quantiteOliveNet} - date de création : ${formatDateDDMMYYYY(customerToPay.dateCreation)}`,
      }

      await fetch(`${API_BASE_URL}/caisse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await fetch(`${API_BASE_URL}/clients/${customerToPay._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'payé' }),
      })

      setShowPaymentModal(false)
      setCustomerToPay(null)
      await fetchClients()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du paiement du client')
    }
  }

  const handleTogglePaymentStatus = async (customer: CustomerType) => {
    const newStatus: 'payé' | 'non payé' =
      customer.status === 'payé' ? 'non payé' : 'payé'

    if (newStatus === 'payé') {
      setCustomerToPay(customer)
      setSelectedPaymentDate(new Date())
      setShowPaymentModal(true)
      return
    }

    const confirmed = window.confirm(
      `Voulez-vous vraiment marquer ce client comme "${newStatus}" ?\n\n` +
        `Une alerte sera envoyée à la caisse et la ligne de paiement sera marquée en attente de correction.`,
    )

    if (!confirmed) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/${customer._id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(
          errorText || 'Erreur lors de la mise à jour du statut client',
        )
      }

      await fetchClients()

      alert(
        'Le client a été marqué comme non payé. Une alerte a été envoyée à la caisse.',
      )
    } catch (error) {
      console.error('Erreur changement statut client:', error)
      alert('Erreur lors du changement de statut')
    }
  }

  useEffect(() => {
    let result = [...data]

    if (globalFilter.trim() !== '') {
      const rawFilter = globalFilter.trim()
      const normalizedFilter = normalize(rawFilter)
      const terms = normalizedFilter.split(' ').filter(Boolean)
      const phoneSearch = normalizePhone(rawFilter)

      result = result.filter((item: CustomerType) => {
        const name = normalize(item.nomPrenom)
        const nameReversed = name.split(' ').reverse().join(' ')
        const phone = normalizePhone(item.numTelephone)
        const id = normalize(String(item._id))

        const directFullNameMatch =
          name.includes(normalizedFilter) || nameReversed.includes(normalizedFilter)

        const directPhoneMatch = phoneSearch ? phone.includes(phoneSearch) : false
        const directIdMatch = id.includes(normalizedFilter)

        const termsMatch =
          terms.length === 0
            ? true
            : terms.every((t) => {
                const isHexLike = /^[0-9a-f]+$/.test(t) && t.length >= 3
                if (isHexLike) return id.includes(t)

                return (
                  smartMatch(name, t) ||
                  smartMatch(nameReversed, t) ||
                  phone.includes(t.replace(/\D/g, '')) ||
                  id.includes(t)
                )
              })

        return (
          directFullNameMatch || directPhoneMatch || directIdMatch || termsMatch
        )
      })
    }

    if (selectedDates.length === 1) {
      const d = selectedDates[0]
      result = result.filter((item: CustomerType) => {
        if (!item.dateCreation) return false
        const dt = new Date(item.dateCreation)
        return (
          dt.getFullYear() === d.getFullYear() &&
          dt.getMonth() === d.getMonth() &&
          dt.getDate() === d.getDate()
        )
      })
    } else if (selectedDates.length === 2) {
      const [start, end] = selectedDates
      result = result.filter((item: CustomerType) => {
        if (!item.dateCreation) return false
        const dt = new Date(item.dateCreation)
        return dt >= start && dt <= end
      })
    }

    setFilteredData(result)
    setPagination((p: any) => ({ ...p, pageIndex: 0 }))
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
      header: 'اسم الفلاح',
      cell: (info) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold">{info.getValue()}</span>
          <small className="text-muted d-md-none">
            {info.row.original.numTelephone}
          </small>
        </div>
      ),
    }),

    columnHelper.accessor('nombreCaisses', {
      header: 'ع.ص',
      cell: (info) => <span>({info.getValue() ?? 0})</span>,
      meta: {
        thClassName: 'd-none d-md-table-cell',
        tdClassName: 'd-none d-md-table-cell',
      },
    }),

    columnHelper.accessor('quantiteOliveNet', {
      header: 'الزيتون NET',
      cell: (info) => <span>{info.getValue() ?? 0}KG</span>,
      meta: {
        thClassName: 'd-none d-md-table-cell',
        tdClassName: 'd-none d-md-table-cell',
      },
    }),

    columnHelper.accessor('quantiteHuile', {
      header: 'الزيت NET',
      cell: (info) => <span className="fw-semibold">{info.getValue() ?? 0}KG</span>,
      meta: {
        thClassName: 'd-none d-md-table-cell',
        tdClassName: 'd-none d-md-table-cell',
      },
    }),

    columnHelper.accessor('kattou3', {
      header: 'القطوع',
      cell: (info) => (
        <span>{info.getValue() != null ? Number(info.getValue()).toFixed(2) : 'N/A'} %</span>
      ),
      meta: {
        thClassName: 'd-none d-lg-table-cell',
        tdClassName: 'd-none d-lg-table-cell',
      },
    }),

    columnHelper.accessor('nisbaReelle', {
      header: 'النسبة %',
      cell: (info) => (
        <Badge bg="success">
          {info.getValue() != null ? Number(info.getValue()).toFixed(2) : 'N/A'}%
        </Badge>
      ),
      meta: {
        thClassName: 'd-none d-lg-table-cell',
        tdClassName: 'd-none d-lg-table-cell',
      },
    }),

    columnHelper.accessor('prixFinal', {
      header: 'الثمن',
      cell: (info) => (
        <Badge bg="secondary">
          {info.getValue() != null ? Number(info.getValue()).toFixed(2) : 'N/A'}TND
        </Badge>
      ),
      meta: {
        thClassName: 'd-none d-md-table-cell',
        tdClassName: 'd-none d-md-table-cell',
      },
    }),

    columnHelper.accessor('commentaire', {
      header: 'الملاحظات',
      cell: (info) => {
        const comment = info.getValue()
        if (!comment || String(comment).trim() === '') {
          return <span className="text-muted">-</span>
        }

        return (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`tooltip-comment-${info.row.id}`}>{String(comment)}</Tooltip>
            }
          >
            <span style={{ cursor: 'help' }}>
              <TbNote className="fs-lg text-info" />
            </span>
          </OverlayTrigger>
        )
      },
      meta: {
        thClassName: 'd-none d-lg-table-cell',
        tdClassName: 'd-none d-lg-table-cell',
      },
    }),

    columnHelper.accessor('numTelephone', {
      header: 'الهاتف',
      meta: {
        thClassName: 'd-none d-md-table-cell',
        tdClassName: 'd-none d-md-table-cell',
      },
    }),

    columnHelper.accessor('dateCreation', {
      header: 'التاريخ ',
      cell: (info) => formatDateDDMMYYYY(info.getValue() as string | null),
      meta: {
        thClassName: 'd-none d-md-table-cell',
        tdClassName: 'd-none d-md-table-cell',
      },
    }),

    columnHelper.accessor('status', {
      header: 'الدفع',
      cell: (info) => (
        <Badge bg={info.getValue() === 'payé' ? 'success' : 'danger'}>
          {info.getValue() === 'payé' ? 'Payé' : 'Non Payé'}
        </Badge>
      ),
    }),

    columnHelper.accessor('depotStatus', {
      header: 'حالة الإيداع',
      cell: (info) => {
        const isReady = info.getValue() === 'pret'
        return (
          <Badge bg={isReady ? 'success' : 'warning'} text={isReady ? undefined : 'dark'}>
            {isReady ? 'Prêt' : 'En cours'}
          </Badge>
        )
      },
    }),

    columnHelper.accessor('nomutilisatuer', {
      header: 'تم الإنشاء بواسطة',
      cell: (info) => {
        const valeur = info.getValue()
        if (!valeur || typeof valeur !== 'string') return <Badge bg="warning">Non défini</Badge>
        const indexArobase = valeur.indexOf('@')
        if (indexArobase === -1) return <Badge bg="warning">{valeur}</Badge>
        return <Badge bg="warning">{valeur.slice(0, indexArobase)}</Badge>
      },
      meta: {
        thClassName: 'd-none d-lg-table-cell',
        tdClassName: 'd-none d-lg-table-cell',
      },
    }),

    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<CustomerType> }) => {
        const customer = row.original
        const isPaid = customer.status === 'payé'
        const hasPrinted = customer?.aImprimer

        return (
          <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setShowModalDetail(true)
                setSelectedCustomer(customer)
              }}
              title="Voir détails"
            >
              <TbEye className="fs-lg" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setShowModalEdit(true)
                setSelectedCustomer(customer)
              }}
              title="Modifier"
            >
              <TbEdit className="fs-lg" />
            </Button>

            <Button
              variant={isPaid ? 'success' : 'danger'}
              size="sm"
              onClick={() => handleTogglePaymentStatus(customer)}
              title={`Statut: ${customer.status}. Cliquer pour changer`}
              className="position-relative"
            >
              <TbCash className="fs-lg" />
              <span
                className={`position-absolute top-0 start-100 translate-middle p-1 border border-light rounded-circle ${
                  isPaid ? 'bg-success' : 'bg-danger'
                }`}
              >
                <span className="visually-hidden">Statut</span>
              </span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrintTicket(customer)}
              disabled={!isPaid}
              title={!isPaid ? "Impossible d'imprimer - Client non payé" : 'Imprimer le ticket'}
            >
              <TbPrinter className="fs-lg" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrintQrTicket(customer)}
              title="Imprimer ticket QR"
            >
              <TbQrcode className="fs-lg" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setShowDeleteModal(true)
                setSelectedRowIds({ [customer._id]: true })
              }}
              disabled={isPaid && user?.roles?.includes('caissier')}
              title={hasPrinted ? 'Impossible de supprimer - Déjà imprimé' : 'Supprimer'}
            >
              <TbTrash className="fs-lg" />
            </Button>
          </div>
        )
      },
    },
  ] as any

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
    enableRowSelection: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = filteredData.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalItems)

  const handleDelete = async () => {
    const selectedIds = Object.keys(selectedRowIds)
    if (!selectedIds.length) return

    setLoading(true)
    setIsDeleting(true)

    try {
      const responses = await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'DELETE',
          }),
        ),
      )

      const hasError = responses.some((res) => !res.ok)
      if (hasError) {
        throw new Error('Erreur lors de la suppression')
      }

      setSelectedRowIds({})
      await fetchClients()

      showAlert({
        icon: 'success',
        text:
          selectedIds.length > 1
            ? 'Clients supprimés avec succès !'
            : 'Client supprimé avec succès !',
        showConfirmButton: false,
        timer: 1500,
        position: 'top-end',
      })

      setShowDeleteModal(false)
      setShowMultiDeleteModal(false)
    } catch (err) {
      console.error(err)
      showAlert({
        icon: 'error',
        text: 'Erreur : impossible de supprimer le client',
        confirmButtonText: 'OK',
      })
    } finally {
      setLoading(false)
      setIsDeleting(false)
    }
  }

  const handleMultiDelete = () => {
    const selectedCount = Object.keys(selectedRowIds).length
    if (selectedCount === 0) {
      alert('Veuillez sélectionner au moins un client à supprimer.')
      return
    }
    setShowMultiDeleteModal(true)
  }

  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = Object.keys(selectedRowIds).length
  const setPageSize = table.setPageSize

  return (
    <Container fluid>
      <PageBreadcrumb title="Clients" />

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

      <Row className="mb-4 align-items-center">
        <Col />
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" onClick={fetchClients} size="sm">
            <TbRefresh className="me-1" /> Actualiser
          </Button>
        </Col>
      </Row>

      <Row className="justify-content-md-center g-2 g-md-3">
        <Col xs={12} md>
          <Card className="border-light p-2">
            <h6 className="mb-1">Clients payés / total (Aujourd'hui)</h6>
            <h4 className="mb-0 text-success">
              {dailyStats?.clientsPayes || 0} / {dailyStats?.clientCount || 0} = {dailyStats?.totalPrixpayer?.toFixed(2)}DT
            </h4>
          </Card>
        </Col>

        <Col xs={12} md>
          <Card className="border-light p-2">
            <h6 className="mb-1">Clients non payés / total (Aujourd'hui)</h6>
            <h4 className="mb-0 text-danger">
              {dailyStats?.clientsNonPayes || 0} / {dailyStats?.clientCount || 0}= {dailyStats?.totalPrixnonpayer?.toFixed(2)}DT
            </h4>
          </Card>
        </Col>

        <Col xs={12} md>
          <Card className="border-light p-2">
            <h6 className="mb-1">Quantité Huile (kg)</h6>
            <h4 className="mb-0 text-primary">
              {dailyStats?.totalQuantiteHuile?.toFixed(2) || '0.00'} KG
            </h4>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-stretch align-items-lg-center">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button className="btn btn-primary" size="sm" onClick={() => setShowModal(true)}>
                  <TbPlus className="fs-lg" /> Ajouter
                </Button>

                <CustomerModal
                  show={showModal}
                  onHide={() => setShowModal(false)}
                  onClientSaved={handleClientSaved}
                  user={user}
                  clients={data}
                />

                {selectedCount > 0 && (
                  <Button variant="danger" size="sm" onClick={handleMultiDelete}>
                    <TbTrash className="fs-lg" /> Supprimer ({selectedCount})
                  </Button>
                )}

                <Button variant="info" size="sm" onClick={() => setShowStats(!showStats)}>
                  <TbChartBar className="fs-lg" /> Statistiques
                </Button>

                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-export-data">
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
                        exportToXLSX(rows as any, 'fitoura_data')
                      }}
                    >
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
                        exportToPDF(rows as any, 'Rapport_clients')
                      }}
                    >
                      🧾 Exporter en PDF
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="d-flex flex-column flex-md-row gap-2 w-100 w-lg-auto">
                <div className="app-search w-100">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nom, Tél, ID partiel..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>

                <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
                  <span className="text-nowrap">Date :</span>
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
              </div>
            </CardHeader>

            <div className="table-responsive">
              <DataTable<CustomerType> table={table} emptyMessage="Aucun client trouvé" />
            </div>

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
              show={showDeleteModal || showMultiDeleteModal}
              onHide={() => {
                if (loading) return
                setShowDeleteModal(false)
                setShowMultiDeleteModal(false)
              }}
              onConfirm={handleDelete}
              selectedCount={Object.keys(selectedRowIds).length}
              itemName="client"
              loading={loading || isDeleting}
              modalTitle="Confirmation de suppression"
              confirmButtonText="Supprimer"
              cancelButtonText="Annuler"
            />
          </Card>
        </Col>
      </Row>

      <CustomerModalViewDetail
        show={showModalDetail}
        onHide={() => setShowModalDetail(false)}
        customer={selectedCustomer}
        user={user}
        clients={data}
        onPrintQr={handlePrintQrTicket}
        getPublicTrackingUrl={getPublicTrackingUrl}
      />

      <CustomerEditModal
        show={showModalEdit}
        onHide={() => setShowModalEdit(false)}
        customer={selectedCustomer}
        onClientSaved={handleClientSaved}
      />

      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer le paiement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {customerToPay && (
            <>
              <p>
                Client : <strong>{customerToPay.nomPrenom}</strong>
              </p>
              <p>
                Montant : <strong>{customerToPay.prixFinal?.toFixed(3)} TND</strong>
              </p>
              <p>Choisir la date de paiement :</p>
              <Flatpickr
                value={selectedPaymentDate ?? undefined}
                onChange={(dates: Date[]) => setSelectedPaymentDate(dates[0] ?? null)}
                className="form-control"
                options={{ dateFormat: 'Y-m-d' }}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Annuler
          </Button>
          <Button variant="success" onClick={handleConfirmPayment}>
            Confirmer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default CustomersCard