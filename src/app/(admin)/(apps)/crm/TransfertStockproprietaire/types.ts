export type ProprietaireType = {
    _id: string
    nomPrenom: string
    dateCreation: string
    nombreCaisses?: number
    quantiteOlive?: number
    quantiteOliveNet?: number
    quantiteHuile?: number
    kattou3?: number
    nisba?: number
    numCIN?: string
    numTelephone?: string
  }
  
  export type ClientType = {
    _id: string
    nomPrenom: string
    dateCreation?: string
    numTelephone?: string
    email?: string
    adresse?: string
    numCIN?: string
  }
  
  export type TransactionType = {
    _id: string
    date: string
    typeStock: 'olive' | 'huile'
    quantite: number
    clientNom: string
    motif: string
    details: string
    proprietaireId: string
    clientId: string
  }