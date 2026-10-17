export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      style={{ maxWidth: 380, margin: '0 auto' }}
    >
      {Icon && (
        <span
          className="mb-4 flex items-center justify-center rounded-2xl"
          style={{
            width: 56, height: 56,
            background: 'var(--color-surface-inset)',
            color: 'var(--color-text-muted)',
          }}
        >
          <Icon size={24} />
        </span>
      )}
      <h3
        className="mb-1 text-base font-semibold"
        style={{ color: 'var(--color-text)', margin: '0 0 4px' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
