import './Button.css'

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ')}
  >
    {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
    {children}
  </button>
)

export default Button
