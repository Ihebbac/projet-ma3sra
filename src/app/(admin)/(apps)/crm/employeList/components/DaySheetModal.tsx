'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap'
import { TbCheck, TbCopy, TbUserX, TbX } from 'react-icons/tb'

type JourTravaille = { date: string; heuresSup: number }

export type Employe = {
  _id: string
  nom: string
  prenom: string
  numTel: string
  poste: string
  montantJournalier: number
  montantHeure: number
  estActif: boolean
  joursPayes: string[]
  joursTravailles: JourTravaille[]
  nomComplet?: string
}

type RowState = {
  present: boolean
  heuresSup: number
  isPaid: boolean
}

type Props = {
  show: boolean
  onHide: () => void
  employes: Employe[]
  apiBaseUrl: string
  onSaved: () => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

const dayKeyFromAny = (x: string) => {
  const d = new Date(x)
  if (isNaN(d.getTime())) return ''
  return d.toDateString()
}
const dayKeyFromYMD = (ymd: string) => dayKeyFromAny(`${ymd}T00:00:00`)

function findWorkEntry(emp: Employe, ymd: string): { entry?: JourTravaille; index: number } {
  const key = dayKeyFromYMD(ymd)
  const arr = Array.isArray(emp.joursTravailles) ? emp.joursTravailles : []
  const idx = arr.findIndex((jt) => dayKeyFromAny(jt.date) === key)
  return { entry: idx >= 0 ? arr[idx] : undefined, index: idx }
}

function isPaidForDate(emp: Employe, ymd: string): boolean {
  const key = dayKeyFromYMD(ymd)
  const arr = Array.isArray(emp.joursPayes) ? emp.joursPayes : []
  return arr.some((p) => dayKeyFromAny(p) === key)
}

function safeEmpPayload(emp: Employe) {
  return {
    _id: emp._id,
    nom: emp.nom,
    prenom: emp.prenom,
    numTel: emp.numTel,
    poste: emp.poste,
    montantJournalier: emp.montantJournalier,
    montantHeure: emp.montantHeure,
    estActif: emp.estActif,
    joursPayes: Array.isArray(emp.joursPayes) ? emp.joursPayes : [],
    joursTravailles: Array.isArray(emp.joursTravailles) ? emp.joursTravailles : [],
  }
}

const DaySheetModal = ({ show, onHide, employes, apiBaseUrl, onSaved }: Props) => {
  const [date, setDate] = useState<string>(toYMD(new Date()))
  const [dayOpen, setDayOpen] = useState<boolean>(true)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [saving, setSaving] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeEmployes = useMemo(() => (Array.isArray(employes) ? employes.filter((e) => e.estActif) : []), [employes])

  const initRows = (targetDate: string) => {
    const hasAnyRecord = activeEmployes.some((emp) => findWorkEntry(emp, targetDate).index >= 0)

    const next: Record<string, RowState> = {}
    activeEmployes.forEach((emp) => {
      const { entry } = findWorkEntry(emp, targetDate)
      const paid = isPaidForDate(emp, targetDate)

      // ✅ si pas encore de pointage ce jour => tout le monde présent par défaut
      const present = hasAnyRecord ? !!entry : true

      next[emp._id] = {
        present,
        heuresSup: entry?.heuresSup ?? 0,
        isPaid: paid,
      }
    })
    setRows(next)
    setDayOpen(true)
  }

  // ✅ quand la modal s'ouvre
  useEffect(() => {
    if (!show) return
    setError(null)
    setDate(toYMD(new Date()))
    // si employes déjà chargés, init direct
    if (activeEmployes.length) initRows(toYMD(new Date()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  // ✅ FIX IMPORTANT : si employes arrivent APRES l'ouverture, on init quand même
  useEffect(() => {
    if (!show) return
    if (!activeEmployes.length) return
    initRows(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployes.length])

  // ✅ si la date change
  useEffect(() => {
    if (!show) return
    if (!activeEmployes.length) return
    initRows(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const totals = useMemo(() => {
    const list = Object.values(rows)
    const present = list.filter((r) => r.present).length
    const absent = list.length - present
    const hs = list.reduce((a, r) => a + (r.present ? (r.heuresSup || 0) : 0), 0)
    return { present, absent, hs }
  }, [rows])

  const setAllPresent = (present: boolean) => {
    setRows((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((id) => {
        if (next[id].isPaid) return
        next[id] = { ...next[id], present }
      })
      return next
    })
  }

  const copyFromPrevDay = () => {
    const d = new Date(`${date}T00:00:00`)
    d.setDate(d.getDate() - 1)
    const prev = toYMD(d)

    setRows((prevRows) => {
      const next = { ...prevRows }
      activeEmployes.forEach((emp) => {
        if (next[emp._id]?.isPaid) return
        const { entry } = findWorkEntry(emp, prev)
        next[emp._id] = {
          ...next[emp._id],
          present: !!entry,
          heuresSup: entry?.heuresSup ?? 0,
        }
      })
      return next
    })
  }

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const saveSheet = async () => {
    try {
      setSaving(true)
      setError(null)

      const effectiveRows = dayOpen
        ? rows
        : Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, { ...r, present: false }]))

      const updates: Promise<void>[] = []

      activeEmployes.forEach((emp) => {
        const r = effectiveRows[emp._id]
        if (!r || r.isPaid) return

        const { index } = findWorkEntry(emp, date)
        const empPayload = safeEmpPayload(emp)
        const jt = Array.isArray(empPayload.joursTravailles) ? [...empPayload.joursTravailles] : []

        let changed = false

        if (r.present) {
          if (index >= 0) {
            const currentHS = jt[index]?.heuresSup ?? 0
            const nextHS = Number(r.heuresSup || 0)
            if (currentHS !== nextHS) {
              jt[index] = { ...jt[index], heuresSup: nextHS }
              changed = true
            }
          } else {
            const iso = new Date(`${date}T00:00:00`).toISOString()
            jt.push({ date: iso, heuresSup: Number(r.heuresSup || 0) })
            changed = true
          }
        } else {
          if (index >= 0) {
            jt.splice(index, 1)
            changed = true
          }
        }

        if (changed) {
          empPayload.joursTravailles = jt
          updates.push(
            fetch(`${apiBaseUrl}/${emp._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(empPayload),
            }).then(async (res) => {
              if (!res.ok) {
                const msg = (await res.json().catch(() => null))?.message
                throw new Error(msg || `Erreur mise à jour: ${emp.prenom} ${emp.nom}`)
              }
            }),
          )
        }
      })

      await Promise.all(updates)
      await onSaved()
      onHide()
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const payerEmploye = async (emp: Employe) => {
    try {
      setPayingId(emp._id)
      setError(null)

      const { entry, index } = findWorkEntry(emp, date)
      if (index < 0 || !entry) {
        setError("Impossible de payer : ce jour n'est pas enregistré comme travaillé pour cet employé.")
        return
      }

      const hs = rows[emp._id]?.heuresSup ?? entry.heuresSup ?? 0

      const res = await fetch(`${apiBaseUrl}/${emp._id}/payer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: entry.date, heuresSup: hs }),
      })
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message
        throw new Error(msg || 'Erreur lors du paiement')
      }

      await onSaved()
      initRows(date)
    } catch (e: any) {
      setError(e?.message || 'Erreur paiement.')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Feuille du jour</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {!activeEmployes.length ? (
          <Alert variant="warning">
            Aucun employé chargé. Ferme la modal et réessaie (ou vérifie que des employés existent et sont actifs).
          </Alert>
        ) : (
          <>
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
              <div className="d-flex gap-2 align-items-center">
                <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 180 }} />
                <Form.Check
                  type="switch"
                  id="dayOpenSwitch"
                  label={dayOpen ? 'Journée travaillée' : 'Journée fermée'}
                  checked={dayOpen}
                  onChange={(e) => setDayOpen(e.target.checked)}
                />
              </div>

              <div className="d-flex gap-2 align-items-center">
                <Badge bg="success">
                  <TbCheck className="me-1" /> Présents: {totals.present}
                </Badge>
                <Badge bg="danger">
                  <TbX className="me-1" /> Absents: {totals.absent}
                </Badge>
                <Badge bg="primary">HS total: {totals.hs}</Badge>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button size="sm" variant="outline-success" onClick={() => setAllPresent(true)}>
                <TbCheck className="me-1" /> Tous présents
              </Button>
              <Button size="sm" variant="outline-danger" onClick={() => setAllPresent(false)}>
                <TbUserX className="me-1" /> Tous absents
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={copyFromPrevDay}>
                <TbCopy className="me-1" /> Copier la veille
              </Button>
            </div>

            <div className="table-responsive">
              <Table bordered hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 220 }}>Employé</th>
                    <th>Poste</th>
                    <th style={{ width: 140 }}>Statut</th>
                    <th style={{ width: 140 }}>Heures sup.</th>
                    <th style={{ width: 120 }}>Paie</th>
                    <th style={{ width: 140 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployes.map((emp) => {
                    const r = rows[emp._id]
                    if (!r) return null

                    const disabled = r.isPaid
                    return (
                      <tr key={emp._id} className={!dayOpen ? 'table-secondary' : !r.present ? 'table-danger' : ''}>
                        <td className="fw-semibold">{emp.prenom} {emp.nom}</td>
                        <td className="text-muted">{emp.poste}</td>

                        <td>
                          <Button
                            size="sm"
                            variant={r.present ? 'success' : 'danger'}
                            disabled={disabled}
                            onClick={() => updateRow(emp._id, { present: !r.present })}
                          >
                            {r.present ? <><TbCheck className="me-1" /> Présent</> : <><TbX className="me-1" /> Absent</>}
                          </Button>
                        </td>

                        <td>
                          <Form.Control
                            type="number"
                            min={0}
                            step={1}
                            value={Number.isFinite(r.heuresSup) ? r.heuresSup : 0}
                            disabled={disabled || !r.present || !dayOpen}
                            onChange={(e) => updateRow(emp._id, { heuresSup: parseFloat(e.target.value) || 0 })}
                          />
                        </td>

                        <td>{r.isPaid ? <Badge bg="success">Payé</Badge> : <Badge bg="warning" text="dark">À payer</Badge>}</td>

                        <td>
                          <Button
                            size="sm"
                            variant={r.isPaid ? 'success' : 'outline-success'}
                            disabled={r.isPaid || payingId === emp._id}
                            onClick={() => payerEmploye(emp)}
                          >
                            {payingId === emp._id ? <><Spinner size="sm" className="me-2" /> Paiement...</> : 'Payer'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={saving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={saveSheet} disabled={saving || !activeEmployes.length}>
          {saving ? <><Spinner size="sm" className="me-2" /> Sauvegarde...</> : 'Sauvegarder la feuille'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default DaySheetModal
