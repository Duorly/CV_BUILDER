import Modal from './Modal';

// Confirmation simple : { title, message, confirmLabel, danger, onConfirm }.
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} data-autofocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {typeof message === 'string' ? <p>{message}</p> : message}
    </Modal>
  );
}
