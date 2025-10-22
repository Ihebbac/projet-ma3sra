'use client'

import React, { useState } from 'react'
import jsPDF from 'jspdf'

interface CustomerType {
  name: string
  items: { label: string; value: number }[]
  total: number
}

// composant principal
const PrintTicket: React.FC = () => {
  const [status, setStatus] = useState('')

  const customer: CustomerType = {
    name: 'John Doe',
    items: [
      { label: 'Café', value: 3 },
      { label: 'Croissant', value: 2.5 },
    ],
    total: 5.5,
  }

  // -----------------------------------------------------------
  // 🧾 VERSION 1 — Impression PDF (jsPDF)
  // -----------------------------------------------------------
  const handlePrintTicketV1 = (customer: CustomerType) => {
    const TICKET_WIDTH = 58
    const doc = new jsPDF({ unit: 'mm', format: [TICKET_WIDTH, 150] })

    let y = 10
    doc.setFontSize(12)
    doc.text('*** POINTPAY ***', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 6
    doc.text('-----------------------------', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 6
    doc.text(`Client : ${customer.name}`, 5, y)
    y += 6
    doc.text(`Date : ${new Date().toLocaleString()}`, 5, y)
    y += 6
    doc.text('-----------------------------', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 6

    customer.items.forEach((item) => {
      doc.text(`${item.label.padEnd(15)} ${item.value.toFixed(2)}€`, 5, y)
      y += 6
    })

    doc.text('-----------------------------', TICKET_WIDTH / 2, y, { align: 'center' })
    y += 6
    doc.text(`TOTAL : ${customer.total.toFixed(2)}€`, 5, y)
    y += 10
    doc.text('Merci pour votre visite !', TICKET_WIDTH / 2, y, { align: 'center' })

    const blob = doc.output('bloburl')
    const printWindow = window.open(blob)
    printWindow?.print()
  }

  // -----------------------------------------------------------
  // 🖨️ VERSION 2 — Impression directe ESC/POS via WebUSB
  // -----------------------------------------------------------
  const handlePrintTicketV2 = async (customer: CustomerType) => {
    try {
      setStatus('Connexion à l’imprimante...')

      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x0471, productId: 0x0055 }] // ⚠️ remplace par le VendorID exact (chrome://usb-internals)
      })

      await device.open()
      await device.selectConfiguration(1)
      await device.claimInterface(0)

      setStatus('Impression du ticket...')

      const encoder = new TextEncoder()
      const header = `*** POINTPAY ***\n-----------------------------\n`
      const client = `Client : ${customer.name}\nDate : ${new Date().toLocaleString()}\n-----------------------------\n`
      const body = customer.items
        .map((item) => `${item.label.padEnd(15)} ${item.value.toFixed(2)}€`)
        .join('\n')
      const footer = `\n-----------------------------\nTOTAL : ${customer.total.toFixed(
        2
      )}€\nMerci pour votre visite !\n\n\n\n`

      const ticket = header + client + body + footer
      const data = encoder.encode(ticket)

      // généralement endpoint 1 = port d'écriture
      await device.transferOut(1, data)

      setStatus('✅ Ticket imprimé avec succès')
      await device.close()
    } catch (error) {
      console.error(error)
      setStatus('❌ Erreur : ' + (error as Error).message)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>🧾 Impression Ticket (Deux Méthodes)</h2>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button
          onClick={() => handlePrintTicketV1(customer)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Imprimer PDF (V1)
        </button>

        <button
          onClick={() => handlePrintTicketV2(customer)}
          style={{
            backgroundColor: '#333',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Imprimer Direct (V2)
        </button>
      </div>

      <p style={{ marginTop: 15 }}>{status}</p>
    </div>
  )
}

export default PrintTicket
