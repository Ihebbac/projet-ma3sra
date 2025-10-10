'use client'
import { useEffect, useState } from 'react'
import { Button, Card, Badge, Spinner, Alert, Modal, Container } from 'react-bootstrap'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'

import { TbCircleFilled, TbCheck, TbX, TbCalendarStats, TbRefresh } from 'react-icons/tb'
import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import useViewPort from '@/hooks/useViewPort'

interface Employe {
  _id: string
  nom: string
  prenom: string
  telephone: string
  poste: string
  salaireJournalier: number
  estActif: boolean
}

interface PresenceEvent {
  id: string
  title: string
  date: string
  backgroundColor: string
  borderColor: string
  extendedProps: {
    employeId: string
    present: boolean
    heuresTravaillees: number
    salaireDuJour: number
    poste: string
  }
}

const API_BASE_URL = 'http://localhost:8170'

const Page = () => {
  const [employes, setEmployes] = useState<Employe[]>([])
  const [events, setEvents] = useState<PresenceEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPresenceModal, setShowPresenceModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { height } = useViewPort()

  // Charger la liste des employés
  const fetchEmployes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/employes`)
      if (!response.ok) throw new Error('Erreur lors du chargement des employés')
      const data = await response.json()
      setEmployes(data)
    } catch (err) {
      console.error(err)
      setError('Impossible de charger la liste des employés.')
    } finally {
      setLoading(false)
    }
  }

  const generatePresenceEvents = () => {
    if (employes.length === 0) return

    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const generatedEvents: PresenceEvent[] = []

    employes.forEach(employe => {
      for (let day = 1; day <= 30; day++) {
        const date = new Date(currentYear, currentMonth, day)
        const isPresent = Math.random() > 0.3 
        if (isPresent) {
          generatedEvents.push({
            id: `${employe._id}-${date.toISOString().split('T')[0]}`,
            title: `${employe.prenom} ${employe.nom}`,
            date: date.toISOString().split('T')[0],
            backgroundColor: '#d1fae5',
            borderColor: '#10b981',
            extendedProps: {
              employeId: employe._id,
              present: true,
              heuresTravaillees: 8,
              salaireDuJour: employe.salaireJournalier,
              poste: employe.poste
            }
          })
        }
      }
    })
    setEvents(generatedEvents)
  }

  useEffect(() => {
    fetchEmployes()
  }, [])

  useEffect(() => {
    if (employes.length > 0) generatePresenceEvents()
  }, [employes])

  const marquerPresence = async (employeId: string, date: Date, present: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employes/${employeId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          heuresTravaillees: present ? 8 : 0,
        }),
      })
      if (!response.ok) throw new Error('Erreur lors du marquage de présence')

      const eventId = `${employeId}-${date.toISOString().split('T')[0]}`
      if (present) {
        const employe = employes.find(e => e._id === employeId)
        if (employe) {
          const newEvent: PresenceEvent = {
            id: eventId,
            title: `${employe.prenom} ${employe.nom}`,
            date: date.toISOString().split('T')[0],
            backgroundColor: '#d1fae5',
            borderColor: '#10b981',
            extendedProps: {
              employeId,
              present: true,
              heuresTravaillees: 8,
              salaireDuJour: employe.salaireJournalier,
              poste: employe.poste
            }
          }
          setEvents(prev => [...prev.filter(e => e.id !== eventId), newEvent])
        }
      } else {
        setEvents(prev => prev.filter(e => e.id !== eventId))
      }
    } catch (err) {
      console.error(err)
      setError('Erreur lors du marquage de présence.')
    }
  }

  const getPresenceForDate = (employeId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.find(e => e.extendedProps.employeId === employeId && e.date === dateStr)
  }

  const onDateClick = (arg: any) => {
    setSelectedDate(arg.date)
    setShowPresenceModal(true)
  }

  const onEventClick = (arg: any) => {
    const e = arg.event
    const props = e.extendedProps
    alert(`${e.title} - ${props.present ? 'Présent' : 'Absent'}
Poste: ${props.poste}
Heures: ${props.heuresTravaillees}h
Salaire: ${props.salaireDuJour} Dinar`)
  }

  const renderEventContent = (info: any) => {
    const { present, heuresTravaillees } = info.event.extendedProps
    return (
      <div className="d-flex justify-content-between align-items-center p-1">
        <span>
          <TbCircleFilled
            size={8}
            className={present ? 'text-success me-1' : 'text-danger me-1'}
          />
          {info.event.title}
        </span>
        {present && (
          <Badge bg="success" className="fs-xs">{heuresTravaillees}h</Badge>
        )}
      </div>
    )
  }

  const handleRefresh = () => fetchEmployes()

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Calendrier des Présences</h4>
        <div className="d-flex gap-2 align-items-center">
          <Badge bg="success"><TbCheck className="me-1" /> Présent</Badge>
          <Badge bg="danger"><TbX className="me-1" /> Absent</Badge>
          <Button variant="outline-primary" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : <TbRefresh />}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="d-flex flex-column flex-lg-row gap-3">
        {/* Liste employés */}
        <Card className="flex-shrink-0" style={{ width: 320, maxHeight: height - 180, overflowY: 'auto' }}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center">
                <TbCalendarStats className="me-2 text-primary" />
                <h6 className="mb-0">Employés</h6>
              </div>
              <Badge bg="primary">{employes.length}</Badge>
            </div>
            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : (
              employes.map(emp => (
                <div
                  key={emp._id}
                  className={`d-flex justify-content-between align-items-center p-2 mb-2 rounded border ${
                    emp.estActif ? 'bg-primary-subtle border-primary' : 'bg-light text-muted'
                  }`}
                >
                  <div>
                    <div className="fw-bold">{emp.prenom} {emp.nom}</div>
                    <small>{emp.poste}</small>
                  </div>
                  <Badge bg="light" text="dark">{emp.salaireJournalier} DT/j</Badge>
                </div>
              ))
            )}
          </Card.Body>
        </Card>

        {/* Calendrier */}
        <Card className="flex-grow-1">
          <SimplebarClient style={{ height: height - 180 }}>
            <FullCalendar
              initialView="dayGridMonth"
              plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
              }}
              height="auto"
              selectable
              events={events}
              dateClick={onDateClick}
              eventClick={onEventClick}
              eventContent={renderEventContent}
              locale="fr"
              firstDay={1}
            />
          </SimplebarClient>
        </Card>
      </div>

      {/* Modal */}
      <Modal show={showPresenceModal} onHide={() => setShowPresenceModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Gestion des présences –{' '}
            {selectedDate &&
              selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {employes.map(emp => {
            const presence = selectedDate ? getPresenceForDate(emp._id, selectedDate) : undefined
            const isPresent = !!presence
            return (
              <div key={emp._id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  <div className="fw-bold">{emp.prenom} {emp.nom}</div>
                  <small className="text-muted">{emp.poste} – {emp.salaireJournalier} DT/j</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg={isPresent ? 'success' : 'danger'}>
                    {isPresent ? 'Présent' : 'Absent'}
                  </Badge>
                  <Button
                    size="sm"
                    variant={isPresent ? 'outline-danger' : 'outline-success'}
                    onClick={() => marquerPresence(emp._id, selectedDate!, !isPresent)}
                  >
                    {isPresent ? 'Marquer absent' : 'Marquer présent'}
                  </Button>
                </div>
              </div>
            )
          })}
        </Modal.Body>
        <Modal.Footer>
          <div className="text-muted small">
            Total employés actifs : {employes.filter(e => e.estActif).length}
          </div>
          <Button variant="secondary" onClick={() => setShowPresenceModal(false)}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default Page
