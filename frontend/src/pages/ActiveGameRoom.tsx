import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../core/hooks/useSocket';
import { useWebRTC } from '../core/hooks/useWebRTC';
import { BACKEND_URL } from '../core/config';
import MemoryGameBoard, { type CardType } from '../games/Memory/MemoryGameBoard';
import { useLocalMemoryGame } from '../core/hooks/useLocalMemoryGame';

interface GameState {
  cards: CardType[];
  currentPlayerIndex: number;
  scores: [number, number];
  flippedIndices: number[];
}

const ActiveGameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';
  const navigate = useNavigate();

  const { socket, players } = useSocket(roomId || '');
  const { localVideoRef, remoteVideoRef, isCamEnabled, startCamera } = useWebRTC(socket);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { localGameState, initLocalGame, handleLocalFlip } = useLocalMemoryGame();

  // My player index in the room (0 or 1)
  const myPlayerIndex = players.indexOf(socket?.id || '');
  const isMyTurn = gameState?.currentPlayerIndex === myPlayerIndex;

  const activeGameState = isLocalMode ? localGameState : gameState;
  const activeMyPlayerIndex = isLocalMode ? localGameState?.currentPlayerIndex ?? 0 : myPlayerIndex;
  const activeIsMyTurn = isLocalMode ? true : isMyTurn;

  useEffect(() => {
    if (!socket) return;
    
    socket.on('memory_state_update', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off('memory_state_update');
    };
  }, [socket]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    if (isLocalMode) {
      const urls = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      initLocalGame(urls);
      if (e.target) e.target.value = '';
      return;
    }

    if (!socket) return;
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
        formData.append('images', e.target.files[i]);
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/upload-pack`, {
            method: 'POST',
            body: formData,
            headers: {
                "Bypass-Tunnel-Reminder": "true",
                "ngrok-skip-browser-warning": "true"
            }
        });
        const data = await response.json();
        if (data.success && data.urls) {
            // URLs are relative to backend server like /uploads/...
            // Since we serve static files, we map to absolute URLs
            const absoluteUrls = data.urls.map((url: string) => `${BACKEND_URL}${url}`);
            socket.emit('memory_init', { roomId, images: absoluteUrls });
        }
    } catch (err) {
        console.error('Upload failed', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setUploadError(`Error: ${errMsg}. Check console for details.`);
    } finally {
        setIsUploading(false);
        if (e.target) {
            e.target.value = '';
        }
    }
  };

  const handleCardFlip = (index: number) => {
    if (isLocalMode) {
       handleLocalFlip(index);
       return;
    }
    if (!socket || !isMyTurn) return;
    socket.emit('memory_flip', { roomId, cardIndex: index });
  };

  const handleLeave = () => {
    navigate('/');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="room-container">
      {/* Game Area (Left Side) */}
      <div className="game-area">
        <h2 style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'rgba(255,255,255,0.4)', zIndex: 0 }}>
          Secret Lair Code: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{roomId}</span>
        </h2>
        
        <div style={{ zIndex: 1, width: '100%' }}>
          {!activeGameState || activeGameState.cards.length === 0 ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Memory Game</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.2rem' }}>
                {isLocalMode 
                  ? 'Local Mode activated! Upload local pictures. No internet required.' 
                  : players.length < 2 
                    ? 'Waiting for your victim... I mean opponent. Configure the game while they dilly-dally.' 
                    : 'A challenger has appeared! Upload some embarrassing photos for the deck.'}
              </p>
              
              {!isLocalMode && players.length < 2 && (
                <button 
                  onClick={() => setIsLocalMode(true)} 
                  style={{ marginBottom: '2rem', background: '#eab308', color: '#1c1917', border: 'none' }}
                >
                  Go Offline/Local Play 🤖
                </button>
              )}
              
              <div style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px', border: '1px dashed var(--glass-border)', display: 'inline-block' }}>
                <h3 style={{ marginBottom: '1rem' }}>Upload Image Pack</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Pick multiple pics. The sillier, the better.
                </p>
                {uploadError && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{uploadError}</div>}
                
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                  disabled={isUploading} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading}
                  style={{ display: 'inline-block', background: 'var(--primary)', padding: '0.8em 1.5em', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'white', border: 'none' }}
                >
                  {isUploading ? 'Uploading...' : 'Choose Images'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Score Header */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: activeMyPlayerIndex === 0 ? 'bold' : 'normal', color: activeGameState.currentPlayerIndex === 0 ? 'var(--primary)' : 'white' }}>
                  P1 Score: {activeGameState.scores[0]} {(activeMyPlayerIndex === 0 || isLocalMode) && '(You)'}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: activeMyPlayerIndex === 1 ? 'bold' : 'normal', color: activeGameState.currentPlayerIndex === 1 ? 'var(--primary)' : 'white' }}>
                  P2 Score: {activeGameState.scores[1]} {(activeMyPlayerIndex === 1 || isLocalMode) && '(You)'}
                </div>
              </div>

              {/* Memory Board */}
              <MemoryGameBoard 
                images={[]} // Images are inside activeGameState.cards
                isMyTurn={activeIsMyTurn}
                onCardFlip={handleCardFlip}
                gameStateCards={activeGameState.cards}
              />
            </>
          )}
        </div>
      </div>

      {/* Video Sidebar (Right Side) */}
      <div className="video-sidebar">
        
        {/* Remote Player Video */}
        <div className="video-card">
          <div className="video-nameplate">{players.length === 2 ? 'The Enemy' : `Summoning... (${players.length}/2)`}</div>
          <video autoPlay playsInline ref={remoteVideoRef} />
          {!remoteVideoRef.current && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Connecting...
            </div>
          )}
        </div>

        {/* Local Player Video */}
        <div className="video-card">
          <div className="video-nameplate">{playerName} (The Legend)</div>
          <video autoPlay playsInline muted ref={localVideoRef} />
          {!isCamEnabled ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 10 }}>
               <button onClick={startCamera} style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span>📷</span> Join Call
               </button>
            </div>
          ) : !localVideoRef.current && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Camera starting...
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button onClick={handleCopyLink} style={{ padding: '0.8rem', flex: 1, fontSize: '0.9rem', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)' }}>Brag (Copy Link)</button>
          <button onClick={handleLeave} style={{ padding: '0.8rem', flex: 1, fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.5)' }}>Rage Quit</button>
        </div>
      </div>
    </div>
  );
};

export default ActiveGameRoom;
