const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

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
    className={[
      'inline-flex items-center gap-2 rounded-lg font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
      VARIANTS[variant],
      SIZES[size],
      className,
    ].join(' ')}
  >
    {icon && <span className="text-base leading-none">{icon}</span>}
    {children}
  </button>
)

export default Button
