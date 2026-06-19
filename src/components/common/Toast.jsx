const STYLES = {
  success: { bg: 'bg-emerald-600', icon: '✅' },
  error: { bg: 'bg-red-500', icon: '❌' },
}

const Toast = ({ message, type = 'success', onClose }) => {
  const { bg, icon } = STYLES[type] ?? STYLES.success
  
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3`}>
      <span>{icon}</span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} aria-label="닫기" className="text-white/70 hover:text-white ml-2 text-lg leading-none">
        &times;
      </button>
    </div>
  )
}

export default Toast
