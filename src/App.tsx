import { useState } from 'react'
import SplashScreen from './SplashScreen'
import Home from './Home'
import { SoundProvider } from './context/SoundContext'
import { QualityProvider } from './context/QualityContext'
import VolumeToggle from './components/ui/VolumeToggle'
import NeuroLinkBadge from './components/ui/NeuroLinkBadge'

function App() {
  const [booted, setBooted] = useState(false);

  return (
    <SoundProvider>
      {/* QualityProvider wraps everything so useQuality() works in all 3D scenes */}
      <QualityProvider>
        <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#000' }}>
          {/* Always-visible GPU Tier HUD — mounts immediately, even during splash */}
          <NeuroLinkBadge />
          <VolumeToggle />
          {!booted ? (
            <SplashScreen onComplete={() => setBooted(true)} />
          ) : (
            <Home />
          )}
        </div>
      </QualityProvider>
    </SoundProvider>
  )
}

export default App
