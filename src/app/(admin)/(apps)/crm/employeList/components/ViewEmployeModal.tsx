'use client'
import React, { useMemo } from 'react'
import { Modal, Button, Row, Col, Badge, Table } from 'react-bootstrap'

type ViewEmployeModalProps = {
  show: boolean
  onHide: () => void
  employe: any
}

const joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const ViewEmployeModal = ({ show, onHide, employe }: ViewEmployeModalProps) => {
  // Convertir les dates travaillées en objets Date, en tenant compte des heures supplémentaires
  const datesTravailles = useMemo(() => {
    if (!employe?.joursTravailles) return []
    return employe.joursTravailles.map((d: { date: string }) => new Date(d.date))
  }, [employe])

  // Convertir les jours payés en objets Date
  const joursPayes = useMemo(() => {
    if (!employe?.joursPayes) return []
    return employe.joursPayes.map((d: string) => new Date(d))
  }, [employe])

  // Regrouper par mois
  const groupedByMonth = useMemo(() => {
    const grouped: Record<string, Date[]> = {}
    datesTravailles.forEach((date: Date) => {
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(date)
    })
    return grouped
  }, [datesTravailles])

  // Regrouper les jours par semaine (1 à 5) selon la date
  const getWeeksInMonth = (dates: Date[]) => {
    const weeks: Record<number, Date[]> = {}
    dates.forEach((date) => {
      const weekOfMonth = Math.ceil(date.getDate() / 7)
      if (!weeks[weekOfMonth]) weeks[weekOfMonth] = []
      weeks[weekOfMonth].push(date)
    })
    return weeks
  }

  if (!employe) return null

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Détails de l'employé</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Informations principales */}
        <Row className="g-3 mb-3">
          <Col md={6}>
            <strong>Nom :</strong> {employe.nom}
          </Col>
          <Col md={6}>
            <strong>Prénom :</strong> {employe.prenom}
          </Col>
          <Col md={6}>
            <strong>Téléphone :</strong> {employe.numTel}
          </Col>
          <Col md={6}>
            <strong>Poste :</strong> {employe.poste}
          </Col>
          <Col md={6}>
            <strong>Salaire journalier :</strong> {employe.montantJournalier} DT
          </Col>
          <Col md={6}>
            <strong>Heures supplémentaires :</strong> {employe.montantHeure} DT
          </Col>
        </Row>

        <hr />

        <h6 className="mb-3">
          <strong>Jours travaillés</strong> <Badge bg="primary">{datesTravailles.length}</Badge>
        </h6>

        {datesTravailles.length === 0 && <p className="text-muted">Aucun jour travaillé enregistré</p>}

        {/* Boucle sur chaque mois */}
        {Object.entries(groupedByMonth).map(([mois, dates], idx) => {
          const [annee, m] = mois.split('-').map(Number)
          const nbJours = new Date(annee, m, 0).getDate()
          const datesTravaillesStr = dates.map((d) => d.toDateString())

          const startDay = new Date(annee, m - 1, 1).getDay()
          const offset = startDay === 0 ? 6 : startDay - 1

          // Groupement des semaines
          const semaines = getWeeksInMonth(dates)

          // Calcul du total du mois
          const totalMois = Object.values(semaines).reduce((acc, semainesJours) => {
            const semaineTotal = semainesJours.reduce((weekAcc, date) => {
              const jourTravaille = employe.joursTravailles.find(
                (jour: { date: string }) => new Date(jour.date).toDateString() === date.toDateString(),
              )
              const salaireBase = employe.montantJournalier
              const heuresSup = jourTravaille ? jourTravaille.heuresSup * employe.montantHeure : 0
              return weekAcc + salaireBase + heuresSup
            }, 0)
            return acc + semaineTotal
          }, 0)

          return (
            <div key={idx} className="mb-5">
              <h5 className="mb-3">📅 {new Date(annee, m - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</h5>

              {/* Tableau du salaire hebdomadaire */}
              <Table bordered hover size="sm" className="mb-4">
                <thead className="table-light">
                  <tr>
                    <th>Semaine</th>
                    <th>Jours travaillés</th>
                    <th>Taux journalier (DT)</th>
                    <th>Salaire de la semaine (DT)</th>
                    <th>Heures supplémentaires (DT)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(semaines).map(([numSemaine, jours]) => {
                    const salaireSemaine = jours.length * employe.montantJournalier
                    const heuresSupTotal = jours.reduce((total, date) => {
                      const jourTravaille = employe.joursTravailles.find(
                        (jour: { date: string }) => new Date(jour.date).toDateString() === date.toDateString(),
                      )
                      return total + (jourTravaille ? jourTravaille.heuresSup * employe.montantHeure : 0)
                    }, 0)

                    return (
                      <tr key={numSemaine}>
                        <td>Semaine {numSemaine} du mois</td>
                        <td>{jours.length}</td>
                        <td>{employe.montantJournalier}</td>
                        <td>
                          <strong>{salaireSemaine}</strong>
                        </td>
                        <td>
                          <strong>{heuresSupTotal} DT</strong>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="table-success">
                    <td colSpan={4}>
                      <strong>Total du mois</strong>
                    </td>
                    <td>
                      <strong>{totalMois} DT</strong>
                    </td>
                  </tr>
                </tbody>
              </Table>

              {/* Grille des jours travaillés */}
              <div className="d-flex flex-wrap border rounded p-2 bg-light">
                {joursSemaine.map((j) => (
                  <div key={j} className="text-center fw-bold" style={{ width: '13.8%', marginBottom: '4px' }}>
                    {j}
                  </div>
                ))}

                {/* Décalage avant le premier jour */}
                {Array(offset)
                  .fill(null)
                  .map((_, i) => (
                    <div key={`empty-${i}`} style={{ width: '13.8%', height: '40px' }} />
                  ))}

                {/* Affichage du mois */}
                {Array.from({ length: nbJours }, (_, i) => {
                  const currentDate = new Date(annee, m - 1, i + 1)
                  const estTravaille = datesTravaillesStr.includes(currentDate.toDateString())
                  const isPaid = joursPayes.some((date: any) => date.toDateString() === currentDate.toDateString())
                  const jourTravaille = employe.joursTravailles.find(
                    (jour: { date: string }) => new Date(jour.date).toDateString() === currentDate.toDateString(),
                  )
                  const heuresSup = jourTravaille ? jourTravaille.heuresSup : 0
                  const heuresSupTotal = heuresSup * employe.montantHeure

                  return (
                    <div
                      key={i}
                      className={`text-center border rounded m-1 ${estTravaille ? 'bg-primary text-white fw-bold' : 'bg-white'} ${
                        isPaid ? 'border-success' : ''
                      }`}
                      style={{
                        width: '40px',
                        height: '40px',
                        lineHeight: '40px',
                        fontSize: '0.85rem',
                      }}
                      title={currentDate.toLocaleDateString('fr-FR')}>
                      {i + 1} {heuresSup > 0 && <span className="text-warning">(+{heuresSupTotal} DT)</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ViewEmployeModal
