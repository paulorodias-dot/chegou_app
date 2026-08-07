import { useState } from 'react'

import {
  CalendarWorkspace,
  MASTER_CALENDAR_FAKE_EVENTS,
} from '../../../components/premium/calendar'

import DashboardHeader from './components/DashboardHeader'
import DashboardMainContent from './components/DashboardMainContent'
import DashboardRightSidebar from './components/DashboardRightSidebar'
import AnalyticsSelector from './navigation/AnalyticsSelector'

import './DashboardMaster.css'

function DashboardMaster() {
  const [analiseAtiva, setAnaliseAtiva] =
    useState('system-intelligence')

  const [dashboardView, setDashboardView] =
    useState('analytics')

  function handleOpenCalendar() {
    setDashboardView('calendar')
  }

  function handleCloseCalendar() {
    setDashboardView('analytics')
  }

  return (
    <section className="dashboard-master-page">
      <div className="dashboard-master-grid">
        <main className="dashboard-master-main">
          {dashboardView === 'analytics' ? (
            <>
              <DashboardHeader />

              <AnalyticsSelector
                value={analiseAtiva}
                onChange={setAnaliseAtiva}
              />

              <DashboardMainContent
                analysisId={analiseAtiva}
              />
            </>
          ) : (
            <CalendarWorkspace
              events={
                MASTER_CALENDAR_FAKE_EVENTS
              }
              onBack={handleCloseCalendar}
            />
          )}
        </main>

        <aside
          className="dashboard-master-sidebar"
          aria-label="Informações complementares do Dashboard"
        >
          <DashboardRightSidebar
            calendarEvents={
              MASTER_CALENDAR_FAKE_EVENTS
            }
            onOpenCalendar={
              handleOpenCalendar
            }
          />
        </aside>
      </div>
    </section>
  )
}

export default DashboardMaster