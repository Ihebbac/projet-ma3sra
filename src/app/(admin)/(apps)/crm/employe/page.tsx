'use client'
import { useEffect, useRef, useState } from 'react'
import { Button, Card, CardBody, Container, Badge, Spinner, Alert } from 'react-bootstrap'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'

import useViewPort from '@/hooks/useViewPort'
import { TbCircleFilled, TbCheck, TbX, TbCalendarStats, TbRefresh } from 'react-icons/tb'
import SimplebarClient from '@/components/client-wrapper/SimplebarClient'

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

  // Charger les employés
  const fetchEmployes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/employes`)
      if (!response.ok) throw new Error('Erreur lors du chargement des employés')
      const data = await response.json()
      setEmployes(data)
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error)
      setError('Impossible de charger la liste des employés')
    } finally {
      setLoading(false)
    }
  }

  // Générer les événements de présence à partir des employés
  const generatePresenceEvents = async () => {
    if (employes.length === 0) return

    try {
      setError(null)
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      // Pour cet exemple, on génère des événements pour le mois courant
      // Dans un cas réel, vous devriez avoir un endpoint pour récupérer les présences
      const generatedEvents: PresenceEvent[] = []

      employes.forEach(employe => {
        // Générer quelques jours de présence aléatoires pour la démo
        for (let day = 1; day <= 30; day++) {
          const date = new Date(currentYear, currentMonth, day)
          const isPresent = Math.random() > 0.3 // 70% de présence
          
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
    } catch (error) {
      console.error('Erreur lors de la génération des présences:', error)
      setError('Erreur lors du chargement des présences')
    }
  }

  useEffect(() => {
    fetchEmployes()
  }, [])

  useEffect(() => {
    if (employes.length > 0) {
      generatePresenceEvents()
    }
  }, [employes])

  // Marquer la présence d'un employé
  const marquerPresence = async (employeId: string, date: Date, present: boolean = true) => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/employes/${employeId}/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date.toISOString(),
          heuresTravaillees: present ? 8 : 0,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors du marquage de présence')

      // Mettre à jour les événements localement
      const eventId = `${employeId}-${date.toISOString().split('T')[0]}`
      
      if (present) {
        const employe = employes.find(emp => emp._id === employeId)
        if (employe) {
          const newEvent: PresenceEvent = {
            id: eventId,
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
          }
          setEvents(prev => [...prev.filter(e => e.id !== eventId), newEvent])
        }
      } else {
        // Supprimer l'événement de présence
        setEvents(prev => prev.filter(e => e.id !== eventId))
      }

    } catch (error) {
      console.error('Erreur lors du marquage de présence:', error)
      setError('Erreur lors du marquage de présence')
    }
  }

  // Vérifier si un employé est présent à une date donnée
  const getPresenceForDate = (employeId: string, date: Date): PresenceEvent | undefined => {
    const dateStr = date.toISOString().split('T')[0]
    return events.find(event => 
      event.extendedProps.employeId === employeId && 
      event.date === dateStr
    )
  }

  // Gérer le clic sur une date
  const onDateClick = (arg: any) => {
    setSelectedDate(arg.date)
    setShowPresenceModal(true)
  }

  // Gérer le clic sur un événement
  const onEventClick = (arg: any) => {
    const event = arg.event
    const extendedProps = event.extendedProps
    console.log('Événement cliqué:', extendedProps)
    
    // Afficher les détails de la présence
    alert(`${event.title} - ${extendedProps.present ? 'Présent' : 'Absent'}\nPoste: ${extendedProps.poste}\nHeures: ${extendedProps.heuresTravaillees}h\nSalaire: ${extendedProps.salaireDuJour}dinar`)
  }

  // Fermer le modal
  const onCloseModal = () => {
    setShowPresenceModal(false)
    setSelectedDate(null)
  }

  // Rendu personnalisé pour les événements
  const renderEventContent = (eventInfo: any) => {
    const isPresent = eventInfo.event.extendedProps.present
    return (
      <div className="d-flex align-items-center justify-content-between p-1">
        <div className="d-flex align-items-center">
          <TbCircleFilled 
            size={8} 
            className={isPresent ? "text-success me-1" : "text-danger me-1"} 
          />
          <small className="fw-semibold">{eventInfo.event.title}</small>
        </div>
        {isPresent && (
          <Badge bg="success" className="ms-1 fs-xs">
            {eventInfo.event.extendedProps.heuresTravaillees}h
          </Badge>
        )}
      </div>
    )
  }

  // Recharger les données
  const handleRefresh = () => {
    fetchEmployes()
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Calendrier des Présences</h4>
        <div className="d-flex gap-2 align-items-center">
          <Badge bg="success" className="d-flex align-items-center">
            <TbCheck className="me-1" /> Présent
          </Badge>
          <Badge bg="danger" className="d-flex align-items-center">
            <TbX className="me-1" /> Absent
          </Badge>
          <Button variant="outline-primary" size="sm" onClick={handleRefresh} disabled={loading}>
            <TbRefresh className={loading ? "spin" : ""} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="outlook-box gap-1">
        {/* Sidebar des employés */}
        <Card className="h-100 mb-0 d-none d-lg-flex rounded-end-0 overflow-y-auto">
          <CardBody>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center">
                <TbCalendarStats className="me-2 text-primary" />
                <h6 className="mb-0">Liste des Employés</h6>
              </div>
              <Badge bg="primary">{employes.length}</Badge>
            </div>
            
            {loading ? (
              <div className="text-center">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <div className="employes-list">
                {employes.map((employe) => (
                  <div
                    key={employe._id}
                    className={`employe-item fw-semibold d-flex align-items-center justify-content-between p-2 mb-2 rounded ${
                      employe.estActif 
                        ? 'bg-primary-subtle text-primary border border-primary-subtle' 
                        : 'bg-light text-muted border'
                    }`}
                  >
                    <div className="d-flex align-items-center">
                      <TbCircleFilled 
                        className="me-2" 
                        style={{ color: employe.estActif ? '#0d6efd' : '#6c757d' }} 
                      />
                      <div>
                        <div className="fw-bold">{employe.prenom} {employe.nom}</div>
                        <small className="text-muted">{employe.poste}</small>
                      </div>
                    </div>
                    <Badge bg={employe.estActif ? "light" : "secondary"} text="dark" className="fs-xs">
                      {employe.salaireJournalier}dinar/j
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Calendrier */}
        <Card className="h-100 mb-0 rounded-start-0 flex-grow-1 border-start-0">
          <SimplebarClient className="card-body" style={{ height: 'calc(100% - 350px)' }}>
            <FullCalendar
              initialView="dayGridMonth"
              plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin]}
              bootstrapFontAwesome={false}
              handleWindowResize={true}
              slotDuration="00:30:00"
              slotMinTime="06:00:00"
              slotMaxTime="20:00:00"
              buttonText={{
                today: "Aujourd'hui",
                month: 'Mois',
                week: 'Semaine',
                day: 'Jour',
                list: 'Liste',
                prev: 'Précédent',
                next: 'Suivant',
              }}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
              }}
              height={height - 240}
              editable={false}
              selectable={true}
              droppable={false}
              events={events}
              dateClick={onDateClick}
              eventClick={onEventClick}
              eventContent={renderEventContent}
              locale="fr"
              firstDay={1} // Lundi comme premier jour de la semaine
            />
          </SimplebarClient>
        </Card>
      </div>

      {/* Modal de gestion des présences */}
      {showPresenceModal && selectedDate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Gestion des présences - {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h5>
                <Button variant="close" onClick={onCloseModal}></Button>
              </div>
              <div className="modal-body">
                <div className="employes-presence-list">
                  {employes.filter(emp => emp.estActif).map((employe) => {
                    const presence = getPresenceForDate(employe._id, selectedDate)
                    const isPresent = !!presence
                    
                    return (
                      <div key={employe._id} className="d-flex align-items-center justify-content-between p-3 border-bottom">
                        <div className="flex-grow-1">
                          <div className="fw-bold fs-6">{employe.prenom} {employe.nom}</div>
                          <div className="text-muted">{employe.poste}</div>
                          <small className="text-muted">Salaire journalier: {employe.salaireJournalier}dinar</small>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <div className="text-center">
                            <div className={`badge ${isPresent ? 'bg-success' : 'bg-danger'} fs-7`}>
                              {isPresent ? 'Présent' : 'Absent'}
                            </div>
                            {isPresent && (
                              <div className="text-muted fs-8 mt-1">
                                {presence.extendedProps.heuresTravaillees}h
                              </div>
                            )}
                          </div>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant={isPresent ? "outline-danger" : "outline-success"}
                              onClick={() => marquerPresence(employe._id, selectedDate, !isPresent)}
                            >
                              {isPresent ? "Marquer absent" : "Marquer présent"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <div className="text-muted small">
                  Total: {employes.filter(emp => emp.estActif).length} employés actifs
                </div>
                <Button variant="secondary" onClick={onCloseModal}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export default Page