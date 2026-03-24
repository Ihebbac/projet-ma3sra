'use client'

import { useEffect, useMemo, useState, ChangeEvent, useCallback, JSX } from 'react'
import { Row, Col, Card, CardBody, Button, ButtonGroup, Form, Modal, Badge, ProgressBar } from 'react-bootstrap'
import {
  TbDropletFilled,
  TbChecklist,
  TbScale,
  TbChartBar,
  TbCash,
  TbTruck,
  TbPackage,
  TbDelta,
  TbArrowsExchange,
  TbCashBanknote,
  TbRefresh,
  TbFilter,
  TbCalendar,
  TbAlertTriangle,
  TbCircleCheck,
  TbClockHour4,
  TbActivity,
} from 'react-icons/tb'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { format } from 'date-fns'
import CountUpClient from '@/components/client-wrapper/CountUpClient'

ChartJS.register(LineElement, BarElement, ArcElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

type Client = {
  _id: string
  nomPrenom: string
  numTelephone: number | string
  type: string
  dateCreation: string
  nombreCaisses: number
  quantiteOlive: number
  quantiteOliveNet: number
  quantiteHuile: number
  kattou3?: number
  nisba?: number
  status?: string
  prixFinal?: number
  prixKg?: number
  differenceHuile?: number
  huileParQfza?: number
}

type Fitoura = {
  _id: string
  matriculeCamion: string
  chauffeur: string
  poidsEntree: number
  poidsSortie: number
  poidsNet: number
  prixUnitaire: number
  montantTotal: number
  status: string
  createdAt: string
  dateSortie: string
}

type Transaction = {
  _id: string
  date: string
  typeStock: 'olive' | 'huile'
  quantite: number
  clientNom: string
  motif: string
}

type Caisse = {
  _id: string
  motif: string
  montant: number
  type: 'credit' | 'debit'
  date: string
}

type Employe = {
  _id: string
  nom: string
  prenom: string
  montantJournalier: number
  montantHeure: number
  joursPayes: string[]
  joursTravailles: { date: string; heuresSup: number }[]
}

type ThemePalette = {
  primary: string
  primaryA: string
  success: string
  successA: string
  danger: string
  dangerA: string
  warning: string
  warningA: string
  info: string
  infoA: string
  secondary: string
  secondaryA: string
  body: string
  muted: string
  grid: string
  cardBg: string
  cardBgSoft: string
  border: string
  shadow: string
  badgeBg: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://192.168.1.15:8170'

const inRange = (iso: string, from?: Date | null, to?: Date | null) => {
  const d = new Date(iso)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0)

const groupByKey = <T,>(arr: T[], key: (x: T) => string) =>
  arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    acc[k] = acc[k] || []
    acc[k].push(item)
    return acc
  }, {})

const getVal = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
  e.target && typeof (e.target as HTMLInputElement | HTMLSelectElement).value !== 'undefined'
    ? (e.target as HTMLInputElement | HTMLSelectElement).value
    : ''

const getNum = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>, def = 0) => {
  const v = Number(getVal(e))
  return Number.isFinite(v) ? v : def
}

const normalizeStatus = (s?: string) => (s ?? '').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')

const classifyStatus = (s?: string): 'payé' | 'non payé' | 'other' => {
  const n = normalizeStatus(s)
  if (n.includes('non pay')) return 'non payé'
  if (n.includes('pay')) return 'payé'
  return 'other'
}

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0))

const formatQty = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n || 0))

const getThemePalette = (): ThemePalette => {
  if (typeof document === 'undefined') {
    return {
      primary: 'rgb(13,110,253)',
      primaryA: 'rgba(13,110,253,.20)',
      success: 'rgb(25,135,84)',
      successA: 'rgba(25,135,84,.20)',
      danger: 'rgb(220,53,69)',
      dangerA: 'rgba(220,53,69,.20)',
      warning: 'rgb(255,193,7)',
      warningA: 'rgba(255,193,7,.20)',
      info: 'rgb(13,202,240)',
      infoA: 'rgba(13,202,240,.20)',
      secondary: 'rgb(108,117,125)',
      secondaryA: 'rgba(108,117,125,.20)',
      body: '#212529',
      muted: '#6c757d',
      grid: 'rgba(0,0,0,.08)',
      cardBg: '#ffffff',
      cardBgSoft: '#f8f9fa',
      border: 'rgba(0,0,0,.08)',
      shadow: '0 10px 30px rgba(0,0,0,.06)',
      badgeBg: '#f1f3f5',
    }
  }

  const root = document.documentElement
  const attrTheme = root.getAttribute('data-bs-theme')
  const computed = getComputedStyle(root)
  const isDark =
    attrTheme === 'dark' ||
    (!attrTheme && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return {
    primary: computed.getPropertyValue('--bs-primary').trim() || 'rgb(13,110,253)',
    primaryA: isDark ? 'rgba(13,110,253,.28)' : 'rgba(13,110,253,.16)',
    success: computed.getPropertyValue('--bs-success').trim() || 'rgb(25,135,84)',
    successA: isDark ? 'rgba(25,135,84,.28)' : 'rgba(25,135,84,.16)',
    danger: computed.getPropertyValue('--bs-danger').trim() || 'rgb(220,53,69)',
    dangerA: isDark ? 'rgba(220,53,69,.28)' : 'rgba(220,53,69,.16)',
    warning: computed.getPropertyValue('--bs-warning').trim() || 'rgb(255,193,7)',
    warningA: isDark ? 'rgba(255,193,7,.28)' : 'rgba(255,193,7,.18)',
    info: computed.getPropertyValue('--bs-info').trim() || 'rgb(13,202,240)',
    infoA: isDark ? 'rgba(13,202,240,.28)' : 'rgba(13,202,240,.16)',
    secondary: computed.getPropertyValue('--bs-secondary').trim() || 'rgb(108,117,125)',
    secondaryA: isDark ? 'rgba(108,117,125,.28)' : 'rgba(108,117,125,.16)',
    body: computed.getPropertyValue('--bs-body-color').trim() || (isDark ? '#e9ecef' : '#212529'),
    muted: isDark ? 'rgba(233,236,239,.72)' : '#6c757d',
    grid: isDark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)',
    cardBg: computed.getPropertyValue('--bs-body-bg').trim() || (isDark ? '#15171a' : '#ffffff'),
    cardBgSoft: isDark ? '#1d2125' : '#f8f9fa',
    border: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)',
    shadow: isDark ? '0 12px 30px rgba(0,0,0,.30)' : '0 10px 30px rgba(0,0,0,.06)',
    badgeBg: isDark ? '#20242a' : '#f1f3f5',
  }
}

const ModernCard = ({
  children,
  className = '',
  hover = false,
  palette,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
  palette: ThemePalette
}) => (
  <Card
    className={`modern-card ${hover ? 'card-hover' : ''} ${className}`}
    style={{
      border: `1px solid ${palette.border}`,
      borderRadius: '18px',
      boxShadow: palette.shadow,
      background: palette.cardBg,
      transition: 'all 0.25s ease',
    }}>
    {children}
  </Card>
)

const SectionTitle = ({
  title,
  subtitle,
  palette,
}: {
  title: string
  subtitle?: string
  palette: ThemePalette
}) => (
  <div className="mb-3">
    <div className="fw-semibold" style={{ color: palette.body, fontSize: '1rem' }}>
      {title}
    </div>
    {subtitle && (
      <div className="small mt-1" style={{ color: palette.muted }}>
        {subtitle}
      </div>
    )}
  </div>
)

const StatCard = ({
  icon,
  color,
  title,
  value,
  suffix,
  sub,
  onOpenFilters,
  loading = false,
  palette,
}: {
  icon: JSX.Element
  color: 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'danger'
  title: string
  value: number
  suffix?: string
  sub?: string
  onOpenFilters?: () => void
  loading?: boolean
  palette: ThemePalette
}) => {
  const bgMap = {
    primary: palette.primaryA,
    success: palette.successA,
    warning: palette.warningA,
    info: palette.infoA,
    secondary: palette.secondaryA,
    danger: palette.dangerA,
  }

  const textMap = {
    primary: palette.primary,
    success: palette.success,
    warning: palette.warning,
    info: palette.info,
    secondary: palette.secondary,
    danger: palette.danger,
  }

  return (
    <ModernCard hover palette={palette}>
      <CardBody className="p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div
            className="rounded-3 d-inline-flex align-items-center justify-content-center"
            style={{
              width: 46,
              height: 46,
              background: bgMap[color],
              color: textMap[color],
              fontSize: 22,
            }}>
            {icon}
          </div>

          {onOpenFilters && (
            <Button
              variant="link"
              className="p-0 border-0 shadow-none"
              onClick={onOpenFilters}
              style={{ color: palette.muted, textDecoration: 'none' }}>
              <TbFilter size={18} />
            </Button>
          )}
        </div>

        <div className="fw-semibold mb-1" style={{ color: palette.muted, fontSize: '.9rem' }}>
          {title}
        </div>

        <div className="fw-bold" style={{ color: palette.body, fontSize: '1.65rem', lineHeight: 1.2 }}>
          {loading ? (
            <div className="placeholder-glow">
              <span className="placeholder col-7"></span>
            </div>
          ) : (
            <CountUpClient end={Number(value) || 0} suffix={suffix} />
          )}
        </div>

        {sub && (
          <div className="small mt-2" style={{ color: palette.muted }}>
            {sub}
          </div>
        )}
      </CardBody>
    </ModernCard>
  )
}

const InsightCard = ({
  title,
  value,
  subtitle,
  icon,
  tone,
  palette,
}: {
  title: string
  value: string
  subtitle?: string
  icon: JSX.Element
  tone: 'success' | 'warning' | 'danger' | 'info'
  palette: ThemePalette
}) => {
  const toneMap = {
    success: { bg: palette.successA, color: palette.success },
    warning: { bg: palette.warningA, color: palette.warning },
    danger: { bg: palette.dangerA, color: palette.danger },
    info: { bg: palette.infoA, color: palette.info },
  }[tone]

  return (
    <ModernCard palette={palette}>
      <CardBody className="p-3 d-flex align-items-center gap-3">
        <div
          className="rounded-3 d-inline-flex align-items-center justify-content-center"
          style={{ width: 44, height: 44, background: toneMap.bg, color: toneMap.color, fontSize: 20 }}>
          {icon}
        </div>
        <div className="flex-grow-1">
          <div className="small" style={{ color: palette.muted }}>
            {title}
          </div>
          <div className="fw-bold" style={{ color: palette.body, fontSize: '1.1rem' }}>
            {value}
          </div>
          {subtitle && (
            <div className="small mt-1" style={{ color: palette.muted }}>
              {subtitle}
            </div>
          )}
        </div>
      </CardBody>
    </ModernCard>
  )
}

const DateFilterSection = ({
  quick,
  setQuick,
  granularity,
  setGranularity,
  year,
  setYear,
  month,
  setMonth,
  from,
  setFrom,
  to,
  setTo,
  yearsOptions,
  onRefresh,
  onReset,
  palette,
}: {
  quick: 'all' | 'today' | 'month' | 'year'
  setQuick: (v: 'all' | 'today' | 'month' | 'year') => void
  granularity: 'day' | 'month' | 'year'
  setGranularity: (v: 'day' | 'month' | 'year') => void
  year: string
  setYear: (v: string) => void
  month: string
  setMonth: (v: string) => void
  from: string
  setFrom: (v: string) => void
  to: string
  setTo: (v: string) => void
  yearsOptions: number[]
  onRefresh: () => void
  onReset: () => void
  palette: ThemePalette
}) => (
  <ModernCard palette={palette}>
    <CardBody className="py-3 py-md-4">
      <Row className="g-3 align-items-center">
        <Col xl="auto">
          <div className="d-flex align-items-center gap-2 fw-semibold" style={{ color: palette.body }}>
            <TbCalendar />
            <span>Période d’analyse</span>
          </div>
        </Col>

        <Col xl="auto">
          <ButtonGroup size="sm" className="flex-wrap">
            {(['today', 'month', 'year', 'all'] as const).map((q) => (
              <Button
                key={q}
                variant={quick === q ? 'primary' : 'outline-secondary'}
                onClick={() => setQuick(q)}
                className="rounded-3">
                {q === 'today' ? "Aujourd'hui" : q === 'month' ? 'Ce mois' : q === 'year' ? 'Cette année' : 'Tout'}
              </Button>
            ))}
          </ButtonGroup>
        </Col>

        <Col xl="auto">
          <ButtonGroup size="sm" className="flex-wrap">
            {(['day', 'month', 'year'] as const).map((g) => (
              <Button
                key={g}
                variant={granularity === g ? 'secondary' : 'outline-secondary'}
                onClick={() => setGranularity(g)}
                className="rounded-3">
                {g === 'day' ? 'Jour' : g === 'month' ? 'Mois' : 'Année'}
              </Button>
            ))}
          </ButtonGroup>
        </Col>

        <Col xl={2} md={6}>
          <Form.Select
            size="sm"
            value={year}
            onChange={(e) => {
              const y = getVal(e)
              setYear(y)
              if (y === 'all') setMonth('all')
              setQuick('all')
            }}>
            <option value="all">Toutes années</option>
            {yearsOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col xl={2} md={6}>
          <Form.Select
            size="sm"
            value={month}
            onChange={(e) => {
              setMonth(getVal(e))
              setQuick('all')
            }}
            disabled={year === 'all'}>
            <option value="all">Tous mois</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {format(new Date(2000, m - 1), 'MMMM')}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col xl={2} md={6}>
          <Form.Control
            size="sm"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(getVal(e as any))
              setQuick('all')
            }}
          />
        </Col>

        <Col xl={2} md={6}>
          <Form.Control
            size="sm"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(getVal(e as any))
              setQuick('all')
            }}
          />
        </Col>

        <Col xl="auto" className="d-flex gap-2 flex-wrap">
          <Button variant="outline-secondary" size="sm" onClick={onReset} className="rounded-3">
            Réinitialiser
          </Button>
          <Button variant="outline-primary" size="sm" onClick={onRefresh} className="rounded-3 d-flex align-items-center gap-1">
            <TbRefresh size={16} />
            Actualiser
          </Button>
        </Col>
      </Row>
    </CardBody>
  </ModernCard>
)

export default function ModernDashboardClient() {
  const [palette, setPalette] = useState<ThemePalette>(getThemePalette())

  const [quick, setQuick] = useState<'all' | 'today' | 'month' | 'year'>('month')
  const now = new Date()
  const todayISO = format(now, 'yyyy-MM-dd')
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1

  const [granularity, setGranularity] = useState<'day' | 'month' | 'year'>('day')
  const [year, setYear] = useState<string>('all')
  const [month, setMonth] = useState<string>('all')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const [showModal, setShowModal] = useState<null | string>(null)
  const [kpiFilters, setKpiFilters] = useState({
    oil: { minKattou3: 0 },
    olive: { minKattou3: 0 },
    kattou3: { min: 0, max: 100 },
    paid: { includeNonPaye: true },
    caisse: { type: 'all' as 'all' | 'credit' | 'debit' },
    fitoura: { status: 'all' as 'all' | 'TERMINE' | 'EN_COURS' },
    clients: { status: 'all' as 'all' | 'payé' | 'non payé' | 'other' },
    caisses: { min: 0 },
    ecart: { min: 0 },
    trans: { type: 'all' as 'all' | 'huile' | 'olive' },
    payroll: { includeOvertime: true },
  })

  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [fitoura, setFitoura] = useState<Fitoura[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [caisse, setCaisse] = useState<Caisse[]>([])
  const [employes, setEmployes] = useState<Employe[]>([])

  const syncTheme = useCallback(() => {
    setPalette(getThemePalette())
  }, [])

  useEffect(() => {
    syncTheme()

    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const observer = new MutationObserver(() => {
      syncTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme', 'class', 'style'],
    })

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => syncTheme()

    if (media.addEventListener) {
      media.addEventListener('change', onChange)
    } else {
      media.addListener(onChange)
    }

    return () => {
      observer.disconnect()
      if (media.removeEventListener) {
        media.removeEventListener('change', onChange)
      } else {
        media.removeListener(onChange)
      }
    }
  }, [syncTheme])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [c1, f1, t1, ca1, e1] = await Promise.all([
        fetch(`${API_BASE}/clients`).then((r) => r.json()),
        fetch(`${API_BASE}/fitoura`).then((r) => r.json()),
        fetch(`${API_BASE}/transactions`).then((r) => r.json()),
        fetch(`${API_BASE}/caisse`).then((r) => r.json()),
        fetch(`${API_BASE}/employes`).then((r) => r.json()),
      ])

      setClients(Array.isArray(c1) ? c1 : c1?.data || [])
      setFitoura(Array.isArray(f1) ? f1 : f1?.data || [])
      setTransactions(Array.isArray(t1) ? t1 : t1?.data || [])
      setCaisse(Array.isArray(ca1) ? ca1 : ca1?.data || [])
      setEmployes(Array.isArray(e1) ? e1 : e1?.data || [])
    } catch (err) {
      console.error('Erreur lors du chargement des données :', err)
      setClients([])
      setFitoura([])
      setTransactions([])
      setCaisse([])
      setEmployes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const allDates = useMemo(
    () => [
      ...clients.map((x) => x.dateCreation),
      ...fitoura.map((x) => x.createdAt || x.dateSortie),
      ...transactions.map((x) => x.date),
      ...caisse.map((x) => x.date),
      ...employes.flatMap((e) => [...(e.joursPayes || []), ...(e.joursTravailles || []).map((j) => j.date)]),
    ],
    [clients, fitoura, transactions, caisse, employes]
  )

  const yearsOptions = useMemo(() => {
    const s = new Set<number>()
    allDates.forEach((iso) => {
      if (iso) s.add(new Date(iso).getFullYear())
    })
    return Array.from(s).sort((a, b) => a - b)
  }, [allDates])

  useEffect(() => {
    if (quick === 'today') {
      setYear(String(thisYear))
      setMonth(String(thisMonth))
      setFrom(todayISO)
      setTo(todayISO)
      setGranularity('day')
    } else if (quick === 'month') {
      setYear(String(thisYear))
      setMonth(String(thisMonth))
      setFrom(`${thisYear}-${String(thisMonth).padStart(2, '0')}-01`)
      setTo(todayISO)
      setGranularity('day')
    } else if (quick === 'year') {
      setYear(String(thisYear))
      setMonth('all')
      setFrom('')
      setTo('')
      setGranularity('month')
    } else {
      setYear('all')
      setMonth('all')
      setFrom('')
      setTo('')
      setGranularity('month')
    }
  }, [quick, thisMonth, thisYear, todayISO])

  const fromDate = useMemo(() => (from ? new Date(from) : null), [from])
  const toDate = useMemo(() => (to ? new Date(`${to}T23:59:59`) : null), [to])

  const matchYearMonth = useCallback(
    (iso: string) => {
      const d = new Date(iso)
      if (year !== 'all') {
        if (d.getFullYear() !== Number(year)) return false
        if (month !== 'all' && d.getMonth() + 1 !== Number(month)) return false
      }
      return true
    },
    [year, month]
  )

  const dateFilter = useCallback(
    (iso: string) => !!iso && matchYearMonth(iso) && inRange(iso, fromDate, toDate),
    [matchYearMonth, fromDate, toDate]
  )

  const clientsF = useMemo(() => clients.filter((c) => dateFilter(c.dateCreation)), [clients, dateFilter])
  const fitouraF = useMemo(() => fitoura.filter((f) => dateFilter(f.createdAt || f.dateSortie)), [fitoura, dateFilter])
  const transactionsF = useMemo(() => transactions.filter((t) => dateFilter(t.date)), [transactions, dateFilter])
  const caisseF = useMemo(() => caisse.filter((ca) => dateFilter(ca.date)), [caisse, dateFilter])

  const kOil = useMemo(() => {
    const { minKattou3 } = kpiFilters.oil
    return sum(clientsF.filter((c) => Number(c.kattou3 ?? 0) >= minKattou3).map((c) => Number(c.quantiteHuile || 0)))
  }, [clientsF, kpiFilters.oil])

  const kOlive = useMemo(() => {
    const { minKattou3 } = kpiFilters.olive
    return sum(clientsF.filter((c) => Number(c.kattou3 ?? 0) >= minKattou3).map((c) => Number(c.quantiteOliveNet || 0)))
  }, [clientsF, kpiFilters.olive])

  const kKattou3 = useMemo(() => {
    const arr = clientsF
      .map((c) => Number(c.kattou3 ?? 0))
      .filter((v) => v >= kpiFilters.kattou3.min && v <= kpiFilters.kattou3.max)
    return avg(arr)
  }, [clientsF, kpiFilters.kattou3])

  const kPaid = useMemo(() => {
    const filtered = clientsF.filter((c) => {
      const cls = classifyStatus(c.status)
      return kpiFilters.paid.includeNonPaye ? true : cls === 'payé' || cls === 'non payé'
    })
    const paidCount = filtered.filter((c) => classifyStatus(c.status) === 'payé').length
    const nonPaidCount = filtered.filter((c) => classifyStatus(c.status) === 'non payé').length
    const pct = filtered.length ? (paidCount / filtered.length) * 100 : 0
    return { paidCount, nonPaidCount, total: filtered.length, pct }
  }, [clientsF, kpiFilters.paid])

  const kCaisse = useMemo(() => {
    const filt = kpiFilters.caisse.type
    const credits = sum(caisseF.filter((x) => (filt === 'all' || filt === 'credit') && x.type === 'credit').map((x) => x.montant))
    const debits = sum(caisseF.filter((x) => (filt === 'all' || filt === 'debit') && x.type === 'debit').map((x) => x.montant))
    return { credits, debits, balance: credits - debits }
  }, [caisseF, kpiFilters.caisse])

  const kFitoura = useMemo(() => {
    const { status } = kpiFilters.fitoura
    const rows = fitouraF.filter((f) => (status === 'all' ? true : normalizeStatus(f.status) === normalizeStatus(status)))
    return {
      poidsNet: sum(rows.map((r) => Number(r.poidsNet || 0))),
      montantTotal: sum(rows.map((r) => Number(r.montantTotal || 0))),
      count: rows.length,
    }
  }, [fitouraF, kpiFilters.fitoura])

  const kClientsCount = useMemo(() => {
    const s = kpiFilters.clients.status
    return clientsF.filter((c) => (s === 'all' ? true : classifyStatus(c.status) === s)).length
  }, [clientsF, kpiFilters.clients])

  const kNbCaisses = useMemo(() => {
    const { min } = kpiFilters.caisses
    return sum(clientsF.filter((c) => (c.nombreCaisses ?? 0) >= min).map((c) => c.nombreCaisses || 0))
  }, [clientsF, kpiFilters.caisses])

  const kEcartHuile = useMemo(() => {
    const eps = 1e-9
    const { min } = kpiFilters.ecart
    const arr = clientsF
      .map((c) => Math.abs(Number(c.differenceHuile || 0)))
      .map((v) => (v < eps ? 0 : v))
      .filter((v) => v >= min)
    return sum(arr)
  }, [clientsF, kpiFilters.ecart])

  const kCreditsClients = useMemo(() => {
    return sum(caisseF.filter((x) => x.type === 'credit' && /payment\s*client/i.test(x.motif || '')).map((x) => x.montant))
  }, [caisseF])

  const kTransactionsCount = useMemo(() => {
    const t = kpiFilters.trans.type
    return transactionsF.filter((tr) => (t === 'all' ? true : tr.typeStock === t)).length
  }, [transactionsF, kpiFilters.trans])

  const kPayroll = useMemo(() => {
    const includeOT = kpiFilters.payroll.includeOvertime
    let due = 0

    employes.forEach((e) => {
      const rows = (e.joursTravailles || []).filter((j) => dateFilter(j.date))
      const jours = rows.length
      const hs = includeOT ? sum(rows.map((r) => r.heuresSup || 0)) : 0
      due += jours * (e.montantJournalier || 0) + hs * (e.montantHeure || 0)
    })

    const paid = sum(caisseF.filter((c) => c.type === 'debit' && /paiement\s*employ/i.test(c.motif || '')).map((c) => c.montant))
    return { due, paid, remaining: due - paid }
  }, [employes, caisseF, kpiFilters.payroll, dateFilter])

  const avgKattou3 = useMemo(() => avg(clientsF.map((c) => Number(c.kattou3 || 0))), [clientsF])
  const avgHuileParQfza = useMemo(() => avg(clientsF.map((c) => Number(c.huileParQfza || 0))), [clientsF])
  const avgHuileParClient = useMemo(() => avg(clientsF.map((c) => Number(c.quantiteHuile || 0))), [clientsF])
  const avgOliveParClient = useMemo(() => avg(clientsF.map((c) => Number(c.quantiteOliveNet || 0))), [clientsF])

  const clientsSubset = useMemo(() => {
    const s = kpiFilters.clients.status
    return clientsF.filter((c) => (s === 'all' ? true : classifyStatus(c.status) === s))
  }, [clientsF, kpiFilters.clients.status])

  const clientDistribution = useMemo(() => {
    let paid = 0
    let nonPaid = 0
    let other = 0

    clientsSubset.forEach((c) => {
      const cls = classifyStatus(c.status)
      if (cls === 'payé') paid++
      else if (cls === 'non payé') nonPaid++
      else other++
    })

    return { paid, nonPaid, other }
  }, [clientsSubset])

  const nf = useMemo(() => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }), [])

  const dateKey = useCallback(
    (iso: string) => {
      const d = new Date(iso)
      if (granularity === 'year') return String(d.getFullYear())
      if (granularity === 'month') return format(d, 'yyyy-MM')
      return format(d, 'yyyy-MM-dd')
    },
    [granularity]
  )

  const oilGroups = useMemo(() => groupByKey(clientsF, (c) => dateKey(c.dateCreation)), [clientsF, dateKey])
  const oilLabels = useMemo(() => Object.keys(oilGroups).sort(), [oilGroups])
  const oilSeries = useMemo(() => oilLabels.map((l) => sum(oilGroups[l].map((c) => Number(c.quantiteHuile || 0)))), [oilLabels, oilGroups])
  const oliveSeries = useMemo(() => oilLabels.map((l) => sum(oilGroups[l].map((c) => Number(c.quantiteOliveNet || 0)))), [oilLabels, oilGroups])
  const kattou3Series = useMemo(() => oilLabels.map((l) => avg(oilGroups[l].map((c) => Number(c.kattou3 || 0)))), [oilLabels, oilGroups])

  const cashGroups = useMemo(() => groupByKey(caisseF, (c) => dateKey(c.date)), [caisseF, dateKey])
  const cashLabels = useMemo(() => Object.keys(cashGroups).sort(), [cashGroups])
  const creditsSeries = useMemo(
    () => cashLabels.map((l) => sum(cashGroups[l].filter((x) => x.type === 'credit').map((x) => Number(x.montant || 0)))),
    [cashLabels, cashGroups]
  )
  const debitsSeries = useMemo(
    () => cashLabels.map((l) => sum(cashGroups[l].filter((x) => x.type === 'debit').map((x) => Number(x.montant || 0)))),
    [cashLabels, cashGroups]
  )

  const topClients = useMemo(
    () => [...clientsF].sort((a, b) => Number(b.quantiteHuile || 0) - Number(a.quantiteHuile || 0)).slice(0, 5),
    [clientsF]
  )

  const transGroups = useMemo(() => groupByKey(transactionsF, (t) => dateKey(t.date)), [transactionsF, dateKey])
  const transLabels = useMemo(() => Object.keys(transGroups).sort(), [transGroups])
  const transHuile = useMemo(
    () => transLabels.map((l) => sum(transGroups[l].filter((t) => t.typeStock === 'huile').map((t) => Number(t.quantite || 0)))),
    [transLabels, transGroups]
  )
  const transOlive = useMemo(
    () => transLabels.map((l) => sum(transGroups[l].filter((t) => t.typeStock === 'olive').map((t) => Number(t.quantite || 0)))),
    [transLabels, transGroups]
  )

  const fitouraGroups = useMemo(() => groupByKey(fitouraF, (f) => dateKey(f.createdAt || f.dateSortie)), [fitouraF, dateKey])
  const fitouraLabels = useMemo(() => Object.keys(fitouraGroups).sort(), [fitouraGroups])
  const fitouraPoids = useMemo(
    () => fitouraLabels.map((l) => sum(fitouraGroups[l].map((f) => Number(f.poidsNet || 0)))),
    [fitouraLabels, fitouraGroups]
  )
  const fitouraMontant = useMemo(
    () => fitouraLabels.map((l) => sum(fitouraGroups[l].map((f) => Number(f.montantTotal || 0)))),
    [fitouraLabels, fitouraGroups]
  )

  const unpaidClients = useMemo(
    () =>
      [...clientsF]
        .filter((c) => classifyStatus(c.status) === 'non payé')
        .sort((a, b) => Number(b.prixFinal || 0) - Number(a.prixFinal || 0))
        .slice(0, 5),
    [clientsF]
  )

  const highDiffClients = useMemo(
    () =>
      [...clientsF]
        .filter((c) => Math.abs(Number(c.differenceHuile || 0)) > 0)
        .sort((a, b) => Math.abs(Number(b.differenceHuile || 0)) - Math.abs(Number(a.differenceHuile || 0)))
        .slice(0, 5),
    [clientsF]
  )

  const bestProductionDay = useMemo(() => {
    if (!oilLabels.length) return null
    let maxIndex = 0
    oilSeries.forEach((v, i) => {
      if (v > oilSeries[maxIndex]) maxIndex = i
    })
    return { label: oilLabels[maxIndex], value: oilSeries[maxIndex] || 0 }
  }, [oilLabels, oilSeries])

  const paymentRate = useMemo(() => {
    const total = clientDistribution.paid + clientDistribution.nonPaid + clientDistribution.other
    return total ? (clientDistribution.paid / total) * 100 : 0
  }, [clientDistribution])

  const commonScales = useMemo(
    () => ({
      x: {
        ticks: { color: palette.muted },
        grid: { color: palette.grid, drawBorder: false },
      },
      y: {
        ticks: { color: palette.muted },
        grid: { color: palette.grid, drawBorder: false },
      },
    }),
    [palette]
  )

  const commonPlugins = useMemo(
    () => ({
      legend: {
        position: 'top' as const,
        labels: { color: palette.body, usePointStyle: true, boxWidth: 10, boxHeight: 10 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: palette.cardBgSoft,
        borderColor: palette.border,
        borderWidth: 1,
        titleColor: palette.body,
        bodyColor: palette.body,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (ctx: any) => {
            const raw =
              typeof ctx.parsed === 'object' && ctx.parsed
                ? Number.isFinite(ctx.parsed.y)
                  ? ctx.parsed.y
                  : Number.isFinite(ctx.parsed.x)
                    ? ctx.parsed.x
                    : 0
                : Number.isFinite(ctx.parsed)
                  ? ctx.parsed
                  : 0

            const v = Number(raw) || 0
            const name = ctx.dataset?.label ?? ctx.label ?? ''
            return `${name}: ${nf.format(v)}`
          },
        },
      },
    }),
    [palette, nf]
  )

  const openModal = (key: keyof typeof kpiFilters) => setShowModal(key)
  const closeModal = () => setShowModal(null)

  const handleReset = () => {
    setYear('all')
    setMonth('all')
    setFrom('')
    setTo('')
    setQuick('all')
  }

  return (
    <div className="modern-dashboard">
      <div className="d-flex flex-wrap justify-content-end align-items-start gap-2 mb-4">
        <Badge
          pill
          style={{
            background: palette.badgeBg,
            color: palette.body,
            border: `1px solid ${palette.border}`,
            fontWeight: 600,
            padding: '0.65rem 0.9rem',
          }}>
          {clientsF.length} clients
        </Badge>

        <Badge
          pill
          style={{
            background: palette.badgeBg,
            color: palette.body,
            border: `1px solid ${palette.border}`,
            fontWeight: 600,
            padding: '0.65rem 0.9rem',
          }}>
          {formatQty(kOil)} kg huile
        </Badge>
      </div>

      <DateFilterSection
        quick={quick}
        setQuick={setQuick}
        granularity={granularity}
        setGranularity={setGranularity}
        year={year}
        setYear={setYear}
        month={month}
        setMonth={setMonth}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        yearsOptions={yearsOptions}
        onRefresh={fetchData}
        onReset={handleReset}
        palette={palette}
      />

      <Row className="g-3 mt-1">
        <Col xl={3} md={6}>
          <StatCard
            icon={<TbDropletFilled />}
            color="primary"
            title="Huile produite"
            value={kOil}
            suffix=" kg"
            sub={`${formatQty(avgHuileParClient)} kg / client`}
            onOpenFilters={() => openModal('oil')}
            loading={loading}
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <StatCard
            icon={<TbChecklist />}
            color="success"
            title="Olive nette"
            value={kOlive}
            suffix=" kg"
            sub={`${formatQty(avgOliveParClient)} kg / client`}
            onOpenFilters={() => openModal('olive')}
            loading={loading}
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <StatCard
            icon={<TbScale />}
            color="warning"
            title="Kattou3 moyen"
            value={Number(kKattou3.toFixed(2))}
            sub={`Huile/Qfza: ${formatQty(avgHuileParQfza)}`}
            onOpenFilters={() => openModal('kattou3')}
            loading={loading}
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <StatCard
            icon={<TbCash />}
            color="secondary"
            title="Solde caisse"
            value={Number(kCaisse.balance.toFixed(2))}
            suffix=" DT"
            sub={`+${formatMoney(kCaisse.credits)} / -${formatMoney(kCaisse.debits)}`}
            onOpenFilters={() => openModal('caisse')}
            loading={loading}
            palette={palette}
          />
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xl={3} md={6}>
          <StatCard
            icon={<TbChartBar />}
            color="info"
            title="Clients payés"
            value={Number(kPaid.pct.toFixed(1))}
            suffix="%"
            sub={`${kPaid.paidCount}/${kPaid.total} clients`}
            onOpenFilters={() => openModal('paid')}
            loading={loading}
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <StatCard
            icon={<TbTruck />}
            color="danger"
            title="Fitoura nette"
            value={kFitoura.poidsNet}
            suffix=" kg"
            sub={`${kFitoura.count} entrées | ${formatMoney(kFitoura.montantTotal)} DT`}
            onOpenFilters={() => openModal('fitoura')}
            loading={loading}
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <StatCard
            icon={<TbPackage />}
            color="success"
            title="Nombre de caisses"
            value={kNbCaisses}
            sub={`${kClientsCount} clients filtrés`}
            onOpenFilters={() => openModal('caisses')}
            loading={loading}
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <StatCard
            icon={<TbDelta />}
            color="warning"
            title="Écart huile"
            value={Number(kEcartHuile.toFixed(2))}
            suffix=" kg"
            sub="Différence entre huile théorique et réelle"
            onOpenFilters={() => openModal('ecart')}
            loading={loading}
            palette={palette}
          />
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xl={3} md={6}>
          <InsightCard
            title="Règlement clients"
            value={`${formatQty(paymentRate)}%`}
            subtitle={`${clientDistribution.paid} payés / ${clientDistribution.nonPaid} non payés`}
            icon={<TbCircleCheck />}
            tone="success"
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <InsightCard
            title="Paie restante"
            value={`${formatMoney(kPayroll.remaining)} DT`}
            subtitle={`Prévu: ${formatMoney(kPayroll.due)} DT`}
            icon={<TbCashBanknote />}
            tone="danger"
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <InsightCard
            title="Transactions stock"
            value={`${kTransactionsCount}`}
            subtitle={`${formatQty(sum(transHuile))} kg huile | ${formatQty(sum(transOlive))} kg olive`}
            icon={<TbArrowsExchange />}
            tone="info"
            palette={palette}
          />
        </Col>

        <Col xl={3} md={6}>
          <InsightCard
            title="Meilleur jour de production"
            value={bestProductionDay ? `${formatQty(bestProductionDay.value)} kg` : '0 kg'}
            subtitle={bestProductionDay ? bestProductionDay.label : 'Aucune donnée'}
            icon={<TbActivity />}
            tone="warning"
            palette={palette}
          />
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={8}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Production d’huile et d’olive"
                subtitle="Comparaison journalière / mensuelle / annuelle selon la période choisie"
                palette={palette}
              />
              <div style={{ height: 320 }}>
                <Line
                  data={{
                    labels: oilLabels,
                    datasets: [
                      {
                        label: 'Huile (kg)',
                        data: oilSeries,
                        borderColor: palette.primary,
                        backgroundColor: palette.primaryA,
                        borderWidth: 2.5,
                        tension: 0.35,
                        fill: true,
                      },
                      {
                        label: 'Olive nette (kg)',
                        data: oliveSeries,
                        borderColor: palette.success,
                        backgroundColor: palette.successA,
                        borderWidth: 2.5,
                        tension: 0.35,
                        fill: false,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: commonPlugins,
                    scales: commonScales,
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>

        <Col lg={4}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle title="Répartition clients" subtitle="Statut réel des clients filtrés" palette={palette} />
              <div style={{ height: 320 }}>
                <Doughnut
                  data={{
                    labels: ['Payé', 'Non payé', 'Autre'],
                    datasets: [
                      {
                        data: [clientDistribution.paid, clientDistribution.nonPaid, clientDistribution.other],
                        backgroundColor: [palette.success, palette.danger, palette.secondary],
                        borderWidth: 2,
                        borderColor: palette.cardBg,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      ...commonPlugins,
                      legend: {
                        position: 'bottom' as const,
                        labels: { color: palette.body, usePointStyle: true, boxWidth: 10, boxHeight: 10 },
                      },
                    },
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Mouvements de caisse"
                subtitle="Suivi des crédits et débits en DT"
                palette={palette}
              />
              <div style={{ height: 300 }}>
                <Bar
                  data={{
                    labels: cashLabels,
                    datasets: [
                      {
                        label: 'Crédits (DT)',
                        data: creditsSeries,
                        backgroundColor: palette.successA,
                        borderColor: palette.success,
                        borderWidth: 1.5,
                      },
                      {
                        label: 'Débits (DT)',
                        data: debitsSeries,
                        backgroundColor: palette.dangerA,
                        borderColor: palette.danger,
                        borderWidth: 1.5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: commonPlugins,
                    scales: commonScales,
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>

        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Kattou3 moyen"
                subtitle="Évolution moyenne du kattou3 sur la période"
                palette={palette}
              />
              <div style={{ height: 300 }}>
                <Line
                  data={{
                    labels: oilLabels,
                    datasets: [
                      {
                        label: 'Kattou3',
                        data: kattou3Series,
                        borderColor: palette.warning,
                        backgroundColor: palette.warningA,
                        borderWidth: 2.5,
                        tension: 0.35,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: commonPlugins,
                    scales: commonScales,
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Top 5 clients — huile produite"
                subtitle="Classement des meilleurs clients sur la période"
                palette={palette}
              />
              <div style={{ height: 300 }}>
                <Bar
                  data={{
                    labels: topClients.map((c) => c.nomPrenom),
                    datasets: [
                      {
                        label: 'Huile (kg)',
                        data: topClients.map((c) => Number(c.quantiteHuile || 0)),
                        backgroundColor: palette.primaryA,
                        borderColor: palette.primary,
                        borderWidth: 1.5,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: commonPlugins,
                    scales: commonScales,
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>

        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Transactions stock"
                subtitle="Mouvements huile / olive en kg"
                palette={palette}
              />
              <div style={{ height: 300 }}>
                <Bar
                  data={{
                    labels: transLabels,
                    datasets: [
                      {
                        label: 'Huile (kg)',
                        data: transHuile,
                        backgroundColor: palette.infoA,
                        borderColor: palette.info,
                        borderWidth: 1.5,
                      },
                      {
                        label: 'Olive (kg)',
                        data: transOlive,
                        backgroundColor: palette.successA,
                        borderColor: palette.success,
                        borderWidth: 1.5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: commonPlugins,
                    scales: commonScales,
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Fitoura"
                subtitle="Poids net et montant total par période"
                palette={palette}
              />
              <div style={{ height: 300 }}>
                <Bar
                  data={{
                    labels: fitouraLabels,
                    datasets: [
                      {
                        label: 'Poids net (kg)',
                        data: fitouraPoids,
                        backgroundColor: palette.warningA,
                        borderColor: palette.warning,
                        borderWidth: 1.5,
                      },
                      {
                        label: 'Montant total (DT)',
                        data: fitouraMontant,
                        backgroundColor: palette.secondaryA,
                        borderColor: palette.secondary,
                        borderWidth: 1.5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: commonPlugins,
                    scales: commonScales,
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>

        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Résumé métier"
                subtitle="Indicateurs rapides pour décider plus vite"
                palette={palette}
              />

              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="d-flex justify-content-between small mb-1" style={{ color: palette.muted }}>
                    <span>Taux de règlement clients</span>
                    <span>{formatQty(paymentRate)}%</span>
                  </div>
                  <ProgressBar now={paymentRate} variant="success" style={{ height: 10 }} />
                </div>

                <div>
                  <div className="d-flex justify-content-between small mb-1" style={{ color: palette.muted }}>
                    <span>Kattou3 moyen</span>
                    <span>{formatQty(avgKattou3)}</span>
                  </div>
                  <ProgressBar now={Math.max(0, Math.min(100, avgKattou3))} variant="warning" style={{ height: 10 }} />
                </div>

                <div className="summary-grid">
                  <div className="summary-chip">
                    <span className="summary-chip-label">Huile / client</span>
                    <strong>{formatQty(avgHuileParClient)} kg</strong>
                  </div>
                  <div className="summary-chip">
                    <span className="summary-chip-label">Olive / client</span>
                    <strong>{formatQty(avgOliveParClient)} kg</strong>
                  </div>
                  <div className="summary-chip">
                    <span className="summary-chip-label">Crédits clients</span>
                    <strong>{formatMoney(kCreditsClients)} DT</strong>
                  </div>
                  <div className="summary-chip">
                    <span className="summary-chip-label">Fitoura total</span>
                    <strong>{formatMoney(kFitoura.montantTotal)} DT</strong>
                  </div>
                </div>
              </div>
            </CardBody>
          </ModernCard>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Clients non payés"
                subtitle="Les plus importants à traiter en priorité"
                palette={palette}
              />

              <div className="d-flex flex-column gap-2">
                {unpaidClients.length === 0 ? (
                  <div className="empty-state" style={{ color: palette.muted }}>
                    Aucun client non payé sur cette période.
                  </div>
                ) : (
                  unpaidClients.map((c) => (
                    <div key={c._id} className="list-line">
                      <div className="d-flex align-items-center gap-2">
                        <div className="list-icon danger">
                          <TbClockHour4 />
                        </div>
                        <div>
                          <div className="fw-semibold">{c.nomPrenom}</div>
                          <div className="small text-muted">{c.numTelephone}</div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">{formatMoney(Number(c.prixFinal || 0))} DT</div>
                        <div className="small text-muted">{formatQty(Number(c.quantiteHuile || 0))} kg huile</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </ModernCard>
        </Col>

        <Col lg={6}>
          <ModernCard palette={palette}>
            <CardBody className="p-3 p-md-4">
              <SectionTitle
                title="Écarts huile à surveiller"
                subtitle="Clients avec les plus grands écarts"
                palette={palette}
              />

              <div className="d-flex flex-column gap-2">
                {highDiffClients.length === 0 ? (
                  <div className="empty-state" style={{ color: palette.muted }}>
                    Aucun écart détecté sur cette période.
                  </div>
                ) : (
                  highDiffClients.map((c) => (
                    <div key={c._id} className="list-line">
                      <div className="d-flex align-items-center gap-2">
                        <div className="list-icon warning">
                          <TbAlertTriangle />
                        </div>
                        <div>
                          <div className="fw-semibold">{c.nomPrenom}</div>
                          <div className="small text-muted">
                            Kattou3: {formatQty(Number(c.kattou3 || 0))} | Huile/Qfza: {formatQty(Number(c.huileParQfza || 0))}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">{formatQty(Math.abs(Number(c.differenceHuile || 0)))} kg</div>
                        <div className="small text-muted">Écart absolu</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </ModernCard>
        </Col>
      </Row>

      <Modal show={!!showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Filtre avancé —{' '}
            {showModal === 'oil'
              ? 'Huile produite'
              : showModal === 'olive'
                ? 'Olive nette'
                : showModal === 'kattou3'
                  ? 'Kattou3'
                  : showModal === 'paid'
                    ? 'Clients payés'
                    : showModal === 'caisse'
                      ? 'Caisse'
                      : showModal === 'fitoura'
                        ? 'Fitoura'
                        : showModal === 'clients'
                          ? 'Clients'
                          : showModal === 'caisses'
                            ? 'Nombre de caisses'
                            : showModal === 'ecart'
                              ? 'Écart huile'
                              : showModal === 'trans'
                                ? 'Transactions'
                                : showModal === 'payroll'
                                  ? 'Paie'
                                  : ''}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {showModal === 'oil' && (
            <Form.Group className="mb-3">
              <Form.Label>Kattou3 minimale</Form.Label>
              <Form.Range
                min={0}
                max={100}
                step={0.5}
                value={kpiFilters.oil.minKattou3}
                onChange={(e) => setKpiFilters((s) => ({ ...s, oil: { ...s.oil, minKattou3: getNum(e) } }))}
              />
              <div className="small text-muted">{kpiFilters.oil.minKattou3}</div>
            </Form.Group>
          )}

          {showModal === 'olive' && (
            <Form.Group className="mb-3">
              <Form.Label>Kattou3 minimale</Form.Label>
              <Form.Range
                min={0}
                max={100}
                step={0.5}
                value={kpiFilters.olive.minKattou3}
                onChange={(e) => setKpiFilters((s) => ({ ...s, olive: { ...s.olive, minKattou3: getNum(e) } }))}
              />
              <div className="small text-muted">{kpiFilters.olive.minKattou3}</div>
            </Form.Group>
          )}

          {showModal === 'kattou3' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Kattou3 minimale</Form.Label>
                <Form.Control
                  type="number"
                  value={kpiFilters.kattou3.min}
                  onChange={(e) => setKpiFilters((s) => ({ ...s, kattou3: { ...s.kattou3, min: getNum(e) } }))}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Kattou3 maximale</Form.Label>
                <Form.Control
                  type="number"
                  value={kpiFilters.kattou3.max}
                  onChange={(e) => setKpiFilters((s) => ({ ...s, kattou3: { ...s.kattou3, max: getNum(e, 100) } }))}
                />
              </Form.Group>
            </>
          )}

          {showModal === 'paid' && (
            <Form.Check
              type="switch"
              id="include-non-paye"
              label="Inclure aussi les autres statuts"
              checked={kpiFilters.paid.includeNonPaye}
              onChange={(e) =>
                setKpiFilters((s) => ({
                  ...s,
                  paid: { ...s.paid, includeNonPaye: e.target.checked },
                }))
              }
            />
          )}

          {showModal === 'caisse' && (
            <Form.Group>
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={kpiFilters.caisse.type}
                onChange={(e) =>
                  setKpiFilters((s) => ({
                    ...s,
                    caisse: { ...s.caisse, type: getVal(e) as 'all' | 'credit' | 'debit' },
                  }))
                }>
                <option value="all">Tous</option>
                <option value="credit">Crédits</option>
                <option value="debit">Débits</option>
              </Form.Select>
            </Form.Group>
          )}

          {showModal === 'fitoura' && (
            <Form.Group>
              <Form.Label>Statut</Form.Label>
              <Form.Select
                value={kpiFilters.fitoura.status}
                onChange={(e) =>
                  setKpiFilters((s) => ({
                    ...s,
                    fitoura: { ...s.fitoura, status: getVal(e) as 'all' | 'TERMINE' | 'EN_COURS' },
                  }))
                }>
                <option value="all">Tous</option>
                <option value="TERMINE">TERMINE</option>
                <option value="EN_COURS">EN_COURS</option>
              </Form.Select>
            </Form.Group>
          )}

          {showModal === 'clients' && (
            <Form.Group>
              <Form.Label>Statut client</Form.Label>
              <Form.Select
                value={kpiFilters.clients.status}
                onChange={(e) =>
                  setKpiFilters((s) => ({
                    ...s,
                    clients: { ...s.clients, status: getVal(e) as 'all' | 'payé' | 'non payé' | 'other' },
                  }))
                }>
                <option value="all">Tous</option>
                <option value="payé">Payé</option>
                <option value="non payé">Non payé</option>
                <option value="other">Autre</option>
              </Form.Select>
            </Form.Group>
          )}

          {showModal === 'caisses' && (
            <Form.Group>
              <Form.Label>Nombre minimal de caisses</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={kpiFilters.caisses.min}
                onChange={(e) =>
                  setKpiFilters((s) => ({
                    ...s,
                    caisses: { ...s.caisses, min: getNum(e) },
                  }))
                }
              />
            </Form.Group>
          )}

          {showModal === 'ecart' && (
            <Form.Group>
              <Form.Label>Écart minimal (kg)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={kpiFilters.ecart.min}
                onChange={(e) =>
                  setKpiFilters((s) => ({
                    ...s,
                    ecart: { ...s.ecart, min: getNum(e) },
                  }))
                }
              />
            </Form.Group>
          )}

          {showModal === 'trans' && (
            <Form.Group>
              <Form.Label>Type de stock</Form.Label>
              <Form.Select
                value={kpiFilters.trans.type}
                onChange={(e) =>
                  setKpiFilters((s) => ({
                    ...s,
                    trans: { ...s.trans, type: getVal(e) as 'all' | 'huile' | 'olive' },
                  }))
                }>
                <option value="all">Tous</option>
                <option value="huile">Huile</option>
                <option value="olive">Olive</option>
              </Form.Select>
            </Form.Group>
          )}

          {showModal === 'payroll' && (
            <Form.Check
              type="switch"
              id="include-overtime"
              label="Inclure les heures supplémentaires"
              checked={kpiFilters.payroll.includeOvertime}
              onChange={(e) =>
                setKpiFilters((s) => ({
                  ...s,
                  payroll: { ...s.payroll, includeOvertime: e.target.checked },
                }))
              }
            />
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .modern-dashboard {
          padding: 1rem;
        }

        .modern-card:hover {
          transform: translateY(-2px);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 0.25rem;
        }

        .summary-chip {
          border: 1px solid ${palette.border};
          background: ${palette.cardBgSoft};
          border-radius: 14px;
          padding: 0.85rem 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .summary-chip-label {
          font-size: 0.8rem;
          color: ${palette.muted};
        }

        .list-line {
          border: 1px solid ${palette.border};
          background: ${palette.cardBgSoft};
          border-radius: 14px;
          padding: 0.85rem 0.95rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .list-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .list-icon.danger {
          background: ${palette.dangerA};
          color: ${palette.danger};
        }

        .list-icon.warning {
          background: ${palette.warningA};
          color: ${palette.warning};
        }

        .empty-state {
          border: 1px dashed ${palette.border};
          border-radius: 14px;
          padding: 1rem;
          text-align: center;
          background: ${palette.cardBgSoft};
        }

        @media (max-width: 767px) {
          .modern-dashboard {
            padding: 0.75rem;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .list-line {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  )
}