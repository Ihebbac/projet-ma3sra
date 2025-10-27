// src/utils/EmployeExporter.ts

import * as XLSX from 'xlsx'
import { Row } from '@tanstack/react-table'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Employe {
  _id: string
  nom: string
  prenom: string
  telephone: string
  poste: string
  salaireJournalier: number
  estActif: boolean
}

type EmployeTableType = Employe & {
  nomComplet: string
}

/**
 * Prépare les données et les en-têtes pour l'exportation des employés.
 */
const prepareEmployeData = (rows: Row<EmployeTableType>[]) => {
  const keysToExport: (keyof EmployeTableType)[] = [
    'nomComplet',
    'telephone',
    'poste',
    'montantJournalier',
    'montantHeure',
    'joursPayes',
    'joursTravailles',
  ]

  const headersMap: Record<string, string> = {
    nomComplet: 'Nom Complet',
    telephone: 'Téléphone',
    poste: 'Poste',
    montantJournalier: 'Salaire Journalier (DT)',
    montantHeure: 'Montant par Heure (DT)',
    joursPayes: 'Jours Payés',
    joursTravailles: 'Jours Travaillés (Heures Sup)',
  }

  const header = keysToExport.map((key) => headersMap[key])

  const body = rows.map((row) => {
    let totalMontantJournalier = 0
    let totalHeuresSup = 0

    const rowData = keysToExport.map((key) => {
      const value = row.original[key]

      if (value === undefined || value === null) return ''

      if (key === 'montantJournalier') {
        // Calculate weekly salary by multiplying daily salary with number of worked days (or use it directly)
        totalMontantJournalier = value
        return value.toFixed(2) // Format the daily salary to 2 decimal places
      }

      if (key === 'montantHeure') {
        return value.toFixed(2) // Format the hourly rate to 2 decimal places
      }

      if (key === 'joursPayes') {
        // Format "joursPayes" to display as a comma-separated list of formatted dates
        return row.original.joursPayes.map((date: string) => new Date(date).toLocaleDateString()).join(', ')
      }

      if (key === 'joursTravailles') {
        // Calculate the total overtime hours worked by the employee
        const heuresSup = row.original.joursTravailles
          .map((jour: { date: string; heuresSup: number }) => {
            totalHeuresSup += jour.heuresSup // Add overtime hours for this employee
            return `${new Date(jour.date).toLocaleDateString()} (${jour.heuresSup} heures sup.)`
          })
          .join(', ')
        return heuresSup
      }

      if (key === 'estActif' && typeof value === 'boolean') {
        return value ? 'Actif' : 'Inactif' // Return "Actif" or "Inactif" for boolean values
      }

      return String(value)
    })

    // Add total for the current row (employee) at the end of the row
    rowData.push(totalMontantJournalier.toFixed(2)) // Total for "montantJournalier"
    rowData.push(totalHeuresSup) // Total for overtime hours

    return rowData
  })

  // Add header for total columns at the end
  header.push('Total Salaire Journalier (DT)', 'Total Heures Sup')

  return { header, body }
}

// --- Exportation XLSX ---

export const exportToXLSX = (rows: Row<EmployeTableType>[], filename: string = 'export_employes') => {
  const { header, body } = prepareEmployeData(rows)

  const dataToExport = [header, ...body]
  const ws = XLSX.utils.aoa_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Données Employés')

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// --- Exportation PDF ---

export const exportToPDF = (rows: Row<EmployeTableType>[], filename: string = 'export_employes') => {
  if (typeof window === 'undefined') return

  try {
    const { header, body } = prepareEmployeData(rows)

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    doc.setFontSize(14)
    doc.text('Rapport des Employés', 14, 20)

    autoTable(doc, {
      head: [header],
      body: body,
      startY: 30,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [32, 52, 64],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      margin: { top: 10 },
      didDrawPage: (data) => {
        doc.setFontSize(8)
        const pageCount = doc.getNumberOfPages()
        const pageText = `Page ${data.pageNumber} / ${pageCount}`
        doc.text(pageText, data.settings.margin.left, doc.internal.pageSize.height - 10)
      },
    })

    doc.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
  }
}
