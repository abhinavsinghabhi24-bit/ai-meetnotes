import { IconLoader } from './Icons'

const VARIANTS = {
  primary: {
    background: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    hoverBg: 'var(--color-primary-dark)',
  },
  secondary: {
    background: 'var(--color-surface-inset)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    hoverBg: 'var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: 'none',
    hoverBg: 'var(--color-surface-inset)',
  },
  danger: {
    background: 'var(--color-danger-subtle)',
    color: 'var(--color-danger)',
    border: '1px solid transparent',
    hoverBg: 'var(--color-danger)',
    hoverColor: '#fff',
  },
}

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  type = 'button',
  className = '',
  style = {},
  id,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${className}`}
      style={{
        background: v.background,
        color: v.color,
        border: v.border,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = v.hoverBg
          if (v.hoverColor) e.currentTarget.style.color = v.hoverColor
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = v.background
        e.currentTarget.style.color = v.color
      }}
      id={id}
      {...rest}
    >
      {loading ? <IconLoader size={16} /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  )
}
