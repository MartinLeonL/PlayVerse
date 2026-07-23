function Toast({ message, tone = "default" }) {
  return <div className={`toast toast-${tone}`}>{message}</div>;
}

export default Toast;