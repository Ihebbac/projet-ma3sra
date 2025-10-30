'use client'

import { useEffect, useMemo, useState, ChangeEvent, useCallback } from 'react'
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

// Register controllers/elements/plugins once
ChartJS.register(LineElement, BarElement, ArcElement, PointElement, CategoryScale, LinearScale, RadialLinearScale, Filler, Tooltip, Legend)

// ===== Types =====
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

// ===== Utils =====
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

// ===== Theme (no global Chart.defaults mutation to avoid .call errors) =====
function useThemeColors() {
  const readVars = () => {
    if (typeof window === 'undefined') {
      return {
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
    }
    const roots: Element[] = [document.documentElement, document.body].filter(Boolean) as Element[]
    const css = (el: Element) => getComputedStyle(el as Element)
    const pick = (name: string, fb = '') => {
      for (const el of roots) {
        const v = css(el).getPropertyValue(name)?.trim()
        if (v) return v
      }
      return fb
    }
    const rgb = (name: string, fb: string) => (pick(name) ? `rgb(${pick(name)})` : fb)
    const rgba = (name: string, a: number, fb: string) => (pick(name) ? `rgba(${pick(name)}, ${a})` : fb)
    const body = pick('--bs-body-color', '#212529')
    const grid = pick('--bs-border-color-translucent', pick('--bs-border-color', 'rgba(0,0,0,.1)'))
    const cardBg = pick('--bs-card-bg', pick('--bs-body-bg', '#fff'))
    const fontFamily = getComputedStyle(document.body).fontFamily || 'inherit'

    return {
      primary: rgb('--bs-primary-rgb', 'rgb(13,110,253)'),
      primaryA: rgba('--bs-primary-rgb', 0.35, 'rgba(13,110,253,.35)'),
      success: rgb('--bs-success-rgb', 'rgb(25,135,84)'),
      successA: rgba('--bs-success-rgb', 0.35, 'rgba(25,135,84,.35)'),
      danger: rgb('--bs-danger-rgb', 'rgb(220,53,69)'),
      dangerA: rgba('--bs-danger-rgb', 0.35, 'rgba(220,53,69,.35)'),
      warning: rgb('--bs-warning-rgb', 'rgb(255,193,7)'),
      warningA: rgba('--bs-warning-rgb', 0.35, 'rgba(255,193,7,.35)'),
      info: rgb('--bs-info-rgb', 'rgb(13,202,240)'),
      infoA: rgba('--bs-info-rgb', 0.35, 'rgba(13,202,240,.35)'),
      secondary: rgb('--bs-secondary-rgb', 'rgb(108,117,125)'),
      secondaryA: rgba('--bs-secondary-rgb', 0.35, 'rgba(108,117,125,.35)'),
      body,
      grid,
      cardBg,
      fontFamily,
    }
  }

  const [c, setC] = useState(readVars)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setC(readVars())
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme', 'class', 'style'] })
    const obsBody = new MutationObserver(update)
    obsBody.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] })
    return () => {
      obs.disconnect()
      obsBody.disconnect()
    }
  }, [])

  return c
}

// ===== Component =====
export default function DashboardClient() {
  // Quick ranges
  const [quick, setQuick] = useState<'all' | 'today' | 'month' | 'year'>('month')
  const now = new Date()
  const todayISO = format(now, 'yyyy-MM-dd')
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1

  // Date filters
  const [granularity, setGranularity] = useState<'day' | 'month' | 'year'>('day')
  const [year, setYear] = useState<string>('all')
  const [month, setMonth] = useState<string>('all')
  const [from, setFrom] = useState<string>('') // yyyy-mm-dd
  const [to, setTo] = useState<string>('') // yyyy-mm-dd

  // Advanced filters
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
  const openModal = (key: keyof typeof kpiFilters) => setShowModal(key)
  const closeModal = () => setShowModal(null)

  // Data
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [fitoura, setFitoura] = useState<Fitoura[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [caisse, setCaisse] = useState<Caisse[]>([])
  const [employes, setEmployes] = useState<Employe[]>([])

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

  // Years options
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

  // Quick ranges
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Filtered
  const clientsF = useMemo(() => clients.filter((c) => dateFilter(c.dateCreation)), [clients, year, month, fromDate, toDate])
  const fitouraF = useMemo(() => fitoura.filter((f) => dateFilter(f.createdAt || f.dateSortie)), [fitoura, year, month, fromDate, toDate])
  const transactionsF = useMemo(() => transactions.filter((t) => dateFilter(t.date)), [transactions, year, month, fromDate, toDate])
  const caisseF = useMemo(() => caisse.filter((ca) => dateFilter(ca.date)), [caisse, year, month, fromDate, toDate])

  // KPIs
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

  // ===== Charts data =====
  const colors = useThemeColors()
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

  // Shared options (NO global defaults)
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
        // robust for all charts
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

  const StatShell = ({
    icon,
    color,
    title,
    value,
    suffix,
    onOpenFilters,
    sub,
  }: {
    icon: JSX.Element
    color: 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'danger'
    title: string
    value: number
    suffix?: string
    onOpenFilters?: () => void
    sub?: string
  }) => (
    <Card className="h-100 position-relative">
      {onOpenFilters && (
        <Button variant="link" className="position-absolute top-0 end-0 p-2 text-muted" onClick={onOpenFilters} aria-label="Filtre avancé">
          <TbSettings />
        </Button>
      )}
      <CardBody>
        <div className="d-flex justify-content-between align-items-center">
          <div className="avatar fs-60 avatar-img-size flex-shrink-0">
            <span className={`avatar-title bg-${color}-subtle text-${color} rounded-circle fs-24`}>{icon}</span>
          </div>
          <div className="text-end">
            <h3 className="mb-2 fw-normal">
              <CountUpClient end={Number(value) || 0} suffix={suffix} />
            </h3>
            <p className="mb-0 text-muted">{title}</p>
            {sub && (
              <div className="mt-1">
                <Badge bg="secondary" pill>
                  {sub}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )

  return (
    <>
      {/* QUICK RANGES + REFRESH */}
      <Card className="mb-3">
        <CardBody>
          <Row className="g-3 align-items-end">
            <Col md="auto">
              <Form.Label className="mb-1">Plage rapide</Form.Label>
              <ButtonGroup>
                {(['today', 'month', 'year', 'all'] as const).map((q) => (
                  <Button key={q} variant={quick === q ? 'primary' : 'outline-primary'} onClick={() => setQuick(q)}>
                    {q === 'today' ? 'Aujourd’hui' : q === 'month' ? 'Ce mois' : q === 'year' ? 'Cette année' : 'Tout'}
                  </Button>
                ))}
              </ButtonGroup>
            </Col>

            <Col md="auto">
              <Form.Label className="mb-1">Granularité</Form.Label>
              <ButtonGroup>
                {(['day', 'month', 'year'] as const).map((g) => (
                  <Button key={g} variant={granularity === g ? 'secondary' : 'outline-secondary'} onClick={() => setGranularity(g)}>
                    {g === 'day' ? 'Jour' : g === 'month' ? 'Mois' : 'Année'}
                  </Button>
                ))}
              </ButtonGroup>
            </Col>

            <Col md={2}>
              <Form.Label className="mb-1">Année</Form.Label>
              <Form.Select
                value={year}
                onChange={(e) => {
                  const y = getVal(e)
                  setYear(y)
                  if (y === 'all') setMonth('all')
                  setQuick('all')
                }}>
                <option value="all">Toutes</option>
                {yearsOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="mb-1">Mois</Form.Label>
              <Form.Select
                value={month}
                onChange={(e) => {
                  setMonth(getVal(e))
                  setQuick('all')
                }}
                disabled={year === 'all'}>
                <option value="all">Tous</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="mb-1">De</Form.Label>
              <Form.Control
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(getVal(e))
                  setQuick('all')
                }}
              />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">À</Form.Label>
              <Form.Control
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(getVal(e))
                  setQuick('all')
                }}
              />
            </Col>

            <Col md="auto" className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setYear('all')
                  setMonth('all')
                  setFrom('')
                  setTo('')
                  setQuick('all')
                }}>
                Réinitialiser
              </Button>
              <Button variant="outline-info" onClick={fetchData}>
                <TbRefresh className="me-1" /> Actualiser
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* KPI CARDS */}
      <Row className="row-cols-xxl-6 row-cols-md-3 row-cols-1 g-3">
        <Col>
          <StatShell
            icon={<TbDropletFilled />}
            color="primary"
            title="Huile produite"
            value={kOil}
            suffix=" L"
            onOpenFilters={() => openModal('oil')}
          />
        </Col>
        <Col>
          <StatShell
            icon={<TbChecklist />}
            color="success"
            title="Olive nette traitée"
            value={kOlive}
            suffix=" kg"
            onOpenFilters={() => openModal('olive')}
          />
        </Col>
        <Col>
          <StatShell
            icon={<TbScale />}
            color="warning"
            title="Taux moyen (nisba)"
            value={Number(kNisba.toFixed(2))}
            suffix="%"
            onOpenFilters={() => openModal('nisba')}
          />
        </Col>
        <Col>
          <StatShell
            icon={<TbChartBar />}
            color="info"
            title="Clients payés"
            value={Number(kPaid.pct.toFixed(1))}
            suffix="%"
            onOpenFilters={() => openModal('paid')}
            sub={`${kPaid.paidCount}/${kPaid.total}`}
          />
        </Col>
        <Col>
          <StatShell
            icon={<TbCash />}
            color="secondary"
            title="Solde caisse"
            value={Number(kCaisse.balance.toFixed(2))}
            onOpenFilters={() => openModal('caisse')}
            sub={`Crédit ${kCaisse.credits.toFixed(2)} · Débit ${kCaisse.debits.toFixed(2)}`}
          />
        </Col>
        <Col>
          <StatShell
            icon={<TbTruck />}
            color="danger"
            title="Fitoura · Poids net"
            value={kFitoura.poidsNet}
            suffix=" kg"
            onOpenFilters={() => openModal('fitoura')}
            sub={`${kFitoura.count} entrées`}
          />
        </Col>
      </Row>

      <Row className="row-cols-xxl-6 row-cols-md-3 row-cols-1 g-3 mt-1">
        <Col>
          <StatShell icon={<TbUsers />} color="primary" title="Clients (total)" value={kClientsCount} onOpenFilters={() => openModal('clients')} />
        </Col>
        <Col>
          <StatShell icon={<TbPackage />} color="success" title="Nombre de caisses" value={kNbCaisses} onOpenFilters={() => openModal('caisses')} />
        </Col>
        <Col>
          <StatShell
            icon={<TbDelta />}
            color="warning"
            title="Écart huile (abs.)"
            value={Number(kEcartHuile.toFixed(2))}
            suffix=" L"
            onOpenFilters={() => openModal('ecart')}
          />
        </Col>
        <Col>
          <StatShell icon={<TbReceipt2 />} color="info" title="Crédits clients (caisse)" value={Number(kCreditsClients.toFixed(2))} />
        </Col>
        <Col>
          <StatShell
            icon={<TbArrowsExchange />}
            color="secondary"
            title="Transactions"
            value={kTransactionsCount}
            onOpenFilters={() => openModal('trans')}
          />
        </Col>
        <Col>
          <StatShell
            icon={<TbCashBanknote />}
            color="danger"
            title="Paie restante"
            value={Number(kPayroll.remaining.toFixed(2))}
            onOpenFilters={() => openModal('payroll')}
            sub={`Due ${kPayroll.due.toFixed(2)} · Payée ${kPayroll.paid.toFixed(2)}`}
          />
        </Col>
      </Row>

      {/* CHARTS */}
      <Row className="mt-4 g-3">
        <Col lg={6}>
          <Card className="h-100">
            <CardBody style={{ height: 320 }}>
              <h5 className="mb-3">Huile produite par {granularity === 'year' ? 'année' : granularity === 'month' ? 'mois' : 'jour'}</h5>
              <Line
                data={{
                  labels: oilLabels,
                  datasets: [
                    {
                      label: 'Huile (L)',
                      data: oilSeries,
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryA,
                      pointBackgroundColor: colors.cardBg,
                      pointBorderColor: colors.primary,
                      pointRadius: 3,
                      fill: true,
                      tension: 0.35,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: commonPlugins,
                  interaction: { mode: 'index', intersect: false },
                  scales: { ...commonScales },
                }}
              />
            </CardBody>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <CardBody style={{ height: 320 }}>
              <h5 className="mb-3">Crédits vs Débits ({granularity})</h5>
              <Bar
                data={{
                  labels: cashLabels,
                  datasets: [
                    {
                      label: 'Crédits',
                      data: creditsSeries,
                      borderColor: colors.success,
                      backgroundColor: colors.successA,
                      borderWidth: 2,
                      stack: 'cash',
                    },
                    {
                      label: 'Débits',
                      data: debitsSeries,
                      borderColor: colors.danger,
                      backgroundColor: colors.dangerA,
                      borderWidth: 2,
                      stack: 'cash',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: commonPlugins,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    x: { ...commonScales.x, stacked: true },
                    y: { ...commonScales.y, stacked: true },
                  },
                }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col lg={6}>
          <Card className="h-100">
            <CardBody style={{ height: 300 }}>
              <h5 className="mb-3">Solde cumulé (caisse)</h5>
              <Line
                data={{
                  labels: cashLabels,
                  datasets: [
                    {
                      label: 'Solde (cum.)',
                      data: cumulativeBalance,
                      borderColor: colors.info,
                      backgroundColor: colors.infoA,
                      pointBackgroundColor: colors.cardBg,
                      pointBorderColor: colors.info,
                      pointRadius: 2,
                      fill: true,
                      tension: 0.25,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: commonPlugins,
                  interaction: { mode: 'index', intersect: false },
                  scales: { ...commonScales },
                }}
              />
            </CardBody>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <CardBody style={{ height: 300 }}>
              <h5 className="mb-3">Top 5 clients · Huile (L)</h5>
              <Bar
                data={{
                  labels: topClients.map((c) => c.nomPrenom),
                  datasets: [
                    {
                      label: 'Huile (L)',
                      data: topClients.map((c) => c.quantiteHuile || 0),
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryA,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: commonPlugins,
                  interaction: { mode: 'index', intersect: false },
                  scales: { ...commonScales },
                }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col lg={4}>
          <Card className="h-200">
            <CardBody style={{ height: 500, position: 'relative' }}>
              <h5 className="mb-3">Répartition clients</h5>
              <Doughnut
                data={(() => {
                  const showOthers = kpiFilters.paid.includeNonPaye
                  const labels = ['Payé', 'Non payé', ...(showOthers ? ['Autres'] : [])]
                  const values = [clientDistribution.paid, clientDistribution.nonPaid, ...(showOthers ? [clientDistribution.other] : [])]
                  return {
                    labels,
                    datasets: [
                      {
                        data: values,
                        backgroundColor: [colors.success, colors.danger, ...(showOthers ? [colors.secondary] : [])],
                        borderColor: Array(labels.length).fill(colors.cardBg),
                        borderWidth: 1,
                      },
                    ],
                  }
                })()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    ...commonPlugins,
                    legend: { position: 'bottom', labels: { color: colors.body, usePointStyle: true } },
                    tooltip: {
                      ...commonPlugins.tooltip,
                      callbacks: {
                        label: (ctx: any) => {
                          const raw = Number(ctx.parsed) || 0
                          const dataset = (ctx.dataset?.data as number[]) || []
                          const total = dataset.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
                          const pct = total ? (raw / total) * 100 : 0
                          return `${ctx.label}: ${nf.format(raw)} (${pct.toFixed(1)}%)`
                        },
                      },
                    },
                  },
                  interaction: { mode: 'nearest', intersect: true },
                }}
              />
              {clientDistribution.paid + clientDistribution.nonPaid + clientDistribution.other === 0 && (
                <div className="position-absolute top-50 start-50 translate-middle text-muted small" style={{ pointerEvents: 'none' }}>
                  Aucune donnée pour cette plage/filtre
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="h-100">
            <CardBody style={{ height: 300 }}>
              <h5 className="mb-3">Ratios qualité (moyenne)</h5>
              <Radar
                data={{
                  labels: ['Nisba (%)', 'Kattou3', 'Huile/Qfza'],
                  datasets: [
                    {
                      label: 'Moyenne',
                      data: [avgNisba, avgKattou3, avgHuileParQfza],
                      borderColor: colors.warning,
                      backgroundColor: colors.warningA,
                      pointBackgroundColor: colors.cardBg,
                      pointBorderColor: colors.warning,
                      borderWidth: 2,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: commonPlugins,
                  interaction: { mode: 'nearest', intersect: true },
                  scales: {
                    r: {
                      grid: { color: colors.grid },
                      angleLines: { color: colors.grid },
                      pointLabels: { color: colors.body },
                      ticks: { color: colors.body, backdropColor: 'transparent' },
                    },
                  },
                }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* NEW CHARTS */}
      <Row className="mt-3 g-3">
        <Col lg={6}>
          <Card className="h-100">
            <CardBody style={{ height: 320 }}>
              <h5 className="mb-3">Fitoura — Montant vs Poids</h5>
              <Bar
                data={{
                  labels: fitouraLabels,
                  datasets: [
                    {
                      type: 'bar',
                      label: 'Montant total',
                      data: fitouraMontant,
                      yAxisID: 'y',
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryA,
                      borderWidth: 2,
                    },
                    {
                      type: 'line',
                      label: 'Poids net (kg)',
                      data: fitouraPoids,
                      yAxisID: 'y1',
                      borderColor: colors.info,
                      backgroundColor: colors.infoA,
                      pointBackgroundColor: colors.cardBg,
                      pointBorderColor: colors.info,
                      pointRadius: 2,
                      fill: true,
                      tension: 0.25,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: commonPlugins,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    x: { ...commonScales.x },
                    y: { ...commonScales.y, position: 'left', title: { display: true, text: 'Montant', color: colors.body } },
                    y1: {
                      ...commonScales.y,
                      position: 'right',
                      grid: { drawOnChartArea: false, color: colors.grid },
                      title: { display: true, text: 'Poids (kg)', color: colors.body },
                    },
                  },
                }}
              />
            </CardBody>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <CardBody style={{ height: 320 }}>
              <h5 className="mb-3">Transactions — Huile vs Olive</h5>
              <Line
                data={{
                  labels: transLabels,
                  datasets: [
                    {
                      label: 'Huile',
                      data: transHuile,
                      borderColor: colors.success,
                      backgroundColor: colors.successA,
                      pointBackgroundColor: colors.cardBg,
                      pointBorderColor: colors.success,
                      pointRadius: 2,
                      fill: true,
                      tension: 0.25,
                    },
                    {
                      label: 'Olive',
                      data: transOlive,
                      borderColor: colors.warning,
                      backgroundColor: colors.warningA,
                      pointBackgroundColor: colors.cardBg,
                      pointBorderColor: colors.warning,
                      pointRadius: 2,
                      fill: true,
                      tension: 0.25,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: commonPlugins,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    x: { ...commonScales.x },
                    y: { ...commonScales.y },
                  },
                }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* MODALS */}
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
          {showModal === 'olive' && (
            <Form.Group className="mb-3">
              <Form.Label>kattou3 minimale</Form.Label>
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
          {showModal === 'nisba' && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nisba min (%)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={kpiFilters.nisba.min}
                    onChange={(e) => setKpiFilters((s) => ({ ...s, nisba: { ...s.nisba, min: getNum(e) } }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nisba max (%)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={kpiFilters.nisba.max}
                    onChange={(e) => setKpiFilters((s) => ({ ...s, nisba: { ...s.nisba, max: getNum(e) } }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}
          {showModal === 'paid' && (
            <Form.Check
              type="switch"
              id="include-non-paye"
              label="Inclure clients sans statut (affiche “Autres”)"
              checked={kpiFilters.paid.includeNonPaye}
              onChange={(e) => setKpiFilters((s) => ({ ...s, paid: { ...s.paid, includeNonPaye: getChecked(e) } }))}
            />
          )}
          {showModal === 'caisse' && (
            <Form.Group>
              <Form.Label>Type de mouvement</Form.Label>
              <Form.Select
                value={kpiFilters.caisse.type}
                onChange={(e) => setKpiFilters((s) => ({ ...s, caisse: { ...s.caisse, type: getVal(e) as any } }))}>
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
                onChange={(e) => setKpiFilters((s) => ({ ...s, fitoura: { ...s.fitoura, status: getVal(e) as any } }))}>
                <option value="all">Tous</option>
                <option value="TERMINE">TERMINE</option>
                <option value="EN_COURS">EN_COURS</option>
              </Form.Select>
            </Form.Group>
          )}
          {showModal === 'clients' && (
            <Form.Group>
              <Form.Label>Statut</Form.Label>
              <Form.Select
                value={kpiFilters.clients.status}
                onChange={(e) => setKpiFilters((s) => ({ ...s, clients: { ...s.clients, status: getVal(e) as any } }))}>
                <option value="all">Tous</option>
                <option value="payé">payé</option>
                <option value="non payé">non payé</option>
              </Form.Select>
            </Form.Group>
          )}
          {showModal === 'caisses' && (
            <Form.Group>
              <Form.Label>Nombre de caisses min</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={kpiFilters.caisses.min}
                onChange={(e: any) => setKpiFilters((s) => ({ ...s, caisses: { ...s.caisses, min: Number(e.target?.value ?? 0) } }))}
              />
            </Form.Group>
          )}
          {showModal === 'ecart' && (
            <Form.Group>
              <Form.Label>Écart min (L)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                step="0.01"
                value={kpiFilters.ecart.min}
                onChange={(e: any) => setKpiFilters((s) => ({ ...s, ecart: { ...s.ecart, min: Number(e.target?.value ?? 0) } }))}
              />
            </Form.Group>
          )}
          {showModal === 'trans' && (
            <Form.Group>
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={kpiFilters.trans.type}
                onChange={(e) => setKpiFilters((s) => ({ ...s, trans: { ...s.trans, type: getVal(e) as any } }))}>
                <option value="all">Tous</option>
                <option value="huile">Huile</option>
                <option value="olive">Olive</option>
              </Form.Select>
            </Form.Group>
          )}
          {showModal === 'payroll' && (
            <Form.Check
              type="switch"
              id="include-ot"
              label="Inclure heures supplémentaires"
              checked={kpiFilters.payroll.includeOvertime}
              onChange={(e) => setKpiFilters((s) => ({ ...s, payroll: { ...s.payroll, includeOvertime: getChecked(e) } }))}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {loading && <div className="mt-3 text-muted">Chargement des données…</div>}
    </>
  )
}
