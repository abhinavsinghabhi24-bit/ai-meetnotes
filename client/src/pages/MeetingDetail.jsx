import { useState, useEffect } from 'react'
import Card, { CardHeader } from '../components/Card'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import {
  IconFileText,
  IconList,
  IconCheck,
  IconUsers,
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconLoader,
  IconTrash,
} from '../components/Icons'
import { fetchMeeting, deleteMeeting } from '../utils/api'

export default function MeetingDetail({ meetingId, onNavigate }) {
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchMeeting(meetingId)
        if (isMounted) {
          if (res?.data) {
            setMeeting(res.data)
          } else {
            throw new Error('Invalid meeting data received')
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load meeting details')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    if (meetingId) {
      load()
    }
    return () => {
      isMounted = false
    }
  }, [meetingId])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this meeting record?')) {
      return
    }
    setDeleting(true)
    try {
      await deleteMeeting(meetingId)
      onNavigate('history')
    } catch (err) {
      alert(`Failed to delete meeting: ${err.message}`)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <div className="flex flex-col items-center py-20">
          <IconLoader size={32} style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Loading meeting details…
          </p>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <Card style={{ borderColor: 'var(--color-danger)' }} id="meeting-detail-error">
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
                Could not load meeting
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
                {error || 'Meeting not found'}
              </p>
              <Button variant="secondary" onClick={() => onNavigate('history')}>
                ← Back to History
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => onNavigate('history')}
          id="back-to-history-btn"
        >
          ← Back to History
        </Button>
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            disabled={deleting}
            icon={IconTrash}
            id="delete-meeting-btn"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Header Info */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {meeting.provider && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
              }}
            >
              {meeting.provider.toUpperCase()} {meeting.model ? `• ${meeting.model}` : ''}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <IconClock size={12} />
            {new Date(meeting.createdAt || meeting.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', margin: '0 0 6px' }}
        >
          {meeting.title}
        </h2>
      </div>

      {/* Executive Summary Card */}
      <Card style={{ marginBottom: 20 }} id="detail-summary-card">
        <CardHeader
          title="Executive Summary"
          subtitle="AI-generated overview of the meeting"
          icon={IconFileText}
        />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {meeting.summary || 'No summary available.'}
        </p>
      </Card>

      {/* Key Discussion Points Card */}
      <Card style={{ marginBottom: 20 }} id="detail-discussion-card">
        <CardHeader
          title="Key Discussion Points"
          subtitle="Main topics and decisions extracted"
          icon={IconList}
        />
        {meeting.keyDiscussionPoints?.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }} className="flex flex-col gap-2">
            {meeting.keyDiscussionPoints.map((point, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            No key discussion points recorded.
          </p>
        )}
      </Card>

      {/* Action Items Card */}
      <Card style={{ marginBottom: 20 }} id="detail-actions-card">
        <CardHeader
          title={`Action Items (${meeting.actionItems?.length || 0})`}
          subtitle="Agreed upon deliverables and owners"
          icon={IconCheck}
        />
        {meeting.actionItems?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {meeting.actionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg p-3"
                style={{ background: 'var(--color-surface-inset)' }}
              >
                <IconCheck size={16} style={{ color: 'var(--color-success)', marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)', margin: 0 }}>
                    {item.task}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <IconUsers size={12} />
                      <strong style={{ fontWeight: 500, color: item.owner ? 'var(--color-text)' : 'inherit' }}>
                        {item.owner ? item.owner : 'Unassigned'}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <IconCalendar size={12} />
                      <strong style={{ fontWeight: 500, color: item.deadline ? 'var(--color-text)' : 'inherit' }}>
                        {item.deadline ? item.deadline : 'No deadline'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={IconCheck}
            title="No action items"
            description="No specific tasks were extracted or added for this meeting."
          />
        )}
      </Card>

      {/* Meeting Transcript Card */}
      <Card id="detail-transcript-card">
        <CardHeader
          title="Meeting Transcript"
          subtitle={`${meeting.transcript?.length?.toLocaleString() || 0} characters`}
          icon={IconFileText}
          action={
            <Button
              variant="ghost"
              onClick={() => setTranscriptExpanded(!transcriptExpanded)}
              id="toggle-transcript-btn"
            >
              {transcriptExpanded ? 'Collapse' : 'Expand'}
            </Button>
          }
        />
        <div
          style={{
            maxHeight: transcriptExpanded ? 'none' : '200px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <pre
            className="text-xs rounded-lg p-3 font-mono"
            style={{
              background: 'var(--color-surface-inset)',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {meeting.transcript || 'No transcript available.'}
          </pre>
          {!transcriptExpanded && meeting.transcript?.length > 400 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                background: 'linear-gradient(transparent, var(--color-surface-raised))',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
