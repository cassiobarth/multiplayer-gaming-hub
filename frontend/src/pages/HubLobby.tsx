import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HubLobby: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    // Generate a random 6-character room ID
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${newRoomId}?name=${encodeURIComponent(playerName || 'Player 1')}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.toUpperCase()}?name=${encodeURIComponent(playerName || 'Player 2')}`);
    }
  };

  return (
    <div className="hub-container">
      <div className="glass-panel hub-layout">
        
        {/* Left Side: Games Selection */}
        <div className="hub-games">
          <h2 style={{ marginBottom: '0.5rem' }}>Select a Game</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Choose a game to play with your family.</p>
          
          <div className="game-grid">
            <div className="game-card active">
              <div className="game-icon">🧠</div>
              <h3>Memory Game</h3>
              <p>Find matching pairs</p>
            </div>
            <div className="game-card disabled">
              <div className="game-icon">❌</div>
              <h3>Tic-Tac-Toe</h3>
              <p>Coming Soon</p>
            </div>
            <div className="game-card disabled">
              <div className="game-icon">✏️</div>
              <h3>Draw & Guess</h3>
              <p>Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Right Side: Join / Create */}
        <div className="hub-sidebar">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Family Game Hub</h1>
            <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Real-time multiplayer games</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '1.2rem' }}>👤</span>
              <input 
                type="text" 
                placeholder="Your Name (e.g. Dad)" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <button onClick={handleCreateRoom} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
              Create New Room
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            <span style={{ padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR JOIN EXISTING</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Room Code" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={{ textTransform: 'uppercase', textAlign: 'center', flex: 2, letterSpacing: '2px', fontWeight: 'bold' }}
            />
            <button onClick={handleJoinRoom} style={{ flex: 1, background: 'var(--panel-bg)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
              Join
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HubLobby;
