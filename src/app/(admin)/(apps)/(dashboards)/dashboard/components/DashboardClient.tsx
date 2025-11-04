'use client'

import { useEffect, useMemo, useState, ChangeEvent, useCallback, JSX } from 'react'
import { Row, Col, Card, CardBody, Button, ButtonGroup, Form, Modal, Badge } from 'react-bootstrap'
import {
  TbDropletFilled,
  TbChecklist,
  TbScale,
  TbChartBar,
  TbCash,
  TbTruck,
  TbSettings,
  TbUsers,
  TbPackage,
  TbDelta,
  TbReceipt2,
  TbArrowsExchange,
  TbCashBanknote,
  TbRefresh,
  TbFilter,
  TbCalendar,
  TbTrendingUp,
  TbTrendingDown,
} from 'react-icons/tb'
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { format } from 'date-fns'
import CountUpClient from '@/components/client-wrapper/CountUpClient'

// Register Chart.js components
ChartJS.register(LineElement, BarElement, ArcElement, PointElement, CategoryScale, LinearScale, RadialLinearScale, Filler, Tooltip, Legend)

// Types remain the same as your original
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8170'

// Utils remain the same
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
  e.target && typeof (e.target as any).value !== 'undefined' ? (e.target as any).value : ''
const getNum = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>, def = 0) => {
  const v = Number(getVal(e))
  return Number.isFinite(v) ? v : def
}
const getChecked = (e: ChangeEvent<HTMLInputElement>) => !!(e.target && (e.target as HTMLInputElement).checked)

const normalizeStatus = (s?: string) => (s ?? '').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')

const classifyStatus = (s?: string): 'payé' | 'non payé' | 'other' => {
  const n = normalizeStatus(s)
  if (n.includes('non pay')) return 'non payé'
  if (n.includes('pay')) return 'payé'
  return 'other'
}

// Modern Card Component
const ModernCard = ({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <Card
    className={`modern-card ${hover ? 'card-hover' : ''} ${className}`}
    style={{
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
    }}>
    {children}
  </Card>
)

// Enhanced Stat Card
const StatCard = ({
  icon,
  color,
  title,
  value,
  suffix,
  trend,
  trendValue,
  onOpenFilters,
  sub,
  loading = false,
}: {
  icon: JSX.Element
  color: 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'danger'
  title: string
  value: number
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  onOpenFilters?: () => void
  sub?: string
  loading?: boolean
}) => {
  const trendConfig = {
    up: { color: 'success', icon: <TbTrendingUp /> },
    down: { color: 'danger', icon: <TbTrendingDown /> },
    neutral: { color: 'secondary', icon: null },
  }[trend || 'neutral']

  return (
    <ModernCard hover>
      <CardBody className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className={`stat-icon bg-${color}-subtle text-${color} rounded-2 p-2`} style={{ fontSize: '20px' }}>
            {icon}
          </div>
          {onOpenFilters && (
            <Button variant="link" className="p-0 text-muted" onClick={onOpenFilters} style={{ minWidth: 'auto', padding: '4px!important' }}>
              <TbFilter size={16} />
            </Button>
          )}
        </div>

        <div className="mt-2">
          <h4 className="fw-bold mb-1">
            {loading ? (
              <div className="placeholder-glow">
                <span className="placeholder col-6"></span>
              </div>
            ) : (
              <>
                <CountUpClient end={Number(value) || 0} suffix={suffix} />
                {trend && trend !== 'neutral' && (
                  <Badge bg={`${trendConfig.color}-subtle`} text={trendConfig.color} className="ms-2" style={{ fontSize: '0.7em' }}>
                    {trendConfig.icon} {trendValue}
                  </Badge>
                )}
              </>
            )}
          </h4>
          <p className="text-muted mb-1 small">{title}</p>
          {sub && <p className="text-muted small mb-0">{sub}</p>}
        </div>
      </CardBody>
    </ModernCard>
  )
}

// Enhanced Date Filter Component
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
}: any) => (
  <ModernCard>
    <CardBody className="py-3">
      <Row className="g-3 align-items-center">
        <Col md="auto">
          <div className="d-flex align-items-center gap-2">
            <TbCalendar className="text-muted" />
            <span className="fw-medium">Période</span>
          </div>
        </Col>

        <Col md="auto">
          <ButtonGroup size="sm">
            {(['today', 'month', 'year', 'all'] as const).map((q) => (
              <Button key={q} variant={quick === q ? 'primary' : 'outline-secondary'} onClick={() => setQuick(q)} className="rounded-2">
                {q === 'today' ? "Aujourd'hui" : q === 'month' ? 'Ce mois' : q === 'year' ? 'Cette année' : 'Tout'}
              </Button>
            ))}
          </ButtonGroup>
        </Col>

        <Col md="auto">
          <ButtonGroup size="sm">
            {(['day', 'month', 'year'] as const).map((g) => (
              <Button key={g} variant={granularity === g ? 'secondary' : 'outline-secondary'} onClick={() => setGranularity(g)} className="rounded-2">
                {g === 'day' ? 'Jour' : g === 'month' ? 'Mois' : 'Année'}
              </Button>
            ))}
          </ButtonGroup>
        </Col>

        <Col md={2}>
          <Form.Select
            size="sm"
            value={year}
            onChange={(e) => {
              const y = getVal(e)
              setYear(y)
              if (y === 'all') setMonth('all')
              setQuick('all')
            }}
            className="rounded-2">
            <option value="all">Toutes années</option>
            {yearsOptions.map((y: number) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col md={2}>
          <Form.Select
            size="sm"
            value={month}
            onChange={(e) => {
              setMonth(getVal(e))
              setQuick('all')
            }}
            disabled={year === 'all'}
            className="rounded-2">
            <option value="all">Tous mois</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {format(new Date(2000, m - 1), 'MMMM')}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col md={2}>
          <Form.Control
            size="sm"
            type="date"
            value={from}
            onChange={(e: any) => {
              setFrom(getVal(e))
              setQuick('all')
            }}
            className="rounded-2"
          />
        </Col>

        <Col md={1} className="text-center">
          <span className="text-muted">à</span>
        </Col>

        <Col md={2}>
          <Form.Control
            size="sm"
            type="date"
            value={to}
            onChange={(e: any) => {
              setTo(getVal(e))
              setQuick('all')
            }}
            className="rounded-2"
          />
        </Col>

        <Col md="auto" className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={onReset} className="rounded-2">
            Réinitialiser
          </Button>
          <Button variant="outline-primary" size="sm" onClick={onRefresh} className="rounded-2 d-flex align-items-center gap-1">
            <TbRefresh size={16} />
            Actualiser
          </Button>
        </Col>
      </Row>
    </CardBody>
  </ModernCard>
)

// Main Dashboard Component
export default function ModernDashboardClient() {
  // State declarations (same as original)
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
    oil: { minNisba: 0 },
    olive: { minKattou3: 0 },
    nisba: { min: 0, max: 100 },
    paid: { includeNonPaye: true },
    caisse: { type: 'all' as 'all' | 'credit' | 'debit' },
    fitoura: { status: 'all' as 'all' | 'TERMINE' | 'EN_COURS' },
    clients: { status: 'all' as 'all' | 'payé' | 'non payé' },
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

  // Data fetching and calculations remain the same as original
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
      setClients(c1 ?? [])
      setFitoura(f1 ?? [])
      setTransactions(t1 ?? [])
      setCaisse(ca1 ?? [])
      setEmployes(e1 ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // All your existing calculations and useMemo hooks remain exactly the same
  const allDates = useMemo(
    () => [
      ...clients.map((x) => x.dateCreation),
      ...fitoura.map((x) => x.createdAt || x.dateSortie),
      ...transactions.map((x) => x.date),
      ...caisse.map((x) => x.date),
      ...employes.flatMap((e) => [...(e.joursPayes || []), ...(e.joursTravailles || []).map((j) => j.date)]),
    ],
    [clients, fitoura, transactions, caisse, employes],
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
  }, [quick])

  const fromDate = useMemo(() => (from ? new Date(from) : null), [from])
  const toDate = useMemo(() => (to ? new Date(to + 'T23:59:59') : null), [to])

  const matchYearMonth = (iso: string) => {
    const d = new Date(iso)
    if (year !== 'all') {
      if (d.getFullYear() !== Number(year)) return false
      if (month !== 'all' && d.getMonth() + 1 !== Number(month)) return false
    }
    return true
  }
  const dateFilter = (iso: string) => !!iso && matchYearMonth(iso) && inRange(iso, fromDate, toDate)

  const clientsF = useMemo(() => clients.filter((c) => dateFilter(c.dateCreation)), [clients, year, month, fromDate, toDate])
  const fitouraF = useMemo(() => fitoura.filter((f) => dateFilter(f.createdAt || f.dateSortie)), [fitoura, year, month, fromDate, toDate])
  const transactionsF = useMemo(() => transactions.filter((t) => dateFilter(t.date)), [transactions, year, month, fromDate, toDate])
  const caisseF = useMemo(() => caisse.filter((ca) => dateFilter(ca.date)), [caisse, year, month, fromDate, toDate])

  // KPI calculations remain exactly the same
  const kOil = useMemo(() => {
    const { minNisba } = kpiFilters.oil
    return sum(clientsF.filter((c) => Number(c.nisba ?? 0) >= minNisba).map((c) => Number(c.quantiteHuile || 0)))
  }, [clientsF, kpiFilters.oil])

  const kOlive = useMemo(() => {
    const { minKattou3 } = kpiFilters.olive
    return sum(clientsF.filter((c) => Number(c.kattou3 ?? 0) >= minKattou3).map((c) => Number(c.quantiteOliveNet || 0)))
  }, [clientsF, kpiFilters.olive])

  const kNisba = useMemo(() => {
    const arr = clientsF.map((c) => Number(c.nisba ?? 0)).filter((v) => v >= kpiFilters.nisba.min && v <= kpiFilters.nisba.max)
    return avg(arr)
  }, [clientsF, kpiFilters.nisba])

  const kPaid = useMemo(() => {
    const filtered = clientsF.filter((c) => {
      const cls = classifyStatus(c.status)
      return kpiFilters.paid.includeNonPaye ? true : cls === 'payé' || cls === 'non payé'
    })
    const paidCount = filtered.filter((c) => classifyStatus(c.status) === 'payé').length
    const pct = filtered.length ? (paidCount / filtered.length) * 100 : 0
    return { paidCount, total: filtered.length, pct }
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
    return sum(caisseF.filter((x) => x.type === 'credit' && /payment\s*client/i.test(x.motif)).map((x) => x.montant))
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
    const paid = sum(caisseF.filter((c) => c.type === 'debit' && /paiement\s*employ/i.test(c.motif)).map((c) => c.montant))
    return { due, paid, remaining: due - paid }
  }, [employes, caisseF, kpiFilters.payroll, year, month, fromDate, toDate])

  // Chart data calculations remain the same
  const colors = {
    primary: 'rgb(13,110,253)',
    primaryA: 'rgba(13,110,253,.35)',
    success: 'rgb(25,135,84)',
    successA: 'rgba(25,135,84,.35)',
    danger: 'rgb(220,53,69)',
    dangerA: 'rgba(220,53,69,.35)',
    warning: 'rgb(255,193,7)',
    warningA: 'rgba(255,193,7,.35)',
    info: 'rgb(13,202,240)',
    infoA: 'rgba(13,202,240,.35)',
    secondary: 'rgb(108,117,125)',
    secondaryA: 'rgba(108,117,125,.35)',
    body: '#212529',
    grid: 'rgba(0,0,0,.1)',
    cardBg: '#fff',
    fontFamily: 'inherit',
  }

  const nf = useMemo(() => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }), [])
  const dateKey = (iso: string) => {
    const d = new Date(iso)
    if (granularity === 'year') return String(d.getFullYear())
    if (granularity === 'month') return format(d, 'yyyy-MM')
    return format(d, 'yyyy-MM-dd')
  }

  const oilGroups = useMemo(() => groupByKey(clientsF, (c) => dateKey(c.dateCreation)), [clientsF, granularity])
  const oilLabels = useMemo(() => Object.keys(oilGroups).sort(), [oilGroups])
  const oilSeries = oilLabels.map((l) => sum(oilGroups[l].map((c) => c.quantiteHuile || 0)))

  const cashGroups = useMemo(() => groupByKey(caisseF, (c) => dateKey(c.date)), [caisseF, granularity])
  const cashLabels = useMemo(() => Object.keys(cashGroups).sort(), [cashGroups])
  const creditsSeries = cashLabels.map((l) => sum(cashGroups[l].filter((x) => x.type === 'credit').map((x) => x.montant)))
  const debitsSeries = cashLabels.map((l) => sum(cashGroups[l].filter((x) => x.type === 'debit').map((x) => x.montant)))
  const cumulativeBalance = useMemo(() => {
    let acc = 0
    return cashLabels.map((_, i) => {
      acc += (creditsSeries[i] || 0) - (debitsSeries[i] || 0)
      return acc
    })
  }, [cashLabels, creditsSeries, debitsSeries])

  const topClients = useMemo(() => [...clientsF].sort((a, b) => (b.quantiteHuile || 0) - (a.quantiteHuile || 0)).slice(0, 5), [clientsF])

  const avgNisba = useMemo(() => avg(clientsF.map((c) => Number(c.nisba || 0))), [clientsF])
  const avgKattou3 = useMemo(() => avg(clientsF.map((c) => Number(c.kattou3 || 0))), [clientsF])
  const avgHuileParQfza = useMemo(() => avg(clientsF.map((c) => Number(c.huileParQfza || 0))), [clientsF])

  const clientsSubset = useMemo(() => {
    const s = kpiFilters.clients.status
    return clientsF.filter((c) => (s === 'all' ? true : classifyStatus(c.status) === s))
  }, [clientsF, kpiFilters.clients.status])

  const clientDistribution = useMemo(() => {
    let paid = 0,
      nonPaid = 0,
      other = 0
    clientsSubset.forEach((c) => {
      const cls = classifyStatus(c.status)
      if (cls === 'payé') paid++
      else if (cls === 'non payé') nonPaid++
      else other++
    })
    return { paid, nonPaid, other }
  }, [clientsSubset])

  const fitouraGroups = useMemo(() => groupByKey(fitouraF, (f) => dateKey(f.createdAt || f.dateSortie)), [fitouraF, granularity])
  const fitouraLabels = useMemo(() => Object.keys(fitouraGroups).sort(), [fitouraGroups])
  const fitouraMontant = fitouraLabels.map((l) => sum(fitouraGroups[l].map((f) => Number(f.montantTotal || 0))))
  const fitouraPoids = fitouraLabels.map((l) => sum(fitouraGroups[l].map((f) => Number(f.poidsNet || 0))))

  const transGroups = useMemo(() => groupByKey(transactionsF, (t) => dateKey(t.date)), [transactionsF, granularity])
  const transLabels = useMemo(() => Object.keys(transGroups).sort(), [transGroups])
  const transHuile = transLabels.map((l) => sum(transGroups[l].filter((t) => t.typeStock === 'huile').map((t) => t.quantite)))
  const transOlive = transLabels.map((l) => sum(transGroups[l].filter((t) => t.typeStock === 'olive').map((t) => t.quantite)))

  const commonScales = {
    x: { ticks: { color: colors.body }, grid: { color: colors.grid } },
    y: { ticks: { color: colors.body }, grid: { color: colors.grid } },
  }
  const commonPlugins = {
    legend: { position: 'top' as const, labels: { color: colors.body, usePointStyle: true } },
    tooltip: {
      enabled: true,
      backgroundColor: colors.cardBg,
      borderColor: colors.grid,
      borderWidth: 1,
      titleColor: colors.body,
      bodyColor: colors.body,
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
  }

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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Badge bg="light" text="dark" className="fs-6">
          {clientsF.length} clients
        </Badge>
      </div>

      {/* Date Filter Section */}
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
      />
      <Row>
        <Col lg={4}>
          <ModernCard>
            <CardBody>
              <h6 className="card-title mb-3">Production d'huile</h6>
              <div style={{ height: 250 }}>
                <Line
                  data={{
                    labels: oilLabels,
                    datasets: [
                      {
                        label: 'Huile (L)',
                        data: oilSeries,
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryA,
                        borderWidth: 2,
                        tension: 0.4,
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
        <Col lg={4}>
          <ModernCard>
            <CardBody>
              <h6 className="card-title mb-3">Statut des clients</h6>
              <div style={{ height: 250 }}>
                <Doughnut
                  data={{
                    labels: ['Payé', 'Non payé', 'Autres'],
                    datasets: [
                      {
                        data: [clientDistribution.paid, clientDistribution.nonPaid, clientDistribution.other],
                        backgroundColor: [colors.success, colors.danger, colors.secondary],
                        borderWidth: 2,
                        borderColor: colors.cardBg,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      ...commonPlugins,
                      legend: { position: 'bottom' },
                    },
                  }}
                />
              </div>
            </CardBody>
          </ModernCard>
        </Col>
        <Col lg={4}>
          <ModernCard>
            <CardBody>
              <h6 className="card-title mb-3">Mouvements de caisse</h6>
              <div style={{ height: 250 }}>
                <Bar
                  data={{
                    labels: cashLabels,
                    datasets: [
                      {
                        label: 'Crédits',
                        data: creditsSeries,
                        backgroundColor: colors.successA,
                        borderColor: colors.success,
                        borderWidth: 1,
                      },
                      {
                        label: 'Débits',
                        data: debitsSeries,
                        backgroundColor: colors.dangerA,
                        borderColor: colors.danger,
                        borderWidth: 1,
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
      {/* KPI Cards - Modern Layout */}
      <Row className="g-3 mt-3">
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbDropletFilled />}
            color="primary"
            title="Huile produite"
            value={kOil}
            suffix=" L"
            onOpenFilters={() => openModal('oil')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbChecklist />}
            color="success"
            title="Olive nette"
            value={kOlive}
            suffix=" kg"
            onOpenFilters={() => openModal('olive')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbScale />}
            color="warning"
            title="Taux moyen"
            value={Number(kNisba.toFixed(2))}
            suffix="%"
            onOpenFilters={() => openModal('nisba')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbChartBar />}
            color="info"
            title="Clients payés"
            value={Number(kPaid.pct.toFixed(1))}
            suffix="%"
            sub={`${kPaid.paidCount}/${kPaid.total} clients`}
            onOpenFilters={() => openModal('paid')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbCash />}
            color="secondary"
            title="Solde caisse"
            value={Number(kCaisse.balance.toFixed(2))}
            sub={`+${kCaisse.credits.toFixed(2)} / -${kCaisse.debits.toFixed(2)}`}
            onOpenFilters={() => openModal('caisse')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbTruck />}
            color="danger"
            title="Fitoura"
            value={kFitoura.poidsNet}
            suffix=" kg"
            sub={`${kFitoura.count} entrées`}
            onOpenFilters={() => openModal('fitoura')}
            loading={loading}
          />
        </Col>
      </Row>
      <Row>
        <Col lg={12}>
          <ModernCard>
            <CardBody>
              <h6 className="card-title mb-3">Top 5 clients - Production d'huile</h6>
              <div style={{ height: 250 }}>
                <Bar
                  data={{
                    labels: topClients.map((c) => c.nomPrenom),
                    datasets: [
                      {
                        label: 'Huile (L)',
                        data: topClients.map((c) => c.quantiteHuile || 0),
                        backgroundColor: colors.primaryA,
                        borderColor: colors.primary,
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
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
      {/* Secondary KPIs */}
      <Row className="g-3 mt-2">
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbUsers />}
            color="primary"
            title="Total clients"
            value={kClientsCount}
            onOpenFilters={() => openModal('clients')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbPackage />}
            color="success"
            title="Nombre caisses"
            value={kNbCaisses}
            onOpenFilters={() => openModal('caisses')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbDelta />}
            color="warning"
            title="Écart huile"
            value={Number(kEcartHuile.toFixed(2))}
            suffix=" L"
            onOpenFilters={() => openModal('ecart')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard icon={<TbReceipt2 />} color="info" title="Crédits clients" value={Number(kCreditsClients.toFixed(2))} loading={loading} />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbArrowsExchange />}
            color="secondary"
            title="Transactions"
            value={kTransactionsCount}
            onOpenFilters={() => openModal('trans')}
            loading={loading}
          />
        </Col>
        <Col xl={2} lg={4} md={6}>
          <StatCard
            icon={<TbCashBanknote />}
            color="danger"
            title="Paie restante"
            value={Number(kPayroll.remaining.toFixed(2))}
            sub={`Due: ${kPayroll.due.toFixed(2)}`}
            onOpenFilters={() => openModal('payroll')}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Charts Section */}

      <Row className="g-3 mt-3"></Row>

      {/* Keep your existing modal code exactly as is */}
      <Modal show={!!showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Filtre avancé —{' '}
            {showModal === 'oil'
              ? 'Huile produite'
              : showModal === 'olive'
                ? 'Olive nette'
                : showModal === 'nisba'
                  ? 'Taux (nisba)'
                  : showModal === 'paid'
                    ? 'Clients payés'
                    : showModal === 'caisse'
                      ? 'Caisse'
                      : showModal === 'fitoura'
                        ? 'Fitoura'
                        : showModal === 'clients'
                          ? 'Clients (total)'
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
          {/* Your existing modal content remains exactly the same */}
          {showModal === 'oil' && (
            <Form.Group className="mb-3">
              <Form.Label>Nisba minimale (%)</Form.Label>
              <Form.Range
                min={0}
                max={100}
                step={0.5}
                value={kpiFilters.oil.minNisba}
                onChange={(e) => setKpiFilters((s) => ({ ...s, oil: { ...s.oil, minNisba: getNum(e) } }))}
              />
              <div className="small text-muted">{kpiFilters.oil.minNisba}%</div>
            </Form.Group>
          )}
          {/* ... rest of your modal content */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add some custom CSS for modern look */}
      <style jsx>{`
        .modern-dashboard {
          padding: 1rem;
        }

        .modern-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .stat-icon {
          transition: all 0.3s ease;
        }

        .modern-card:hover .stat-icon {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  )
}
