import TokenScreen from './components/TokenScreen'
import MainApp from './components/MainApp'
import { useStore } from './store/searchStore'

export default function App() {
  const token = useStore((s) => s.token)
  return token ? <MainApp /> : <TokenScreen />
}
