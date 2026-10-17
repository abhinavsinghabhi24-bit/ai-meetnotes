export default function Card({ children, className = '', style = {}, id, padding = true }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: padding ? '24px' : 0,
        ...style,
      }}
      id={id}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 36, height: 36,
              background: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </span>
        )}
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--color-text)', margin: 0, lineHeight: 1.3 }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
