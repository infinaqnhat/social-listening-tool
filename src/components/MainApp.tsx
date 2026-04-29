import TopBar from './TopBar'
import ResultsView from './ResultsView'
import SavedPanel from './SavedPanel'
import HistoryPanel from './HistoryPanel'
import InsightsPanel from './InsightsPanel'
import Toast from './Toast'
import { useStore } from '../store/searchStore'

const VIEW_TABS = [
  { id: 'results',  label: '🔎 Results' },
  { id: 'insights', label: '📊 Insights' },
  { id: 'saved',    label: '🔖 Saved' },
  { id: 'history',  label: '🕐 History' },
] as const

export default function MainApp() {
  const { insightsView, setInsightsView, savedPosts, allResults, liResults, ttResults } = useStore()

  const totalResults = allResults.length + liResults.length + ttResults.length

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* View tab bar — only shown after a search */}
        {totalResults > 0 && (
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {VIEW_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setInsightsView(tab.id)}
                className={`text-sm px-4 py-2.5 border-b-2 transition font-medium ${
                  insightsView === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.id === 'saved' && savedPosts.length > 0 && (
                  <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                    {savedPosts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Panel content */}
        {(insightsView === 'results' || totalResults === 0) && <ResultsView />}
        {insightsView === 'insights' && totalResults > 0 && <InsightsPanel />}
        {insightsView === 'saved'    && totalResults > 0 && <SavedPanel />}
        {insightsView === 'history'  && totalResults > 0 && <HistoryPanel />}
      </div>

      <Toast />
    </div>
  )
}
