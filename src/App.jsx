import './App.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stats from './components/Stats'
import About from './components/About'
import Programs from './components/Programs'
import Values from './components/Values'
import Trainer from './components/Trainer'
import Contact from './components/Contact'
import Footer from './components/Footer'
import EduLynkApp from './edylynk/App.jsx'

const isEduLynk = window.location.pathname.startsWith('/EduLynk')

function App() {
  if (isEduLynk) {
    return <EduLynkApp />
  }

  return (
    <div className="app">
      <Navbar />
      <Hero />
      <Stats />
      <About />
      <Programs />
      <Values />
      <Trainer />
      <Contact />
      <Footer />
    </div>
  )
}

export default App
