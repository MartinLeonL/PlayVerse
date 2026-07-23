import { createContext, useCallback, useContext, useState } from "react";
import Toast from "../components/Toast.jsx";
import "../components/Toast.css";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // tone: "default" | "error". Auto-dismisses after `duration` ms
  // (default 3000) — brief, like mobile's SnackBar, not something that
  // needs to be manually closed.
  const showToast = useCallback((message, { tone = "default", duration = 3000 } = {}) => {
    const id = ++idCounter;

    setToasts((current) => [...current, { id, message, tone }]);

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} tone={toast.tone} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
