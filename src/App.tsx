import { useState } from 'react'
import SplashScreen from './SplashScreen'
import Home from './Home'
import { SoundProvider } from './context/SoundContext'
import VolumeToggle from './components/ui/VolumeToggle'

function App() {
  const [booted, setBooted] = useState(false);

  return (
    <SoundProvider>
      <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#000' }}>
        <VolumeToggle />
        {!booted ? (
          <SplashScreen onComplete={() => setBooted(true)} />
        ) : (
          <Home />
        )}
      </div>
    </SoundProvider>
  )
}

export default App
