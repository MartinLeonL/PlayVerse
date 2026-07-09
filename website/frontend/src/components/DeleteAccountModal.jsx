import './AccountModal.css'

function DeleteAccountModal({ onCancel, onConfirm }) {
  return (
    <div className="account-modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Account</h3>
        <p>By deleting your account, all of your data will be lost. Are you sure you want to delete your account?</p>
        <div className="delete-modal-actions">
          <button type="button" className="delete-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="delete-modal-confirm" onClick={onConfirm}>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteAccountModal