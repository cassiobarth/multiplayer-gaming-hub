import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HubLobby from './pages/HubLobby';
import ActiveGameRoom from './pages/ActiveGameRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HubLobby />} />
        <Route path="/room/:roomId" element={<ActiveGameRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
