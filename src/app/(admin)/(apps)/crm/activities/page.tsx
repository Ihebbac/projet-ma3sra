'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button, Card, CardBody, Col, Container, Form, FormControl, FormLabel, Modal, Row, Table, Dropdown } from 'react-bootstrap'
import { TbEdit, TbTrash, TbPlus, TbDownload, TbEye, TbRefresh } from 'react-icons/tb' // Ajout de TbRefresh
import PageBreadcrumb from '@/components/PageBreadcrumb' 

// ======================================================================
// ⚙️ CONFIGURATION API
// ======================================================================
// Assurez-vous que le port correspond à votre NestJS (souvent 3000 ou 8000)
const API_BASE_URL = 'http://localhost:8170/achats'; 
const POID_CAISSE = 30;

// ======================================================================
// 📥 EXPORT UTILS (PDF OPTIMISÉ) - Non modifié
// ======================================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- TYPES POUR L'EXPORT ---
interface ExportRow {
    [key: string]: string | number
}

interface ExportTotals {
    totalQuantiteOlive: number,
    totalQuantiteOliveNet: number,
    totalNbreCaisse: number, // Conservé dans ce type pour la logique d'export interne
    totalProduitWiba: number,
    totalCout: number,
}

/**
 * Exporte les données sélectionnées et les totaux dans un fichier PDF avec une mise en page claire.
 */
const customExportToPDF = (
    data: ExportRow[],
    title: string,
    subtitle: string,
    totals: ExportTotals
): void => {
    if (typeof jsPDF === 'undefined') {
        alert("Erreur: jsPDF non chargé. Assurez-vous d'avoir installé 'jspdf' et 'jspdf-autotable'.")
        return
    }

    const doc = new jsPDF('p', 'mm', 'a4') // A4 portrait
    const margin = 14
    const pageWidth = doc.internal.pageSize.width
    const lineHeight = 6

    // --- 1. En-tête du document ---
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(title, margin, 15)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitle, margin, 22)
    doc.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, 22, { align: 'right' });


    // --- 2. Tableau principal ---
    let finalY = 30;

    if (data.length > 0) {
        
        // Définition des colonnes
        const columns = [
            { header: 'Date', dataKey: 'Date Achat' },
            { header: 'Olive Brut (kg)', dataKey: 'Quantité Olive (kg)' },
            { header: 'Caisses', dataKey: 'Nbre Caisse' },
            { header: 'Olive Net (kg)', dataKey: 'Quantité Olive Net (kg)' }, 
            { header: 'Poids Wiba (kg)', dataKey: 'Poids Wiba (kg)' },
            { header: 'Prix Wiba', dataKey: 'Prix Wiba' },
            { header: 'Produit (Wiba)', dataKey: 'Produit (Wiba)' },
            { header: 'Coût Total (Dinar)', dataKey: 'Coût Total (Dinar)' },
        ];
        
        // Convertir les lignes d'ExportRow en tableau pour autoTable
        const body = data.map(row => 
            columns.map(col => row[col.dataKey])
        );

        autoTable(doc, {
            columns: columns,
            body: body,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [24, 115, 175], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 2, textColor: 0, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 18 }, // Date
                1: { halign: 'right' },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right', fontStyle: 'bold' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right', fontStyle: 'bold' },
            }
        })
        
        finalY = (doc as any).lastAutoTable.finalY
    }


    // --- 3. Bloc des Totaux Cumulés ---
    let y = finalY
    if (totals) {
        y += 10
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('RÉCAPITULATIF DES TOTAUX', margin, y)

        y += 4
        
        // Définition des totaux à afficher avec leurs formats (Nbre Caisse RETIRÉ)
        const totalsToDisplay = [
            { key: 'Total Quantité Olive Brut', value: totals.totalQuantiteOlive, unit: 'kg' },
            { key: 'Total Quantité Olive Net', value: totals.totalQuantiteOliveNet, unit: 'kg', style: 'bold' },
            { key: 'Total Produit', value: totals.totalProduitWiba, unit: 'Wiba', style: 'bold' },
            { key: 'Total Coût', value: totals.totalCout, unit: 'Dinar', style: 'bold' },
        ];
        
        doc.setLineWidth(0.3)
        doc.setFontSize(10)
        
        totalsToDisplay.forEach((item, index) => {
            y += lineHeight
            
            const numericValue = item.value;
            let formattedValue = numericValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            doc.setFont('helvetica', item.style === 'bold' ? 'bold' : 'normal');

            doc.text(item.key, margin, y)
            
            doc.text(`${formattedValue} ${item.unit}`, pageWidth - margin, y, { align: 'right' })
            
            if (index === totalsToDisplay.length - 1) {
                 y += 1
                 doc.setLineWidth(0.5)
                 doc.line(margin, y, pageWidth - margin, y)
            }
        })
    }

    // --- 4. Pied de page ---
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text(
            `Page ${i} / ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        )
    }

    doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}


// ======================================================================
// 📋 DÉBUT DU COMPOSANT REACT - INTÉGRATION API
// ======================================================================

// --- TYPESCRIPT INTERFACES (Adaptées au Backend) ---
interface AchatData {
    _id: string // ID MongoDB
    dateAchat: string // Format 'YYYY-MM-DD'
    quantiteOlive: number // Poid Zitoun (BRUT)
    quantiteOliveNet: number // Poids net calculé par le backend
    nbreCaisse: number
    poidWiba: number
    prixWiba: number
    produitWiba: number 
    coutTotal: number
    createdAt?: string;
    updatedAt?: string;
}

// Les données envoyées au backend pour la création/modification
interface AchatPayload {
    dateAchat: string 
    quantiteOlive: number 
    nbreCaisse: number
    poidWiba: number
    prixWiba: number
}


interface Column {
    Header: string
    accessor: keyof AchatData | 'actions' | 'select'
    className?: string
}


// Structure des colonnes de la table
const COLUMNS: Column[] = [
    { Header: '', accessor: 'select', className: 'text-center' },
    { Header: 'Date Achat', accessor: 'dateAchat' },
    { Header: 'Olive Brut (kg)', accessor: 'quantiteOlive' },
    { Header: 'Nbre Caisse', accessor: 'nbreCaisse' },
    { Header: 'Quantité Olive Net (kg)', accessor: 'quantiteOliveNet', className: 'fw-bold text-dark' },
    { Header: 'Poids Wiba (kg)', accessor: 'poidWiba' },
    { Header: 'Prix Wiba', accessor: 'prixWiba' },
    { Header: 'Produit (Wiba)', accessor: 'produitWiba', className: 'fw-semibold text-success' }, 
    { Header: 'Coût Total (Dinar)', accessor: 'coutTotal', className: 'fw-semibold text-primary' },
    { Header: 'Actions', accessor: 'actions', className: 'text-center' },
]


// ----------------------------------------------------------------------
// 🗄️ COMPOSANT CUSTOM DATATABLE
// ----------------------------------------------------------------------
interface CustomDataTableProps {
    columns: Column[]
    data: AchatData[]
    onView: (data: AchatData) => void
    onEdit: (data: AchatData) => void
    onDelete: (id: string) => void // ID est une chaîne ici
    selectedRows: string[]
    toggleRowSelection: (id: string) => void
    toggleAllSelection: (checked: boolean) => void
    tableClass?: string
}

const CustomDataTable: React.FC<CustomDataTableProps> = ({
    columns,
    data,
    onView,
    onEdit,
    onDelete,
    selectedRows,
    toggleRowSelection,
    toggleAllSelection,
    tableClass = "",
}) => {
    const isAllSelected = data.length > 0 && selectedRows.length === data.length

    if (!data || data.length === 0) {
        return <p className="text-center text-muted p-4">Aucun achat d'olive enregistré.</p>
    }

    return (
        <div className="table-responsive">
            <Table className={`mb-0 ${tableClass}`}>
                <thead>
                    <tr>
                        {columns.map((column, idx) => (
                            <th key={idx} className={column.className}>
                                {column.accessor === 'select' ? (
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={(e) => toggleAllSelection(e.target.checked)}
                                        title="Sélectionner tout"
                                    />
                                ) : (
                                    column.Header
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr key={row._id}>
                            {columns.map((column, idx) => {
                                let content: React.ReactNode

                                if (column.accessor === 'select') {
                                    content = (
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(row._id)}
                                            onChange={() => toggleRowSelection(row._id)}
                                        />
                                    )
                                } else if (column.accessor === 'actions') {
                                    content = (
                                        <div className="d-flex justify-content-center gap-2">
                                            <Button variant="info" size="sm" onClick={() => onView(row)} title="Voir Détail">
                                                <TbEye className="fs-5" />
                                            </Button>
                                            <Button variant="warning" size="sm" onClick={() => onEdit(row)} title="Modifier">
                                                <TbEdit className="fs-5" />
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => onDelete(row._id)} title="Supprimer">
                                                <TbTrash className="fs-5" />
                                            </Button>
                                        </div>
                                    )
                                } else if (typeof row[column.accessor as keyof AchatData] === 'number') {
                                    content = (row[column.accessor as keyof AchatData] as number).toFixed(2)
                                    if (column.accessor === 'nbreCaisse') {
                                        content = (row[column.accessor as keyof AchatData] as number).toFixed(0) // Caisses sans décimales
                                    }
                                } else {
                                    content = row[column.accessor as keyof AchatData]
                                }

                                return (
                                    <td key={idx} className={column.className}>
                                        {content}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    )
}

// ----------------------------------------------------------------------
// 📝 COMPOSANT MODAL NOUVEL ACHAT/MODIFICATION
// ----------------------------------------------------------------------
interface NouveauAchatModalProps {
    show: boolean
    handleClose: () => void
    handleSave: (data: AchatPayload, id?: string) => Promise<void>
    dataToEdit: AchatData | null
}

// Constante pour le Poids Wiba par défaut (identique au backend)
const POID_WIBA_DEFAUT = 27;

const NouveauAchatModal: React.FC<NouveauAchatModalProps> = ({ show, handleClose, handleSave, dataToEdit }) => {
    const isEditMode = !!dataToEdit
    
    const getDefaultDate = () => {
        if (dataToEdit?.dateAchat) return dataToEdit.dateAchat
        return new Date().toISOString().substring(0, 10) 
    }

    const initialFormState: AchatPayload = { 
        dateAchat: getDefaultDate(),
        quantiteOlive: dataToEdit?.quantiteOlive || 0,
        nbreCaisse: dataToEdit?.nbreCaisse || 0,
        poidWiba: dataToEdit?.poidWiba || POID_WIBA_DEFAUT,
        prixWiba: dataToEdit?.prixWiba || 0,
    }

    const [formData, setFormData] = useState(initialFormState)
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (show) { 
            setFormData({ 
                dateAchat: dataToEdit?.dateAchat || new Date().toISOString().substring(0, 10),
                quantiteOlive: dataToEdit?.quantiteOlive || 0,
                nbreCaisse: dataToEdit?.nbreCaisse || 0,
                poidWiba: dataToEdit?.poidWiba || POID_WIBA_DEFAUT,
                prixWiba: dataToEdit?.prixWiba || 0,
            })
        }
    }, [show, dataToEdit])


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        let val: number | string = value

        if (name !== 'dateAchat') {
            val = value === '' ? 0 : parseFloat(value) || 0
        }

        setFormData(prev => ({
            ...prev,
            [name]: val,
        }))
    }

    // Calcul côté client pour l'affichage instantané (le calcul final est fait par le backend)
    const { produitWiba, coutTotal, quantiteOliveNet } = useMemo(() => {
        const poidZitoun = parseFloat(formData.quantiteOlive.toString()) || 0
        const nbreCaisse = parseFloat(formData.nbreCaisse.toString()) || 0
        const poidWiba = parseFloat(formData.poidWiba.toString()) || 0
        const prixWiba = parseFloat(formData.prixWiba.toString()) || 0

        const net = Math.max(0, poidZitoun - (nbreCaisse * POID_CAISSE))
        
        let resultatProduit = 0
        let resultatCout = 0

        if (net > 0 && poidWiba > 0) {
            const calculProduit = net / poidWiba
            resultatProduit = Math.round(calculProduit * 100) / 100 
            resultatCout = Math.round((resultatProduit * prixWiba) * 100) / 100
        }

        return {
            quantiteOliveNet: net,
            produitWiba: resultatProduit,
            coutTotal: resultatCout,
        }
    }, [formData])

    const handleSubmit = async () => {
        if (formData.quantiteOlive > 0 && formData.nbreCaisse >= 0 && formData.prixWiba > 0 && formData.poidWiba > 0) {
            setIsLoading(true);
            try {
                // Le payload envoyé ne contient pas les champs calculés
                const achatToSave: AchatPayload = {
                    dateAchat: formData.dateAchat,
                    quantiteOlive: parseFloat(formData.quantiteOlive.toString()),
                    nbreCaisse: parseFloat(formData.nbreCaisse.toString()),
                    poidWiba: parseFloat(formData.poidWiba.toString()),
                    prixWiba: parseFloat(formData.prixWiba.toString()),
                }
                
                await handleSave(achatToSave, dataToEdit?._id)
                handleClose()
            } catch (error) {
                console.error("Erreur lors de la sauvegarde :", error);
                alert(`Erreur lors de la sauvegarde : ${error instanceof Error ? error.message : "Vérifiez la console."}`);
            } finally {
                setIsLoading(false);
            }
        } else {
            alert("Veuillez vérifier les champs obligatoires (Quantité Olive, Nbre Caisse, Poids Wiba, Prix Wiba).");
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditMode ? 'Modifier Achat' : "Ajouter un Nouvel Achat d'Olive"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group as={Row} className="mb-3">
                        <FormLabel column sm={5}>Date Achat <span className="text-danger">*</span></FormLabel>
                        <Col sm={7}>
                            <FormControl
                                type="date"
                                name="dateAchat"
                                value={formData.dateAchat}
                                onChange={handleChange}
                                required
                            />
                        </Col>
                    </Form.Group>
                    
                    <Form.Group as={Row} className="mb-3">
                        <FormLabel column sm={5}>Quantité Olive Brut (kg) <span className="text-danger">*</span></FormLabel>
                        <Col sm={7}>
                            <FormControl
                                type="number"
                                name="quantiteOlive"
                                value={formData.quantiteOlive || ''}
                                onChange={handleChange}
                                min="0"
                                required
                            />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3">
                        <FormLabel column sm={5}>Nombre Caisse <span className="text-danger">*</span></FormLabel>
                        <Col sm={7}>
                            <FormControl
                                type="number"
                                name="nbreCaisse"
                                value={formData.nbreCaisse || ''}
                                onChange={handleChange}
                                min="0"
                                required
                            />
                            <Form.Text className="text-muted">
                                Poids des caisses déduit : {(parseFloat(formData.nbreCaisse.toString()) || 0) * POID_CAISSE} kg.
                            </Form.Text>
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3">
                        <FormLabel column sm={5}>Quantité Olive Net (kg)</FormLabel>
                        <Col sm={7}>
                            <p className="form-control-static fw-bold text-dark">
                                **{quantiteOliveNet.toFixed(2)} kg**
                            </p>
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3">
                        <FormLabel column sm={5}>Poids Wiba (kg) <span className="text-danger">*</span></FormLabel>
                        <Col sm={7}>
                            <FormControl
                                type="number"
                                name="poidWiba"
                                value={formData.poidWiba || ''}
                                onChange={handleChange}
                                min="0.1"
                                required
                            />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-3">
                        <FormLabel column sm={5}>Prix Wiba <span className="text-danger">*</span></FormLabel>
                        <Col sm={7}>
                            <FormControl
                                type="number"
                                name="prixWiba"
                                value={formData.prixWiba || ''}
                                onChange={handleChange}
                                min="0.1"
                                required
                            />
                        </Col>
                    </Form.Group>

                    <hr />

                    <Form.Group as={Row} className="mb-2">
                        <FormLabel column sm={5} className="fw-bold">Produit Estimé (Wiba)</FormLabel>
                        <Col sm={7}>
                            <p className="form-control-static fw-bold text-success">
                                **{produitWiba.toFixed(2)} Wiba**
                            </p>
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} className="mb-2">
                        <FormLabel column sm={5} className="fw-bold">Coût Total Estimé</FormLabel>
                        <Col sm={7}>
                            <p className="form-control-static fw-bold text-primary">
                                **{coutTotal.toFixed(2)} Dinar**
                            </p>
                        </Col>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                    Annuler
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={isLoading || !produitWiba && !isEditMode}>
                    {isLoading ? 'Sauvegarde...' : (isEditMode ? 'Sauvegarder Changements' : 'Enregistrer Achat')}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

// ----------------------------------------------------------------------
// 👁️ COMPOSANT MODAL VUE DÉTAIL (Utilise l'ID MongoDB)
// ----------------------------------------------------------------------

const DetailModal: React.FC<{ show: boolean, handleClose: () => void, data: AchatData | null }> = ({ show, handleClose, data }) => {
    if (!data) return null;

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>Détail de l'Achat ID: {data._id.substring(0, 8)}...</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Table bordered striped>
                    <tbody>
                        <tr><th>Date Achat</th><td>{data.dateAchat}</td></tr>
                        <tr><th>Quantité Olive Brut (kg)</th><td>{data.quantiteOlive.toFixed(2)} kg</td></tr>
                        <tr><th>Nombre Caisse</th><td>{data.nbreCaisse.toFixed(0)}</td></tr>
                        <tr><th>Poids Caisse Déduit</th><td>{(data.nbreCaisse * POID_CAISSE).toFixed(2)} kg</td></tr>
                        <tr><th>Quantité Olive Net (kg)</th><td><span className="fw-bold text-dark">{data.quantiteOliveNet.toFixed(2)} kg</span></td></tr>
                        <tr><th>Poids Wiba Unitaire</th><td>{data.poidWiba.toFixed(2)} kg</td></tr>
                        <tr><th>Prix Wiba Unitaire</th><td>{data.prixWiba.toFixed(2)} Dinar</td></tr>
                        <tr><th>Quantité Produit (Wiba)</th><td><span className="fw-bold text-success">{data.produitWiba.toFixed(2)} Wiba</span></td></tr>
                        <tr><th>Coût Total</th><td><span className="fw-bold text-primary">{data.coutTotal.toFixed(2)} Dinar</span></td></tr>
                    </tbody>
                </Table>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Fermer</Button>
            </Modal.Footer>
        </Modal>
    );
};

// ----------------------------------------------------------------------
// 📄 COMPOSANT PAGE PRINCIPAL
// ----------------------------------------------------------------------
const Page: React.FC = () => {
    const [achatData, setAchatData] = useState<AchatData[]>([])
    const [allTotals, setAllTotals] = useState<ExportTotals>({
        totalCout: 0, totalProduitWiba: 0, totalQuantiteOlive: 0, totalQuantiteOliveNet: 0, totalNbreCaisse: 0
    })
    const [modalShow, setModalShow] = useState(false)
    const [detailModalShow, setDetailModalShow] = useState(false)
    const [dataToEdit, setDataToEdit] = useState<AchatData | null>(null)
    const [dataToView, setDataToView] = useState<AchatData | null>(null)
    const [selectedRows, setSelectedRows] = useState<string[]>([]) // IDs sont des chaînes (MongoDB)
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // --- Fonctions API ---
    
    const fetchAchatData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [dataRes, totalsRes] = await Promise.all([
                fetch(API_BASE_URL),
                fetch(`${API_BASE_URL}/totals`)
            ]);
            
            if (!dataRes.ok || !totalsRes.ok) {
                throw new Error("Erreur lors de la récupération des données de l'API.");
            }

            const data: AchatData[] = await dataRes.json();
            const totals: Omit<ExportTotals, 'totalNbreCaisse'> = await totalsRes.json();
            
            // Calculer totalNbreCaisse car il n'est pas fourni par l'endpoint /totals (exigences utilisateur)
            const totalNbreCaisse = data.reduce((sum, item) => sum + item.nbreCaisse, 0);

            setAchatData(data);
            setAllTotals({ ...totals, totalNbreCaisse });

        } catch (error) {
            console.error("Erreur de chargement des données :", error);
            alert("Impossible de charger les données. Assurez-vous que le backend NestJS est lancé.");
            setAchatData([]);
            setAllTotals({totalCout: 0, totalProduitWiba: 0, totalQuantiteOlive: 0, totalQuantiteOliveNet: 0, totalNbreCaisse: 0});
        } finally {
            setIsLoadingData(false);
        }
    }, [])

    useEffect(() => {
        fetchAchatData()
    }, [fetchAchatData])


    const handleSave = async (newAchat: AchatPayload, id?: string) => {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/${id}` : API_BASE_URL;

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAchat),
        });

        if (!response.ok) {
            const errorBody = await response.json();
             throw new Error(`La requête a échoué (${response.status}): ${errorBody.message || response.statusText}`);
        }
        
        // Rafraîchir les données après une opération réussie
        await fetchAchatData();
        setSelectedRows([]);
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet achat ?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`La suppression a échoué : ${errorBody.message || response.statusText}`);
            }

            await fetchAchatData(); // Rafraîchir après suppression
            setSelectedRows(prev => prev.filter(rowId => rowId !== id))

        } catch (error) {
            console.error("Erreur de suppression :", error);
            alert(`Erreur lors de la suppression : ${error instanceof Error ? error.message : "Vérifiez la console."}`);
        }
    }


    // --- Logique CRUD ---
    const handleView = (data: AchatData) => {
        setDataToView(data)
        setDetailModalShow(true)
    }

    const handleEdit = (data: AchatData) => {
        setDataToEdit(data)
        setModalShow(true)
    }
    
    const handleModalClose = () => {
        setModalShow(false)
        setDataToEdit(null)
    }

    const handleDetailModalClose = () => {
        setDetailModalShow(false)
        setDataToView(null)
    }

    // --- Logique de Sélection (basée sur l'ID de type string) ---
    const toggleRowSelection = (id: string) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const toggleAllSelection = (checked: boolean) => {
        setSelectedRows(checked ? achatData.map(d => d._id) : [])
    }

    // --- Logique d'Exportation PDF et CSV ---

    const getExportData = (data: AchatData[]): ExportRow[] => {
        return data.map(row => {
            const rowData: ExportRow = {};
            // Filtrer les colonnes pour l'export 
            COLUMNS.forEach(col => {
                if (col.accessor !== 'actions' && col.accessor !== 'select') {
                    const key = col.Header.trim(); 
                    const value = row[col.accessor as keyof AchatData];
                    
                    if (typeof value === 'number') {
                        rowData[key] = (col.accessor === 'nbreCaisse') ? value.toFixed(0) : value.toFixed(2);
                    } else {
                        rowData[key] = value;
                    }
                }
            });
            return rowData;
        });
    };

    const handleExport = (format: 'csv' | 'pdf') => {
        if (selectedRows.length === 0) {
            alert("Veuillez sélectionner au moins une ligne à exporter.")
            return
        }

        const dataToExport = achatData.filter(d => selectedRows.includes(d._id))
        const exportData = getExportData(dataToExport);

        // Calculer les totaux spécifiques aux lignes sélectionnées
        const selectedTotals: ExportTotals = dataToExport.reduce((acc, item) => ({
            totalCout: acc.totalCout + item.coutTotal,
            totalProduitWiba: acc.totalProduitWiba + item.produitWiba,
            totalQuantiteOlive: acc.totalQuantiteOlive + item.quantiteOlive,
            totalQuantiteOliveNet: acc.totalQuantiteOliveNet + item.quantiteOliveNet,
            totalNbreCaisse: acc.totalNbreCaisse + item.nbreCaisse,
        }), { 
            totalCout: 0, 
            totalProduitWiba: 0, 
            totalQuantiteOlive: 0, 
            totalQuantiteOliveNet: 0, 
            totalNbreCaisse: 0 
        });

        // Arrondir les totaux avant l'export
        Object.keys(selectedTotals).forEach(key => {
            selectedTotals[key as keyof ExportTotals] = Math.round(selectedTotals[key as keyof ExportTotals] * 100) / 100;
        });


        if (format === 'pdf') {
            customExportToPDF(exportData, "Rapport d'Achats d'Olives", `Exportation de ${dataToExport.length} lignes sélectionnées`, selectedTotals);

        } else if (format === 'csv') {
            const headers = Object.keys(exportData[0]).join(',');
            const csvRows = exportData.map(row => Object.values(row).join(','));
            const csvContent = [headers, ...csvRows].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `achats_olives_export_${new Date().toISOString().substring(0, 10)}.csv`)
            link.click()
        }
        
        setSelectedRows([])
    }


    return (
        <Container fluid>
            <PageBreadcrumb title="Achats Olives" subtitle="Gestion" />

            <Row>
                <Col xl={12}>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="header-title">Historique des Achats 🫒</h4>
                                <div className="d-flex gap-2">
                                    
                                    <Button variant="info" onClick={fetchAchatData} disabled={isLoadingData}>
                                        <TbRefresh className="me-1" /> {isLoadingData ? 'Chargement...' : 'Actualiser'}
                                    </Button>

                                    <Dropdown>
                                        <Dropdown.Toggle variant="success" id="dropdown-export" disabled={selectedRows.length === 0}>
                                            <TbDownload className="me-1" /> Exporter ({selectedRows.length})
                                        </Dropdown.Toggle>

                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={() => handleExport('csv')}>Exporter en CSV</Dropdown.Item>
                                            <Dropdown.Item onClick={() => handleExport('pdf')}>Exporter en PDF</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>

                                    <Button variant="primary" onClick={() => setModalShow(true)}>
                                        <TbPlus className="me-1" /> Nouveau Achat
                                    </Button>
                                </div>
                            </div>

                            {/* Totaux cumulés de l'Historique via API */}
                            <div className="alert alert-info p-2 mb-3">
                                <h6 className="mb-2 fw-bold text-center">Totaux Cumulés de l'Historique</h6>
                                <Row className="text-center">
                                    <Col sm={4} className="border-end">
                                        <span className="fw-bold d-block">Olive Brut (kg) :</span>
                                        <span className="text-dark fs-5">{allTotals.totalQuantiteOlive.toFixed(2)}</span>
                                    </Col>
                                    <Col sm={4} className="border-end">
                                        <span className="fw-bold d-block">Olive Net (kg) :</span>
                                        <span className="text-dark fs-5">{allTotals.totalQuantiteOliveNet.toFixed(2)}</span>
                                    </Col>
                                    <Col sm={2} className="border-end">
                                        <span className="fw-bold d-block">Produit (Wiba) :</span>
                                        <span className="text-success fs-5">{allTotals.totalProduitWiba.toFixed(2)}</span>
                                    </Col>
                                    <Col sm={2}>
                                        <span className="fw-bold d-block">Coût Total (Dinar) :</span>
                                        <span className="text-primary fs-5">{allTotals.totalCout.toFixed(2)}</span>
                                    </Col>
                                </Row>
                            </div>
                            
                            {isLoadingData ? (
                                <p className="text-center p-5">Chargement des données...</p>
                            ) : (
                                <CustomDataTable 
                                    columns={COLUMNS} 
                                    data={achatData} 
                                    onView={handleView}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    selectedRows={selectedRows}
                                    toggleRowSelection={toggleRowSelection}
                                    toggleAllSelection={toggleAllSelection}
                                    tableClass="table-striped table-hover"
                                />
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <NouveauAchatModal
                show={modalShow}
                handleClose={handleModalClose}
                handleSave={handleSave}
                dataToEdit={dataToEdit}
            />

            <DetailModal 
                show={detailModalShow} 
                handleClose={handleDetailModalClose} 
                data={dataToView} 
            />
        </Container>
    )
}

export default Page