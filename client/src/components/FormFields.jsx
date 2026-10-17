export function Input({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  icon: Icon,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div className={className} style={style}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <span
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)', pointerEvents: 'none',
            }}
          >
            <Icon size={16} />
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg text-sm"
          style={{
            padding: Icon ? '10px 12px 10px 36px' : '10px 12px',
            background: 'var(--color-surface-inset)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            color: 'var(--color-text)',
            outline: 'none',
            transition: 'border-color var(--transition-fast)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-primary)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'
          }}
          {...rest}
        />
      </div>
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger)', marginTop: 4 }}>{error}</p>
      )}
    </div>
  )
}

export function Textarea({
  label,
  id,
  value,
  onChange,
  placeholder,
  rows = 8,
  required = false,
  error,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div className={className} style={style}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full rounded-lg text-sm"
        style={{
          padding: '12px',
          background: 'var(--color-surface-inset)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          color: 'var(--color-text)',
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.6,
          fontFamily: 'var(--font-sans)',
          transition: 'border-color var(--transition-fast)',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-primary)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'
        }}
        {...rest}
      />
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger)', marginTop: 4 }}>{error}</p>
      )}
    </div>
  )
}
