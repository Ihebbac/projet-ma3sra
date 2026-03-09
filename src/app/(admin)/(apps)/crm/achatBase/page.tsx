'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button, Card, CardBody, Col, Container, Form, FormControl, FormLabel, Modal, Row, Table, Dropdown } from 'react-bootstrap'
import { TbEdit, TbTrash, TbPlus, TbDownload, TbEye, TbRefresh } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb' // Assurez-vous que ce chemin est correct

// ======================================================================
// ⚙️ CONFIGURATION & CONSTANTES (Réutilisées dans le calcul)
// ======================================================================
const API_BASE_URL = 'http://192.168.1.15:8170/achats-base'; 
const POID_CAISSE = 30; // Poids par défaut d'une caisse (modifiable par le client si nécessaire)
const POID_WIBA_DEFAUT = 27; // Constante Wiba par défaut (modifiable)
const CONSTANTE_HUILE = 9.09; // Constante pour le calcul du Ktou3 (Huile)
const CONSTANTE_OLIVE = 432; // Constante pour le calcul du Ktou3 (Olive)
const FRAIS_TRANSFORMATION_UNITAIRE = 0.2; // Frais par kg d'olive nette

// --- TYPESCRIPT INTERFACES ---

// Les données d'entrée fournies par l'utilisateur
interface AchatBaseInput {
    dateAchat: string 
    nomPrenom: string 
    numTel?: string
    nbreCaisse: number
    poidWiba: number
    quantiteOliveBrute: number
    prixBase: number
    poidsHuileNetReel: number // <--- ENTRÉE CLIENT pour le poids réel de l'huile produite
}

// Les données calculées
interface AchatBaseCalculated {
    quantiteOliveNet: number 
    quantiteHuileNet: number // Huile Nette (Calcul: OliveNet / Wiba)
    nisba: number
    ktou3: number
    coutAchatClient: number // Paiement au client (basé sur le poids réel saisi)
    fraisTransformation: number 
    prixTotalVenteHuile: number 
}

// Le payload complet envoyé au backend (Entrée + Calculé)
interface AchatBasePayload extends AchatBaseInput, AchatBaseCalculated {}

// Le type de donnée reçu et stocké (Payload + _id)
interface AchatBaseData extends AchatBasePayload {
    _id: string 
    createdAt?: string;
}

interface TotalsAchatBaseDto {
    totalOliveBrute: number;
    totalOliveNet: number;
    totalHuileNet: number;
    totalCoutAchat: number;
}


// Structure des colonnes de la table
const COLUMNS_BASE: any[] = [
    { Header: '', accessor: 'select', className: 'text-center' },
    { Header: 'Date Achat', accessor: 'dateAchat' },
    { Header: 'Client', accessor: 'nomPrenom' },
    { Header: 'Olive Brut (kg)', accessor: 'quantiteOliveBrute' },
    { Header: 'Caisses', accessor: 'nbreCaisse' },
    { Header: 'Olive Net (kg)', accessor: 'quantiteOliveNet', className: 'fw-bold text-dark' },
    { Header: 'Huile Net (kg)', accessor: 'quantiteHuileNet', className: 'fw-semibold text-success' },
    { Header: 'Nisba (%)', accessor: 'nisba' },
    { Header: 'Prix Base (Dinar)', accessor: 'prixBase' },
    { Header: 'Paiement Client', accessor: 'coutAchatClient', className: 'fw-bold text-primary' },
    { Header: 'Actions', accessor: 'actions', className: 'text-center' },
]


// --- Fonctions Utilitaires de Calcul ---

/**
 * Encapsule toute la logique de calcul pour la rendre réutilisable.
 * @param input Les données brutes fournies par l'utilisateur.
 * @returns Les métriques calculées.
 */
const calculateMetrics = (input: AchatBaseInput): AchatBaseCalculated => {
    const oliveBrute = parseFloat(input.quantiteOliveBrute?.toString() || '') || 0 
    const nbreCaisse = parseFloat(input.nbreCaisse?.toString() || '') || 0
    const poidWiba = parseFloat(input.poidWiba?.toString() || '') || 0
    const prixBase = parseFloat(input.prixBase?.toString() || '') || 0
    const poidsHuileNetReel = parseFloat(input.poidsHuileNetReel?.toString() || '') || 0 // Poids réel saisi (utilisé pour le paiement)

    // 1. Quantité Olive Net (Calculé)
    const poidsCaisseTotal = nbreCaisse * POID_CAISSE;
    const quantiteOliveNet = Math.max(0, oliveBrute - poidsCaisseTotal);

    let quantiteHuileNet = 0; // Correspond au calcul standard: OliveNet / Wiba (utilisé pour les ratios)
    let nisba = 0;
    let ktou3 = 0;
    let coutAchatClient = 0;
    let fraisTransformation = 0;
    let prixTotalVenteHuile = 0;
    
    if (quantiteOliveNet > 0 && poidWiba > 0) {
        
        // 2. Quantité Huile Net (Calculée pour les ratios)
        quantiteHuileNet = quantiteOliveNet / poidWiba;
        
        // 3. Nisba (Rendement)
        // Utilise la quantité calculée pour le ratio : (Huile Calculée / Olive Nette)
        nisba = poidsHuileNetReel / quantiteOliveNet; 

        // 4. Ktou3 (Facteur de conversion)
        // Utilise la quantité calculée pour le ratio : ((Huile Calculée / CONSTANTE_HUILE) / (Olive Nette / CONSTANTE_OLIVE))
        ktou3 = (poidsHuileNetReel / CONSTANTE_HUILE) / (quantiteOliveNet / CONSTANTE_OLIVE);

        // 5. Coût Achat Client (Paiement)
        // Formule: Huile Net RÉEL SAISIE * Prix Base
        coutAchatClient = poidsHuileNetReel * prixBase;

        // 6. Frais de Transformation
        fraisTransformation = quantiteOliveNet * FRAIS_TRANSFORMATION_UNITAIRE; 

        // 7. Prix Total Vente Huile (Coût Total)
        prixTotalVenteHuile = coutAchatClient + fraisTransformation; 
    }
    
    // Arrondir toutes les métriques à stocker (4 décimales pour les ratios)
    return {
        quantiteOliveNet: Math.round(quantiteOliveNet * 100) / 100,
        quantiteHuileNet: Math.round(quantiteHuileNet * 100) / 100,
        nisba: Math.round(nisba * 100) / 100, 
        ktou3: Math.round(ktou3 * 10000) / 10000, 
        coutAchatClient: Math.round(coutAchatClient * 100) / 100,
        fraisTransformation: Math.round(fraisTransformation * 100) / 100,
        prixTotalVenteHuile: Math.round(prixTotalVenteHuile * 100) / 100,
    };
}


// ----------------------------------------------------------------------
// 📋 COMPOSANT CustomDataTable (Affichage du tableau)
// ----------------------------------------------------------------------
const CustomDataTable: React.FC<any> = ({ columns, data, onView, onEdit, onDelete, selectedRows, toggleRowSelection, toggleAllSelection, tableClass = "" }) => {
    
    if (!data || data.length === 0) return <p className="text-center text-muted p-4">Aucun achat de base enregistré.</p>

    const isAllSelected = data.length > 0 && selectedRows.length === data.length
    
    return (
        <div className="table-responsive">
            <Table className={`mb-0 ${tableClass}`}>
                <thead>
                    <tr>
                        {columns.map((column: any, idx: number) => (
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
                    {data.map((row: AchatBaseData) => (
                        <tr key={row._id}>
                            {columns.map((column: any, idx: number) => {
                                let content: React.ReactNode = row[column.accessor as keyof AchatBaseData]
                                
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
                                                <Button variant="warning" size="sm" onClick={() => onEdit(row)} title="Modifier"><TbEdit className="fs-5" /></Button>
                                                <Button variant="danger" size="sm" onClick={() => onDelete(row._id)} title="Supprimer"><TbTrash className="fs-5" /></Button>
                                            </div>
                                        )
                                } else if (typeof row[column.accessor as keyof AchatBaseData] === 'number') {
                                    let value = row[column.accessor as keyof AchatBaseData] as number;
                                    
                                    if (column.accessor === 'nisba') {
                                        content = `${(value * 100).toFixed(4)} %`
                                    } else if (column.accessor === 'nbreCaisse') {
                                        content = value.toFixed(0)
                                    } else {
                                        content = value.toFixed(2)
                                    }
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


// ----------------------------------------------------------------------
// 📝 MODAL NOUVEL ACHAT BASE (Formulaire et Calcul)
// ----------------------------------------------------------------------

const NouveauAchatBaseModal: React.FC<any> = ({ show, handleClose, handleSave, dataToEdit }) => {
    const isEditMode = !!dataToEdit
    
    const getInitialInput = (data: AchatBaseData | null): AchatBaseInput => ({
        dateAchat: data?.dateAchat || new Date().toISOString().substring(0, 10),
        nomPrenom: data?.nomPrenom || '',
        numTel: data?.numTel || '',
        quantiteOliveBrute: data?.quantiteOliveBrute || 0,
        nbreCaisse: data?.nbreCaisse || 0,
        poidWiba: data?.poidWiba || POID_WIBA_DEFAUT,
        prixBase: data?.prixBase || 0,
        // Utilise la valeur stockée si elle existe, sinon 0
        poidsHuileNetReel: (data as AchatBasePayload)?.poidsHuileNetReel || 0, 
    });

    const [formData, setFormData] = useState<AchatBaseInput>(getInitialInput(dataToEdit));
    const [isLoading, setIsLoading] = useState(false);

    // Réinitialisation des données si l'ID d'édition change
    useEffect(() => {
        if (show) {
            setFormData(getInitialInput(dataToEdit));
        }
    }, [show, dataToEdit])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        let val: number | string = value

        // Conversion en nombre pour les champs numériques, y compris le nouveau champ réel
        if (['quantiteOliveBrute', 'nbreCaisse', 'poidWiba', 'prixBase', 'poidsHuileNetReel'].includes(name)) {
            val = value === '' ? 0 : parseFloat(value) || 0
        }

        setFormData(prev => ({ ...prev, [name]: val }))
    }

    // CALCULS : Déclenche les calculs à chaque changement de formulaire
    const calculatedMetrics = useMemo(() => {
        return calculateMetrics(formData);
    }, [formData])

    // Extraction des résultats des calculs
    const { 
        quantiteOliveNet, 
        quantiteHuileNet, // Huile Net Calculée (OliveNet/Wiba)
        nisba, 
        ktou3, 
        coutAchatClient, // Paiement réel
        fraisTransformation, 
        prixTotalVenteHuile 
    } = calculatedMetrics;


    const handleSubmit = async () => {
        // Validation minimale
        if (quantiteOliveNet <= 0 || formData.poidsHuileNetReel <= 0 || formData.prixBase <= 0) {
            alert("Veuillez vérifier les quantités d'olive et d'huile nette ainsi que le prix de base. Ces valeurs doivent être positives.")
            return
        }
        
        setIsLoading(true);
        try {
            // CRÉATION DU PAYLOAD COMPLET (Input + Calculé)
            const payload: AchatBasePayload = {
                ...formData,
                ...calculatedMetrics
            };
            
            await handleSave(payload, dataToEdit?._id)
            handleClose()
        } catch (error) {
            console.error("Erreur lors de la sauvegarde :", error);
            alert(`Erreur lors de la sauvegarde. Vérifiez les données.`);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton><Modal.Title>{isEditMode ? 'Modifier Achat Base' : "Ajouter Achat Huile Base"}</Modal.Title></Modal.Header>
            <Modal.Body>
                <Form>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <FormLabel>Client <span className="text-danger">*</span></FormLabel>
                                <FormControl type="text" name="nomPrenom" value={formData.nomPrenom} onChange={handleChange} required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <FormLabel>Date Achat <span className="text-danger">*</span></FormLabel>
                                <FormControl type="date" name="dateAchat" value={formData.dateAchat} onChange={handleChange} required />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={4}>
                             <Form.Group className="mb-3">
                                <FormLabel>Olive Brut (kg) <span className="text-danger">*</span></FormLabel>
                                <FormControl type="number" name="quantiteOliveBrute" value={formData.quantiteOliveBrute || ''} onChange={handleChange} min="0" required />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <FormLabel>Nbre Caisse (x{POID_CAISSE}kg) <span className="text-danger">*</span></FormLabel>
                                <FormControl type="number" name="nbreCaisse" value={formData.nbreCaisse || ''} onChange={handleChange} min="0" required />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <FormLabel>Poids Wiba (kg) <span className="text-danger">*</span></FormLabel>
                                <FormControl type="number" name="poidWiba" value={formData.poidWiba || ''} onChange={handleChange} min="0.1" required />
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    {/* SECTION DE RÉSULTATS INTERMÉDIAIRES ET SAISIE RÉELLE */}
                    <Row className="mb-3 bg-light p-2 rounded">
                        <Col md={4}>
                            <FormLabel className="fw-bold">Olive Net (kg)</FormLabel>
                            <p className="form-control-static fw-bold text-dark">{quantiteOliveNet.toFixed(2)} kg</p>
                        </Col>
                        <Col md={4}>
                            {/* Ce champ affiche le calcul OliveNet / Wiba (utilisé dans les ratios) */}
                            <FormLabel className="fw-bold">Nombre wiba</FormLabel>
                            <p className="form-control-static fw-bold text-success">{quantiteHuileNet.toFixed(2)} kg</p>
                        </Col>
                         <Col md={4}>
                            <Form.Group className="mb-3">
                                {/* SAISIE ESSENTIELLE: Poids Réel d'huile produite pour le paiement */}
                                <FormLabel>Poids **Huile Net RÉEL** (kg) <span className="text-danger">*</span></FormLabel>
                                <FormControl 
                                    type="number" 
                                    name="poidsHuileNetReel" 
                                    value={formData.poidsHuileNetReel || ''} 
                                    onChange={handleChange} 
                                    min="0.1" 
                                    required 
                                    className="border-primary"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <FormLabel>Prix Base (Dinar/kg) <span className="text-danger">*</span></FormLabel>
                                <FormControl type="number" name="prixBase" value={formData.prixBase || ''} onChange={handleChange} min="0.1" required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <FormLabel>Numéro de Téléphone (Optionnel)</FormLabel>
                                <FormControl type="text" name="numTel" value={formData.numTel || ''} onChange={handleChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <hr />

                    <h6 className="mb-3">Détails financiers et Rendement</h6>
                    <Row className="text-center">
                        <Col>
                            <p className="mb-1 text-muted">Nisba (Rendement)</p>
                            <h5 className="text-info">{(nisba * 100).toFixed(4)} %</h5>
                        </Col>
                        <Col>
                            <p className="mb-1 text-muted">Ktou3</p>
                            <h5 className="text-warning">{ktou3.toFixed(4)}</h5>
                        </Col>
                        <Col>
                            <p className="mb-1 text-muted">Paiement au Client</p>
                            <h5 className="text-primary">{coutAchatClient.toFixed(2)} Dinar</h5>
                        </Col>
                    </Row>
                    <Row className="mt-2 text-center">
                         <Col md={{ span: 6, offset: 3 }}>
                            <p className="mb-1 text-muted">Coût Total Transparent (Paiement Client + Frais)</p>
                            <h5 className="text-dark">{prixTotalVenteHuile.toFixed(2)} Dinar</h5>
                            <span className="text-danger fst-italic">({fraisTransformation.toFixed(2)} Dinar de frais inclus)</span>
                        </Col>
                    </Row>

                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={isLoading}>Annuler</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={isLoading || coutAchatClient <= 0}>
                    {isLoading ? 'Sauvegarde...' : (isEditMode ? 'Sauvegarder' : 'Enregistrer Achat Base')}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}


// ----------------------------------------------------------------------
// 📄 COMPOSANT PAGE PRINCIPAL
// ----------------------------------------------------------------------
const Page: React.FC = () => {
    const [achatData, setAchatData] = useState<AchatBaseData[]>([])
    const [allTotals, setAllTotals] = useState<TotalsAchatBaseDto>({
        totalOliveBrute: 0, totalOliveNet: 0, totalHuileNet: 0, totalCoutAchat: 0
    })
    const [modalShow, setModalShow] = useState(false)
    const [dataToEdit, setDataToEdit] = useState<AchatBaseData | null>(null)
    const [selectedRows, setSelectedRows] = useState<string[]>([]) 
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // --- Fonctions API ---
    
    const fetchAchatBaseData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [dataRes, totalsRes] = await Promise.all([
                fetch(API_BASE_URL),
                fetch(`${API_BASE_URL}/totals`)
            ]);
            
            if (!dataRes.ok || !totalsRes.ok) {
                throw new Error("Erreur lors de la récupération des données de l'API.");
            }

            const data: AchatBaseData[] = await dataRes.json();
            const totals: TotalsAchatBaseDto = await totalsRes.json();
            
            setAchatData(data);
            setAllTotals(totals);

        } catch (error) {
            console.error("Erreur de chargement des données :", error);
            alert("Impossible de charger les données. Assurez-vous que le backend NestJS est lancé sur /achats-base.");
            setAchatData([]);
            setAllTotals({totalOliveBrute: 0, totalOliveNet: 0, totalHuileNet: 0, totalCoutAchat: 0});
        } finally {
            setIsLoadingData(false);
        }
    }, [])

    useEffect(() => {
        fetchAchatBaseData()
    }, [fetchAchatBaseData])


    const handleSave = async (payload: AchatBasePayload, id?: string) => {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/${id}` : API_BASE_URL;

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), // Le payload contient maintenant les données calculées
        });

        if (!response.ok) {
            const errorBody = await response.json();
             throw new Error(`La requête a échoué (${response.status}): ${errorBody.message || response.statusText}`);
        }
        
        await fetchAchatBaseData();
        setSelectedRows([]);
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet achat base ?")) return;

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Erreur de suppression");

            await fetchAchatBaseData(); 
            setSelectedRows(prev => prev.filter(rowId => rowId !== id))
        } catch (error) {
            console.error("Erreur de suppression :", error);
            alert(`Erreur lors de la suppression.`);
        }
    }


    const handleEdit = (data: AchatBaseData) => {
        setDataToEdit(data)
        setModalShow(true)
    }

    const handleModalClose = () => {
        setModalShow(false)
        setDataToEdit(null)
    }

    // --- Rendu de la page ---
    return (
        <Container fluid>
            <PageBreadcrumb title="Achats Huile Base" subtitle="Gestion" />

            <Row>
                <Col xl={12}>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="header-title">Achats Basés sur Huile Nette 🫗</h4>
                                <div className="d-flex gap-2">
                                    <Button variant="info" onClick={fetchAchatBaseData} disabled={isLoadingData}>
                                        <TbRefresh className="me-1" /> {isLoadingData ? 'Chargement...' : 'Actualiser'}
                                    </Button>
                                    <Button variant="primary" onClick={() => setModalShow(true)}>
                                        <TbPlus className="me-1" /> Nouveau Achat Base
                                    </Button>
                                </div>
                            </div>

                            {/* Totaux cumulés */}
                            <div className="alert alert-info p-2 mb-3">
                                <h6 className="mb-2 fw-bold text-center">Totaux Cumulés de l'Historique</h6>
                                <Row className="text-center">
                                    <Col sm={3} className="border-end">
                                        <span className="fw-bold d-block">Olive Net (kg) :</span>
                                        <span className="text-dark fs-5">{allTotals.totalOliveNet.toFixed(2)}</span>
                                    </Col>
                                    <Col sm={3} className="border-end">
                                        <span className="fw-bold d-block">Huile Net Produite (kg) :</span>
                                        <span className="text-success fs-5">{allTotals.totalHuileNet.toFixed(2)}</span>
                                    </Col>
                                    <Col sm={3} className="border-end">
                                        <span className="fw-bold d-block">Paiement Total Client (Dinar) :</span>
                                        <span className="text-primary fs-5">{allTotals.totalCoutAchat.toFixed(2)}</span>
                                    </Col>
                                    <Col sm={3}>
                                        <span className="fw-bold d-block">Rendement Moyen :</span>
                                        <span className="text-info fs-5">
                                            {allTotals.totalOliveNet > 0 
                                                ? ((allTotals.totalHuileNet / allTotals.totalOliveNet) * 100).toFixed(4)
                                                : 0.0000} %
                                        </span>
                                    </Col>
                                </Row>
                            </div>
                            
                            {isLoadingData ? (
                                <p className="text-center p-5">Chargement des données...</p>
                            ) : (
                                <CustomDataTable 
                                    columns={COLUMNS_BASE} 
                                    data={achatData} 
                                    onView={() => {}} 
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    selectedRows={selectedRows}
                                    toggleRowSelection={(id: string) => setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id])}
                                    toggleAllSelection={(checked: boolean) => setSelectedRows(checked ? achatData.map(d => d._id) : [])}
                                    tableClass="table-striped table-hover"
                                />
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <NouveauAchatBaseModal
                show={modalShow}
                handleClose={handleModalClose}
                handleSave={handleSave}
                dataToEdit={dataToEdit}
            />
        </Container>
    )
}

export default Page