import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { IconSun, IconMoon, IconPlus, IconClock, IconMenu, IconX, IconSparkles } from './Icons'

const NAV_ITEMS = [
  { id: 'new-meeting', label: 'New Meeting', icon: IconPlus },
  { id: 'history', label: 'Meeting History', icon: IconClock },
]

export default function Sidebar({ currentPage, onNavigate }) {
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNav = (id) => {
    onNavigate(id)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          display: 'none',
          background: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
        id="mobile-topbar"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32, height: 32,
              background: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
            }}
          >
            <IconSparkles size={16} />
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            MeetNotes AI
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center rounded-lg p-2"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 40,
          }}
          id="sidebar-backdrop"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}
        style={{
          width: 'var(--sidebar-width)',
          minWidth: 'var(--sidebar-width)',
          height: '100dvh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface-raised)',
          borderRight: '1px solid var(--color-border)',
          transition: 'transform var(--transition-normal)',
          zIndex: 50,
          overflowY: 'auto',
        }}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <IconSparkles size={18} />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--color-text)', margin: 0 }}>
              MeetNotes AI
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Smart meeting notes
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3 py-4" style={{ flex: 1 }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                style={{
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  background: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-surface-inset)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
                aria-current={isActive ? 'page' : undefined}
                id={`nav-${id}`}
              >
                <Icon size={18} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Footer: Theme Toggle */}
        <div
          className="px-3 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
            style={{
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-inset)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            id="theme-toggle"
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Responsive styles injected inline via <style> */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-topbar {
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 52px;
            z-index: 30;
          }
          .sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
          }
          .sidebar--open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  )
}
