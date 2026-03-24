import { ReactNode } from 'react'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Spinner } from 'react-bootstrap'

type DeleteConfirmationModalProps = {
  show: boolean
  onHide: () => void
  onConfirm: () => void
  selectedCount: number
  itemName?: string
  confirmButtonVariant?: string
  cancelButtonVariant?: string
  modalTitle?: string
  confirmButtonText?: string
  cancelButtonText?: string
  loading?: boolean
  children?: ReactNode
}

const DeleteConfirmationModal = ({
  show,
  onHide,
  onConfirm,
  selectedCount,
  itemName = 'client',
  confirmButtonVariant = 'danger',
  cancelButtonVariant = 'light',
  modalTitle = 'Confirmation de suppression',
  confirmButtonText = 'Supprimer',
  cancelButtonText = 'Annuler',
  loading = false,
  children,
}: DeleteConfirmationModalProps) => {
  const getConfirmationMessage = () => {
    if (children) return children

    if (selectedCount > 1) {
      return `Voulez-vous vraiment supprimer ${selectedCount} ${itemName}s ?`
    }

    return `Voulez-vous vraiment supprimer ce ${itemName} ?`
  }

  return (
    <Modal
      show={show}
      onHide={loading ? undefined : onHide}
      centered
      backdrop={loading ? 'static' : true}
      keyboard={!loading}
    >
      <ModalHeader closeButton={!loading}>
        <ModalTitle>{modalTitle}</ModalTitle>
      </ModalHeader>

      <ModalBody>{getConfirmationMessage()}</ModalBody>

      <ModalFooter>
        <Button variant={cancelButtonVariant} onClick={onHide} disabled={loading}>
          {cancelButtonText}
        </Button>

        <Button variant={confirmButtonVariant} onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" /> : confirmButtonText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default DeleteConfirmationModal