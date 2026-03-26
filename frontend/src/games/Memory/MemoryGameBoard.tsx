import React from 'react';
import './MemoryGame.css';

export interface CardType {
  id: number;
  imageId: string; // The URL or identifier of the uploaded image
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameBoardProps {
  images: string[];
  isMyTurn: boolean;
  onCardFlip: (cardIndex: number) => void;
  gameStateCards: CardType[];
  gridCols?: number;
}

const MemoryGameBoard: React.FC<MemoryGameBoardProps> = ({ 
  isMyTurn, 
  onCardFlip, 
  gameStateCards,
  gridCols
}) => {
  // Calculate grid dimensions dynamically
  // Math.ceil(Math.sqrt(total_cards))
  const totalCards = gameStateCards.length;
  const cols = gridCols || Math.ceil(Math.sqrt(totalCards)) || 4;

  return (
    <div className={`memory-board-container ${isMyTurn ? 'my-turn' : 'waiting-turn'}`}>
      <div 
        className="memory-grid"
        style={{ '--grid-cols': cols } as React.CSSProperties}
      >
        {gameStateCards.map((card, index) => (
          <div 
            key={card.id || index} 
            className={`memory-card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
            onClick={() => onCardFlip(index)}
          >
            <div className="memory-card-inner">
              <div className="memory-card-front">
                <span>?</span>
              </div>
              <div className="memory-card-back">
                <img src={card.imageId} alt="Memory card" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {!isMyTurn && <div className="turn-overlay">Vez do adversário... será que ele adormeceu? 😴</div>}
    </div>
  );
};

export default MemoryGameBoard;
