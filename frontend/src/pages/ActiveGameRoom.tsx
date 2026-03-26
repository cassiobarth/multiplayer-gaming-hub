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
  gridCols?: number;
  gridRows?: number;
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
  const [gridSize, setGridSize] = useState<{ cols: number, rows: number }>({ cols: 4, rows: 4 });
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
      initLocalGame(urls, gridSize.cols, gridSize.rows);
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
            socket.emit('memory_init', { roomId, images: absoluteUrls, gridCols: gridSize.cols, gridRows: gridSize.rows });
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

  const handleCupheadLoad = () => {
    const cupheadUrls = Array.from({length: 6}, (_, i) => `${window.location.origin}/cuphead/${i + 1}.png`);
    if (isLocalMode) {
      initLocalGame(cupheadUrls, gridSize.cols, gridSize.rows);
    } else {
      if (!socket) return;
      socket.emit('memory_init', { roomId, images: cupheadUrls, gridCols: gridSize.cols, gridRows: gridSize.rows });
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
    alert('Link copiado para a área de transferência!');
  };

  return (
    <div className="room-container">
      {/* Game Area (Left Side) */}
      <div className="game-area">
        <h2 style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'rgba(255,255,255,0.4)', zIndex: 0 }}>
          Código da Sala: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{roomId}</span>
        </h2>
        
        <div style={{ zIndex: 1, width: '100%' }}>
          {!activeGameState || activeGameState.cards.length === 0 ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Jogo da Memória</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.2rem' }}>
                {isLocalMode 
                  ? 'Modo Local ativado! Faça o upload das fotos locais. Não precisa de internet.' 
                  : players.length < 2 
                    ? 'Aguardando o outro jogador entrar. Que tal configurar o jogo enquanto isso?' 
                    : 'O outro jogador chegou! Crie o baralho para começarmos.'}
              </p>
              
              {!isLocalMode && players.length < 2 && (
                <button 
                  onClick={() => setIsLocalMode(true)} 
                  style={{ marginBottom: '2rem', background: '#eab308', color: '#1c1917', border: 'none' }}
                >
                  Modo Offline / Teste Local 🤖
                </button>
              )}
              
              <div style={{ marginBottom: '2rem', background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'inline-block' }}>
                <h3 style={{ marginBottom: '1rem' }}>Configuração do Tabuleiro</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={() => setGridSize({cols: 4, rows: 4})} style={{ padding: '0.6em 1.2em', borderRadius: '8px', cursor: 'pointer', border: 'none', background: gridSize.cols === 4 && gridSize.rows === 4 ? 'var(--primary)' : '#334155', color: 'white' }}>4x4</button>
                  <button onClick={() => setGridSize({cols: 8, rows: 8})} style={{ padding: '0.6em 1.2em', borderRadius: '8px', cursor: 'pointer', border: 'none', background: gridSize.cols === 8 && gridSize.rows === 8 ? 'var(--primary)' : '#334155', color: 'white' }}>8x8</button>
                  <button onClick={() => setGridSize({cols: 16, rows: 6})} style={{ padding: '0.6em 1.2em', borderRadius: '8px', cursor: 'pointer', border: 'none', background: gridSize.cols === 16 && gridSize.rows === 6 ? 'var(--primary)' : '#334155', color: 'white' }}>16x6</button>
                </div>
              </div>

              <div style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px', border: '1px dashed var(--glass-border)', display: 'inline-block' }}>
                <h3 style={{ marginBottom: '1rem' }}>Fazer Upload do Baralho</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Escolha várias fotos. O jogo preencherá o tabuleiro {gridSize.cols}x{gridSize.rows} automaticamente.
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
                  {isUploading ? 'Enviando...' : 'Escolher Imagens'}
                </button>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ou comece agora com um baralho pronto:</p>
                  <button 
                    onClick={handleCupheadLoad}
                    style={{ background: '#f59e0b', padding: '0.6em 1.2em', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'white', border: 'none' }}
                  >
                    🎲 Jogar com Minigame do Cuphead
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Score Header */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: activeMyPlayerIndex === 0 ? 'bold' : 'normal', color: activeGameState.currentPlayerIndex === 0 ? 'var(--primary)' : 'white' }}>
                  P1 Pontos: {activeGameState.scores[0]} {(activeMyPlayerIndex === 0 || isLocalMode) && '(Você)'}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: activeMyPlayerIndex === 1 ? 'bold' : 'normal', color: activeGameState.currentPlayerIndex === 1 ? 'var(--primary)' : 'white' }}>
                  P2 Pontos: {activeGameState.scores[1]} {(activeMyPlayerIndex === 1 || isLocalMode) && '(Você)'}
                </div>
              </div>

              {/* Memory Board */}
              <MemoryGameBoard 
                images={[]} // Images are inside activeGameState.cards
                isMyTurn={activeIsMyTurn}
                onCardFlip={handleCardFlip}
                gameStateCards={activeGameState.cards}
                gridCols={activeGameState.gridCols}
              />
            </>
          )}
        </div>
      </div>

      {/* Video Sidebar (Right Side) */}
      <div className="video-sidebar">
        
        {/* Remote Player Video */}
        <div className="video-card">
          <div className="video-nameplate">{players.length === 2 ? 'Adversário' : `Conectando... (${players.length}/2)`}</div>
          <video autoPlay playsInline ref={remoteVideoRef} />
          {!remoteVideoRef.current && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Aguardando conexão...
            </div>
          )}
        </div>

        {/* Local Player Video */}
        <div className="video-card">
          <div className="video-nameplate">{playerName} (Você)</div>
          <video autoPlay playsInline muted ref={localVideoRef} />
          {!isCamEnabled ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 10 }}>
               <button onClick={startCamera} style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span>📷</span> Entrar na Chamada
               </button>
            </div>
          ) : !localVideoRef.current && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Iniciando câmera...
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button onClick={handleCopyLink} style={{ padding: '0.8rem', flex: 1, fontSize: '0.9rem', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)' }}>Copiar Link</button>
          <button onClick={handleLeave} style={{ padding: '0.8rem', flex: 1, fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.5)' }}>Sair da Sala</button>
        </div>
      </div>
    </div>
  );
};

export default ActiveGameRoom;
