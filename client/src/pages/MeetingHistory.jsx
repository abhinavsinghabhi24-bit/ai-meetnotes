import { useState, useEffect, useCallback } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input } from '../components/FormFields'
import EmptyState from '../components/EmptyState'
import {
  IconSearch,
  IconClock,
  IconFileText,
  IconPlus,
  IconChevronRight,
  IconAlertCircle,
  IconLoader,
  IconCheck,
} from '../components/Icons'
import { fetchMeetings } from '../utils/api'

export default function MeetingHistory({ onNavigate, onOpenMeeting }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [meetings, setMeetings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE_SIZE = 15

  // Debounce search query input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setOffset(0) // reset pagination when query changes
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch meetings from API
  const loadMeetings = useCallback(
    async (query, currentOffset, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const res = await fetchMeetings(query, PAGE_SIZE, currentOffset)
        if (res?.data) {
          const list = res.data.meetings || []
          setMeetings((prev) => (append ? [...prev, ...list] : list))
          setTotal(res.data.total || 0)
        } else {
          throw new Error('Unexpected response format from server')
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch meetings from server')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    []
  )

  useEffect(() => {
    loadMeetings(debouncedQuery, 0, false)
  }, [debouncedQuery, loadMeetings])

  const handleLoadMore = () => {
    const nextOffset = offset + PAGE_SIZE
    setOffset(nextOffset)
    loadMeetings(debouncedQuery, nextOffset, true)
  }

  const handleOpen = (id) => {
    if (onOpenMeeting) {
      onOpenMeeting(id)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text)', margin: '0 0 6px' }}
          >
            Meeting History
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Browse and search your past analyzed meetings, action items, and transcripts.
          </p>
        </div>
        <Button onClick={() => onNavigate('new-meeting')} icon={IconPlus} id="new-meeting-btn">
          New Meeting
        </Button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 20 }}>
        <Input
          id="search-meetings"
          placeholder="Search by title, summary, or transcript contents…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={IconSearch}
        />
      </div>

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: 20, borderColor: 'var(--color-danger)' }} id="history-error">
          <div className="flex items-start gap-3">
            <span
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                background: 'var(--color-danger-subtle)',
                color: 'var(--color-danger)',
              }}
            >
              <IconAlertCircle size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)', margin: '0 0 4px' }}>
                Could not load meetings
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
                {error}
              </p>
              <Button
                variant="secondary"
                onClick={() => loadMeetings(debouncedQuery, 0, false)}
                id="retry-fetch-btn"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Initial Loading State */}
      {loading && !loadingMore && (
        <div className="flex flex-col items-center py-16">
          <IconLoader size={28} style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Loading meetings from database…
          </p>
        </div>
      )}

      {/* Meeting Cards List */}
      {!loading && !error && meetings.length > 0 && (
        <div className="flex flex-col gap-3">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              padding={false}
              style={{ cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              id={`meeting-card-${meeting.id}`}
            >
              <div
                className="flex items-start gap-4 p-4"
                onClick={() => handleOpen(meeting.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleOpen(meeting.id)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.parentElement.style.boxShadow = 'var(--shadow-md)'
                  e.currentTarget.parentElement.style.borderColor = 'var(--color-primary-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.parentElement.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.parentElement.style.borderColor = 'var(--color-border)'
                }}
              >
                <span
                  className="flex items-center justify-center rounded-lg mt-0.5"
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    background: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <IconFileText size={18} />
                </span>

                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p
                      className="text-base font-semibold"
                      style={{ color: 'var(--color-text)', margin: 0, lineHeight: 1.3 }}
                    >
                      {meeting.title}
                    </p>
                    {meeting.provider && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {meeting.provider.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {meeting.summary && (
                    <p
                      className="text-xs"
                      style={{
                        color: 'var(--color-text-secondary)',
                        margin: '0 0 8px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}
                    >
                      {meeting.summary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <IconClock size={12} />
                      {new Date(meeting.createdAt || meeting.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    {meeting.actionItemCount > 0 && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--color-success)' }}
                      >
                        <IconCheck size={12} />
                        {meeting.actionItemCount} action {meeting.actionItemCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="self-center">
                  <IconChevronRight size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </div>
              </div>
            </Card>
          ))}

          {/* Load More Button for Pagination */}
          {meetings.length < total && (
            <div className="flex justify-center mt-4">
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                loading={loadingMore}
                disabled={loadingMore}
                id="load-more-btn"
              >
                Load More Meetings ({meetings.length} of {total})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State: No meetings at all in database */}
      {!loading && !error && meetings.length === 0 && !debouncedQuery && (
        <EmptyState
          icon={IconClock}
          title="No saved meetings yet"
          description="Your analyzed meetings and notes will be saved and searchable here."
          action={
            <Button onClick={() => onNavigate('new-meeting')} icon={IconPlus} id="empty-new-meeting-btn">
              Create First Meeting
            </Button>
          }
        />
      )}

      {/* Empty State: Search returned 0 matches */}
      {!loading && !error && meetings.length === 0 && debouncedQuery && (
        <EmptyState
          icon={IconSearch}
          title="No matching meetings found"
          description={`No meetings matched "${debouncedQuery}" in title, summary, or transcript.`}
          action={
            <Button variant="secondary" onClick={() => setSearchQuery('')} id="clear-search-btn">
              Clear Search
            </Button>
          }
        />
      )}
    </div>
  )
}
