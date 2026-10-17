import { useState } from 'react'
import Sidebar from './components/Sidebar'
import NewMeeting from './pages/NewMeeting'
import MeetingHistory from './pages/MeetingHistory'
import MeetingDetail from './pages/MeetingDetail'

export default function App() {
  const [currentPage, setCurrentPage] = useState('new-meeting')
  const [selectedMeetingId, setSelectedMeetingId] = useState(null)

  const handleOpenMeeting = (id) => {
    setSelectedMeetingId(id)
    setCurrentPage('detail')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'detail':
        return <MeetingDetail meetingId={selectedMeetingId} onNavigate={setCurrentPage} />
      case 'history':
        return <MeetingHistory onNavigate={setCurrentPage} onOpenMeeting={handleOpenMeeting} />
      case 'new-meeting':
      default:
        return <NewMeeting onNavigate={setCurrentPage} onOpenMeeting={handleOpenMeeting} />
    }
  }

  return (
    <>
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main
        className="flex-1"
        style={{
          padding: '32px 32px 48px',
          minHeight: '100dvh',
          overflowX: 'hidden',
        }}
        id="main-content"
      >
        {renderPage()}
      </main>

      {/* Mobile: adjust main padding */}
      <style>{`
        @media (max-width: 768px) {
          #main-content {
            padding: 20px 16px 48px !important;
            margin-top: 52px;
          }
        }
      `}</style>
    </>
  )
}
