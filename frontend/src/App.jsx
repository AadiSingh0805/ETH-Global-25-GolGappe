import './App.css'
import Navbar from './components/Navbar/Navbar'
import TopSection from './components/TopSection/TopSection'
import MainContent from './components/MainContent/MainContent'

function App() {
  return (
    <div className="app">
      <Navbar />
      <div className="app-content">
        <TopSection />
        <MainContent />
      </div>
    </div>
  )
}

export default App
