import { useState, useCallback } from 'react'
import Card, { CardHeader } from '../components/Card'
import Button from '../components/Button'
import { Input, Textarea } from '../components/FormFields'
import EmptyState from '../components/EmptyState'
import {
  IconSparkles, IconFileText, IconList, IconCheck,
  IconUsers, IconCalendar, IconTrash, IconPlus, IconAlertCircle,
  IconRefresh, IconKey, IconCheckCircle,
} from '../components/Icons'
import { analyzeMeeting, saveMeeting } from '../utils/api'

// Initial empty action item row
const emptyActionItem = () => ({ task: '', owner: '', deadline: '' })

export default function NewMeeting({ onNavigate, onOpenMeeting }) {
  // ── Form state ──────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [errors, setErrors] = useState({})

  // ── Analysis state ──────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [analysisSuccess, setAnalysisSuccess] = useState(false)
  const [results, setResults] = useState(null)

  // ── Persistence state (Phase 4) ─────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedMeetingId, setSavedMeetingId] = useState(null)

  // ── Action items (editable) ─────────────────────────────────
  const [actionItems, setActionItems] = useState([emptyActionItem()])

  // ── Validation ──────────────────────────────────────────────
  const validate = useCallback(() => {
    const errs = {}
    if (!title.trim()) errs.title = 'Meeting title is required'
    if (!transcript.trim()) errs.transcript = 'Transcript is required for analysis'
    else if (transcript.trim().length < 20)
      errs.transcript = 'Transcript is too short (minimum 20 characters)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [title, transcript])

  // ── Analyze handler (Real AI analysis) ──────────────────────
  const handleAnalyze = async () => {
    // Prevent accidental duplicate submissions
    if (analyzing) return
    if (!validate()) return

    setAnalyzing(true)
    setAnalysisError(null)
    setErrorCode(null)
    setAnalysisSuccess(false)

    try {
      const response = await analyzeMeeting({ title, transcript })
      if (response?.data) {
        setResults(response.data)
        setAnalysisSuccess(true)

        // Sync extracted AI action items into the editable table if present
        if (response.data.actionItems && response.data.actionItems.length > 0) {
          setActionItems(
            response.data.actionItems.map((item) => ({
              task: item.task || '',
              owner: item.owner || '',
              deadline: item.deadline || '',
            }))
          )
        }
      } else {
        throw new Error('Unexpected server response format')
      }
    } catch (err) {
      setAnalysisError(err.message || 'Failed to analyze meeting.')
      setErrorCode(err.code || 'UNKNOWN_ERROR')
      if (err.errors) {
        setErrors(err.errors)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Action item handlers ────────────────────────────────────
  const updateActionItem = (index, field, value) => {
    setActionItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const addActionItem = () => {
    setActionItems((items) => [...items, emptyActionItem()])
  }

  const removeActionItem = (index) => {
    setActionItems((items) => items.filter((_, i) => i !== index))
  }

  // ── Save Meeting Handler (Phase 4 Database Persistence) ──────
  const handleSaveMeeting = async () => {
    if (saving || !results) return
    setSaving(true)
    setSaveError(null)

    try {
      const res = await saveMeeting({
        id: savedMeetingId,
        title,
        transcript,
        summary: results.summary,
        keyDiscussionPoints: results.keyDiscussionPoints,
        actionItems: actionItems.filter((item) => item.task && item.task.trim()),
        provider: results.provider,
        model: results.model,
      })

      if (res?.data?.id) {
        setSavedMeetingId(res.data.id)
      } else {
        throw new Error('Database did not confirm successful save')
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save meeting to database')
    } finally {
      setSaving(false)
    }
  }

  // ── Clear form ──────────────────────────────────────────────
  const handleClear = () => {
    setTitle('')
    setTranscript('')
    setErrors({})
    setResults(null)
    setAnalysisError(null)
    setAnalysisSuccess(false)
    setSavedMeetingId(null)
    setSaveError(null)
    setActionItems([emptyActionItem()])
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', margin: '0 0 6px' }}
        >
          New Meeting
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Paste your meeting transcript and let AI extract the key insights, discussion points, and action items.
        </p>
      </div>

      {/* Meeting Input Card */}
      <Card style={{ marginBottom: 20 }} id="meeting-input-card">
        <CardHeader
          title="Meeting Details"
          subtitle="Enter the meeting information"
          icon={IconFileText}
        />

        <div className="flex flex-col gap-4">
          <Input
            id="meeting-title"
            label="Meeting Title"
            placeholder="e.g. Q4 Product Planning — Oct 12, 2026"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }))
            }}
            required
            error={errors.title}
          />

          <Textarea
            id="meeting-transcript"
            label="Meeting Transcript"
            placeholder={"Paste the full meeting transcript here...\n\nExample:\nAlice: Let's start by reviewing the Q3 metrics.\nBob: Revenue was up 12% quarter over quarter.\nAlice: Great. What about user retention?\nCarol: We saw a slight dip in month-2 retention..."}
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value)
              if (errors.transcript) setErrors((prev) => ({ ...prev, transcript: undefined }))
            }}
            rows={10}
            required
            error={errors.transcript}
          />

          {/* Character count */}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              {transcript.length > 0 ? `${transcript.length.toLocaleString()} characters` : ''}
            </p>
            <div className="flex gap-2">
              {(title || transcript) && (
                <Button variant="ghost" onClick={handleClear} id="clear-form-btn">
                  Clear
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                loading={analyzing}
                disabled={!title.trim() || !transcript.trim()}
                icon={IconSparkles}
                id="analyze-btn"
              >
                {analyzing ? 'Analyzing…' : 'Analyze Meeting'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Configuration Notice (when no API key is set) */}
      {analysisError && errorCode === 'AI_CONFIG_ERROR' && (
        <Card style={{ marginBottom: 20, borderColor: 'var(--color-warning)' }} id="analysis-config-notice">
          <div className="flex items-start gap-3">
            <span
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36, height: 36, flexShrink: 0,
                background: 'var(--color-warning-subtle)',
                color: 'var(--color-warning)',
              }}
            >
              <IconKey size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', margin: '0 0 4px' }}>
                AI Provider API Key Required
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>
                {analysisError}
              </p>
              <div
                className="rounded-md p-3 text-xs font-mono"
                style={{
                  background: 'var(--color-surface-inset)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  marginBottom: 12,
                  lineHeight: 1.6,
                }}
              >
                # Option 1: Google Gemini (Recommended - Free in Google AI Studio)<br />
                GEMINI_API_KEY=your_gemini_api_key_here<br /><br />
                # Option 2: OpenAI<br />
                OPENAI_API_KEY=your_openai_api_key_here
              </div>
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={analyzing}
                loading={analyzing}
                icon={IconRefresh}
                id="retry-analyze-btn"
              >
                Retry Analysis
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* General Analysis Error (Network, Rate Limit, Validation) */}
      {analysisError && errorCode !== 'AI_CONFIG_ERROR' && (
        <Card style={{ marginBottom: 20, borderColor: 'var(--color-danger)' }} id="analysis-error">
          <div className="flex items-start gap-3">
            <span
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36, height: 36, flexShrink: 0,
                background: 'var(--color-danger-subtle)',
                color: 'var(--color-danger)',
              }}
            >
              <IconAlertCircle size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)', margin: '0 0 4px' }}>
                Analysis could not be completed
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
                {analysisError}
              </p>
              <Button
                variant="secondary"
                onClick={handleAnalyze}
                disabled={analyzing}
                loading={analyzing}
                icon={IconRefresh}
                id="retry-btn"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis Success Banner */}
      {analysisSuccess && results && (
        <Card style={{ marginBottom: 20, borderColor: 'var(--color-success)' }} id="analysis-success">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 36, height: 36, flexShrink: 0,
                  background: 'var(--color-success-subtle)',
                  color: 'var(--color-success)',
                }}
              >
                <IconCheckCircle size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-success)', margin: 0 }}>
                  Meeting analyzed successfully!
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  Analyzed by {results.provider?.toUpperCase()} ({results.model})
                </p>
              </div>
            </div>

            <Button
              variant={savedMeetingId ? "secondary" : "primary"}
              onClick={handleSaveMeeting}
              loading={saving}
              disabled={saving}
              icon={IconCheck}
              id="save-meeting-btn"
            >
              {savedMeetingId ? "Update Saved Record" : "Save Meeting to History"}
            </Button>
          </div>
        </Card>
      )}

      {/* Permanent Save Confirmation Card */}
      {savedMeetingId && (
        <Card
          style={{
            marginBottom: 20,
            borderColor: 'var(--color-success)',
            background: 'var(--color-success-subtle)',
          }}
          id="save-confirmation"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <IconCheckCircle size={20} style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', margin: 0 }}>
                  Saved to SQLite Database (Meeting #{savedMeetingId})
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                  This meeting is now stored and searchable in your meeting history.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => (onOpenMeeting ? onOpenMeeting(savedMeetingId) : onNavigate('history'))}
                id="view-saved-details-btn"
              >
                View Full Details
              </Button>
              <Button
                variant="ghost"
                onClick={() => onNavigate('history')}
                id="go-to-history-btn"
              >
                All Meetings →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <Card style={{ marginBottom: 20, borderColor: 'var(--color-danger)' }} id="save-error">
          <div className="flex items-start gap-3">
            <span
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36, height: 36, flexShrink: 0,
                background: 'var(--color-danger-subtle)',
                color: 'var(--color-danger)',
              }}
            >
              <IconAlertCircle size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)', margin: '0 0 4px' }}>
                Failed to save meeting
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
                {saveError}
              </p>
              <Button
                variant="secondary"
                onClick={handleSaveMeeting}
                loading={saving}
                id="retry-save-btn"
              >
                Retry Save
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Analyzing State */}
      {analyzing && (
        <Card style={{ marginBottom: 20 }} id="analyzing-state">
          <div className="flex flex-col items-center py-8">
            <div
              className="mb-4"
              style={{
                width: 40, height: 40,
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)', margin: '0 0 4px' }}>
              Analyzing your meeting…
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Extracting summary, discussion points, and action items
            </p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Card>
      )}

      {/* Results Section — visible only when results exist */}
      {results && (
        <>
          {/* Summary */}
          <Card style={{ marginBottom: 20 }} id="summary-card">
            <CardHeader
              title="Summary"
              subtitle="AI-generated overview of the meeting"
              icon={IconFileText}
            />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: 0 }}>
              {results.summary || 'No summary available.'}
            </p>
          </Card>

          {/* Key Discussion Points */}
          <Card style={{ marginBottom: 20 }} id="discussion-card">
            <CardHeader
              title="Key Discussion Points"
              subtitle="Main topics covered during the meeting"
              icon={IconList}
            />
            {results.keyDiscussionPoints?.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }} className="flex flex-col gap-2">
                {results.keyDiscussionPoints.map((point, i) => (
                  <li key={i} className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {point}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No discussion points extracted.
              </p>
            )}
          </Card>

          {/* Action Items from AI */}
          <Card style={{ marginBottom: 20 }} id="ai-actions-card">
            <CardHeader
              title="Action Items"
              subtitle="Tasks identified from the meeting"
              icon={IconCheck}
            />
            {results.actionItems?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {results.actionItems.map((item, i) => (
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
                      <div className="flex flex-wrap gap-3 mt-1">
                        {item.owner && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <IconUsers size={12} /> {item.owner}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <IconCalendar size={12} /> {item.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No action items identified.
              </p>
            )}
          </Card>
        </>
      )}

      {/* Manual Action Items — always visible for note-taking */}
      <Card id="manual-actions-card">
        <CardHeader
          title="Action Items"
          subtitle={results ? 'Add additional action items manually' : 'Track action items for this meeting'}
          icon={IconCheck}
          action={
            <Button variant="ghost" onClick={addActionItem} icon={IconPlus} id="add-action-btn">
              Add
            </Button>
          }
        />

        {actionItems.length === 0 ? (
          <EmptyState
            icon={IconCheck}
            title="No action items"
            description="Click 'Add' to create action items manually, or analyze a meeting to extract them automatically."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {actionItems.map((item, index) => (
              <div
                key={index}
                className="flex flex-wrap items-start gap-3 rounded-lg p-3"
                style={{ background: 'var(--color-surface-inset)' }}
              >
                <div className="flex-1" style={{ minWidth: 180 }}>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
                    htmlFor={`action-task-${index}`}
                  >
                    Task
                  </label>
                  <input
                    id={`action-task-${index}`}
                    type="text"
                    value={item.task}
                    onChange={(e) => updateActionItem(index, 'task', e.target.value)}
                    placeholder="Describe the action item…"
                    className="w-full rounded-md text-sm"
                    style={{
                      padding: '8px 10px',
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
                  />
                </div>

                <div style={{ width: 150 }}>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
                    htmlFor={`action-owner-${index}`}
                  >
                    Owner
                  </label>
                  <input
                    id={`action-owner-${index}`}
                    type="text"
                    value={item.owner}
                    onChange={(e) => updateActionItem(index, 'owner', e.target.value)}
                    placeholder="Who?"
                    className="w-full rounded-md text-sm"
                    style={{
                      padding: '8px 10px',
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
                  />
                </div>

                <div style={{ width: 150 }}>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
                    htmlFor={`action-deadline-${index}`}
                  >
                    Deadline
                  </label>
                  <input
                    id={`action-deadline-${index}`}
                    type="date"
                    value={item.deadline}
                    onChange={(e) => updateActionItem(index, 'deadline', e.target.value)}
                    className="w-full rounded-md text-sm"
                    style={{
                      padding: '8px 10px',
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
                  />
                </div>

                <div style={{ paddingTop: 22 }}>
                  <button
                    onClick={() => removeActionItem(index)}
                    className="flex items-center justify-center rounded-md p-2"
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--color-text-muted)', cursor: 'pointer',
                      transition: 'color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
                    aria-label={`Remove action item ${index + 1}`}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
