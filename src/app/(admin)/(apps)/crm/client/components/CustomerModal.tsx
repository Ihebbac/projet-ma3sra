import ComponentCard from "@/components/cards/ComponentCard";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import FlatpickrClient from '@/components/client-wrapper/FlatpickrClient'
import WizardClient from '@/components/client-wrapper/WizardClient'
import React from "react";
import {
    Modal,
    Button,
    Row,
    Col,
    Form,
    ModalHeader,
    ModalTitle,
    ModalBody,
    FormGroup,
    FormLabel,
    FormControl,
    FormSelect,
    ModalFooter,
    Container,
    ProgressBar,
} from "react-bootstrap";
import Flatpickr from 'react-flatpickr'
import { useWizard } from 'react-use-wizard'
import clsx from "clsx";
import { TbBook, TbFolder, TbMapPin, TbUserCircle, TbUsers } from "react-icons/tb";
type CustomerModalProps = {
    show: boolean;
    onHide: () => void;
};

const Header = ({ className, withProgress }: { className?: string; withProgress?: boolean }) => {
    const { goToStep, activeStep, stepCount } = useWizard()
  
    return (
      <>
        {withProgress && <ProgressBar now={(activeStep + 1) * (100 / stepCount)} className="mb-3" style={{ height: '6px' }} />}
  
        <ul className={clsx('nav nav-tabs wizard-tabs mb-3', className)}>
          <li className="nav-item">
            <button
              className={clsx('nav-link d-flex w-100 text-start border-0', activeStep === 0 && 'active', activeStep > 0 && 'wizard-item-done')}
              onClick={() => goToStep(0)}>
              <span className="d-flex align-items-center">
                <TbUserCircle className="fs-32" />
                <span className="flex-grow-1 ms-2 text-truncate">
                  <span className="mb-0 lh-base d-block fw-semibold text-body fs-base">informations Client</span>
                  <span className="fs-xxs mb-0">information personnel</span>
                </span>
              </span>
            </button>
          </li>
  
          <li className="nav-item">
            <button
              className={clsx('nav-link d-flex w-100 text-start border-0', activeStep === 1 && 'active', activeStep > 1 && 'wizard-item-done')}
              onClick={() => goToStep(1)}>
              <span className="d-flex align-items-center">
                <TbMapPin className="fs-32" />
                <span className="flex-grow-1 ms-2 text-truncate">
                  <span className="mb-0 lh-base d-block fw-semibold text-body fs-base">Quantité d'olive</span>
                  <span className="fs-xxs mb-0">Quantité Zitoun</span>
                </span>
              </span>
            </button>
          </li>
  
          <li className="nav-item">
            <button
              className={clsx('nav-link d-flex w-100 text-start border-0', activeStep === 2 && 'active', activeStep > 2 && 'wizard-item-done')}
              onClick={() => goToStep(2)}>
              <span className="d-flex align-items-center">
                <TbBook className="fs-32" />
                <span className="flex-grow-1 ms-2 text-truncate">
                  <span className="mb-0 lh-base d-block fw-semibold text-body fs-base">Quantité d'huile</span>
                  <span className="fs-xxs mb-0">Quantité Zit</span>
                </span>
              </span>
            </button>
          </li>
  
          {/* <li className="nav-item">
            <button
              className={clsx('nav-link d-flex w-100 text-start border-0', activeStep === 3 && 'active', activeStep > 3 && 'wizard-item-done')}
              onClick={() => goToStep(3)}>
              <span className="d-flex align-items-center">
                <TbUsers className="fs-32" />
                <span className="flex-grow-1 ms-2 text-truncate">
                  <span className="mb-0 lh-base d-block fw-semibold text-body fs-base">Parent Info</span>
                  <span className="fs-xxs mb-0">Guardian details</span>
                </span>
              </span>
            </button>
          </li>
  
          <li className="nav-item">
            <button
              className={clsx('nav-link d-flex w-100 text-start border-0', activeStep === 4 && 'active', activeStep > 4 && 'wizard-item-done')}
              onClick={() => goToStep(4)}>
              <span className="d-flex align-items-center">
                <TbFolder className="fs-32" />
                <span className="flex-grow-1 ms-2 text-truncate">
                  <span className="mb-0 lh-base d-block fw-semibold text-body fs-base">Documents</span>
                  <span className="fs-xxs mb-0">Upload certificates</span>
                </span>
              </span>
            </button>
          </li> */}
        </ul>
      </>
    )
  }


  const Step1 = ({ className }: { className?: string }) => {
    const { nextStep } = useWizard()
  
    return (
      <Form className={`${className}`}>
        <Row className="g-3">
          <Col md={6}>
            <FormGroup controlId="customerName">
              <FormLabel>Nom et prénom</FormLabel>
              <FormControl
                type="text"
                placeholder="Nom et prénom"
                name="fullname"
                required
              />
            </FormGroup>
          </Col>
  
          <Col md={6}>
            <FormGroup controlId="email">
              <FormLabel>Num CIN</FormLabel>
              <FormControl
                type="number"
                placeholder="Carte d'identité nationale"
                name="cin"
                required
              />
            </FormGroup>
          </Col>
  
          <Col md={6}>
            <FormGroup controlId="phone">
              <FormLabel>Num Tél</FormLabel>
              <FormControl
                type="number"
                placeholder="exp : 96 458 362"
                name="phone"
                required
              />
            </FormGroup>
          </Col>
  
          <Col md={6}>
            <FormGroup controlId="country">
              <FormLabel>Type</FormLabel>
              <FormSelect required defaultValue="فلاح" name="type">
                <option value="">Type</option>
                <option value="فلاح">فلاح</option>
                <option value="كيال">كيال</option>
              </FormSelect>
            </FormGroup>
          </Col>
  
          <Col md={6}>
            <FormGroup controlId="joinedDate">
              <FormLabel>Date si besoin</FormLabel>
              <Flatpickr
                className="form-control"
                required
                options={{ dateFormat: "d M Y" }}
                name="date"
              />
            </FormGroup>
          </Col>
        </Row>
  
        <div className="d-flex justify-content-end mt-3">
          <Button variant="primary" onClick={nextStep}>
            Suivant: quantité olive  →
          </Button>
        </div>
      </Form>
    )
  }
  
  
  const Step2 = ({ className }: { className?: string }) => {
    const { previousStep, nextStep } = useWizard()
  
    return (
      <Form className={`${className}`}>
        <Row>
          <Col xl={6}>
            <FormGroup className="mb-3">
              <FormLabel>Nombre des caisses utilisées</FormLabel>
              <FormControl
                type="number"
                placeholder="Ex: 25"
                name="nbCaisses"
                required
              />
            </FormGroup>
          </Col>
          <Col xl={6}>
            <FormGroup className="mb-3">
              <FormLabel>Quantité d'olive (KG)</FormLabel>
              <FormControl
                type="number"
                placeholder="Ex: 320"
                name="quantiteOlive"
                required
              />
            </FormGroup>
          </Col>
        </Row>
  
        <div className="d-flex justify-content-between mt-3">
          <Button variant="secondary" onClick={previousStep}>
            ← Retour:  client
          </Button>
          <Button variant="primary" onClick={nextStep}>
            Suivant: Confirmation →
          </Button>
        </div>
      </Form>
    )
  }
  
  
//   const Step3 = ({ className }: { className?: string }) => {
//     const { previousStep, nextStep } = useWizard()
  
//     return (
//       <Form className={`${className}`}>
//         <Row>
//           <Col xl={6}>
//             <FormGroup className="mb-3">
//               <FormLabel>Choose Course</FormLabel>
//               <FormSelect name="course" required>
//                 <option value="">Select</option>
//                 <option value="Engineering">Engineering</option>
//                 <option value="Medical">Medical</option>
//                 <option value="Business">Business</option>
//               </FormSelect>
//             </FormGroup>
//           </Col>
//           <Col xl={6}>
//             <FormGroup className="mb-3">
//               <FormLabel>Enrollment Type</FormLabel>
//               <FormSelect name="enrollment" required>
//                 <option value="">Select</option>
//                 <option value="Full Time">Full Time</option>
//                 <option value="Part Time">Part Time</option>
//               </FormSelect>
//             </FormGroup>
//           </Col>
//           <Col xl={6}>
//             <FormGroup className="mb-3">
//               <FormLabel>Preferred Batch Time</FormLabel>
//               <FormSelect name="batch_time" required>
//                 <option value="">Select Time</option>
//                 <option value="Morning">Morning (8am – 12pm)</option>
//                 <option value="Afternoon">Afternoon (1pm – 5pm)</option>
//                 <option value="Evening">Evening (6pm – 9pm)</option>
//               </FormSelect>
//             </FormGroup>
//           </Col>
//           <Col xl={6}>
//             <FormGroup className="mb-3">
//               <FormLabel>Mode of Study</FormLabel>
//               <FormSelect name="mode" required>
//                 <option value="">Select Mode</option>
//                 <option value="Offline">Offline</option>
//                 <option value="Online">Online</option>
//                 <option value="Hybrid">Hybrid</option>
//               </FormSelect>
//             </FormGroup>
//           </Col>
//         </Row>
//         <div className="d-flex justify-content-between mt-3">
//           <Button variant="secondary" onClick={previousStep}>
//             ← Back: Address Info
//           </Button>
//           <Button variant="primary" onClick={nextStep}>
//             Next: Parent Info →
//           </Button>
//         </div>
//       </Form>
//     )
//   }
const Step3 = ({ className }: { className?: string }) => {
    const { previousStep } = useWizard()
  
    return (
      <Form className={`${className}`}>
        <Row>
          <Col md={4}>
            <FormGroup className="mb-3">
              <FormLabel>Quantité d'huile </FormLabel>
              <FormControl
                type="number"
                placeholder="Ex: 50 L"
                name="quantiteHuile"
                required
              />
            </FormGroup>
          </Col>
  
          <Col md={4}>
            <FormGroup className="mb-3">
              <FormLabel>القطوع (%)</FormLabel>
              <FormControl
                type="number"
                placeholder="Ex: 5"
                name="kattou3"
                required
              />
            </FormGroup>
          </Col>
  
          <Col md={4}>
            <FormGroup className="mb-3">
              <FormLabel>النسبة (%)</FormLabel>
              <FormControl
                type="number"
                placeholder="Ex: 20"
                name="nisba"
                required
              />
            </FormGroup>
          </Col>
        </Row>
  
        <div className="d-flex justify-content-between mt-3">
          <Button variant="secondary" onClick={previousStep}>
            ← Retour: Olive 
          </Button>
          <Button variant="success" type="submit">
            Ajouter
          </Button>
        </div>
      </Form>
    )
  }
  
const CustomerModal = ({ show, onHide }: CustomerModalProps) => {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Ajouter un nouveau client</ModalTitle>
            </ModalHeader>

            <Form id="addCustomerForm">
                <ModalBody>
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup controlId="customerName">
                                <FormLabel>Nom et prénom</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Nom et prénom"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="email">
                                <FormLabel>Num CIN</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Carte d'identité national"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="phone">
                                <FormLabel>Num Tél</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="exp : 96 458 362"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        {/* <Col md={6}>
                            <FormGroup controlId="company">
                                <FormLabel>Company</FormLabel>
                                <FormControl type="text" placeholder="Company name" />
                            </FormGroup>
                        </Col> */}

                        <Col md={6}>
                            <FormGroup controlId="country">
                                <FormLabel>Type</FormLabel>
                                <FormSelect required defaultValue="فلاح">
                                    <option value="">Type</option>
                                    <option value="US">فلاح</option>
                                    <option value="UK">كيال</option>
                                    
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        {/* <Col md={6}>
                            <FormGroup controlId="customerType">
                                <FormLabel>Customer Type</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select type</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Prospect">Prospect</option>
                                    <option value="Client">Client</option>
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="accountStatus">
                                <FormLabel>Account Status</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select status</option>
                                    <option value="Active">Active</option>
                                    <option value="Verification Pending">Verification Pending</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Blocked">Blocked</option>
                                </FormSelect>
                            </FormGroup>
                        </Col> */}

                        <Col md={6}>
                            <FormGroup controlId="joinedDate">
                                <FormLabel>Date si besoin</FormLabel>
                               <Flatpickr className="form-control" required options={{ dateFormat: "d M Y" }}/>
                            </FormGroup>
                        </Col>
                    </Row>

                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup controlId="Nbre caisse">
                                <FormLabel>Nombre caisse utilisé</FormLabel>
                                <FormControl
                                    type="Number"
                                    placeholder="3,4,5...."
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="email">
                                <FormLabel>Quantité Zitoun</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Exp : 420 Kg"
                                    required
                                />
                            </FormGroup>
                        </Col>
                        </Row>
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup controlId="Nbre caisse">
                                <FormLabel>Nombre caisse utilisé</FormLabel>
                                <FormControl
                                    type="Number"
                                    placeholder="3,4,5...."
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="email">
                                <FormLabel>Quantité Zitoun</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Exp : 420 Kg"
                                    required
                                />
                            </FormGroup>
                        </Col>
                        </Row>
                        <Row>
                        <Container fluid>
      {/* <PageBreadcrumb title="Wizard" subtitle="Forms" /> */}

      <Row className="justify-content-center">
        <Col xxl={12}>
          {/* <ComponentCard title="Basic Wizard">
            <WizardClient header={<Header />}>
              <Step1 />
              <Step2 />
              <Step3 />
              <Step4 />
              <Step5 />
            </WizardClient>
          </ComponentCard> */}

          {/* <ComponentCard title="Wizard with Progress">
            <WizardClient header={<Header withProgress />}>
              <Step1 />
              <Step2 />
              <Step3 />
              <Step4 />
              <Step5 />
            </WizardClient>
          </ComponentCard> */}

          <ComponentCard title="nouveau client">
            <div className="row">
              <WizardClient
                header={
                  <div className="col-md-4">
                    <Header className="flex-column wizard-bordered wizard-tabs nav-pills" />
                  </div>
                }>
                <Step1 className="col-md-8 border border-dashed rounded p-4" />
                <Step2 className="col-md-8 border border-dashed rounded p-4" />
                {/* <Step3 className="col-md-8 border border-dashed rounded p-4" />
                <Step4 className="col-md-8 border border-dashed rounded p-4" /> */}
                <Step3 className="col-md-8 border border-dashed rounded p-4" />
              </WizardClient>
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </Container>
                        </Row>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Ajouter
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default CustomerModal;
