import { useState, useCallback } from 'react';
import { type CardType } from '../../games/Memory/MemoryGameBoard';

interface GameState {
  cards: CardType[];
  currentPlayerIndex: number;
  scores: [number, number];
  flippedIndices: number[];
  gridCols: number;
  gridRows: number;
}

export const useLocalMemoryGame = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const initLocalGame = useCallback((images: string[], gridCols: number = 4, gridRows: number = 4) => {
    const totalPairs = (gridCols * gridRows) / 2;
    const deckImages: string[] = [];
    
    let imgIndex = 0;
    for (let i = 0; i < totalPairs; i++) {
      deckImages.push(images[imgIndex % images.length]);
      imgIndex++;
    }

    // Create pairs
    const deck: CardType[] = [];
    let idCounter = 0;
    deckImages.forEach((img) => {
      deck.push({ id: idCounter++, imageId: img, isFlipped: false, isMatched: false });
      deck.push({ id: idCounter++, imageId: img, isFlipped: false, isMatched: false });
    });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setGameState({
      cards: deck,
      currentPlayerIndex: 0,
      scores: [0, 0],
      flippedIndices: [],
      gridCols,
      gridRows
    });
  }, []);

  const handleLocalFlip = useCallback((cardIndex: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (prev.flippedIndices.length >= 2) return prev; // Already 2 cards flipped
      if (prev.cards[cardIndex].isFlipped || prev.cards[cardIndex].isMatched) return prev; // already processed

      const newCards = [...prev.cards];
      newCards[cardIndex] = { ...newCards[cardIndex], isFlipped: true };
      
      const newFlipped = [...prev.flippedIndices, cardIndex];
      let newScores: [number, number] = [...prev.scores] as [number, number];
      let newPlayer = prev.currentPlayerIndex;

      if (newFlipped.length === 2) {
        const [idx1, idx2] = newFlipped;
        if (newCards[idx1].imageId === newCards[idx2].imageId) {
          // match!
          newCards[idx1].isMatched = true;
          newCards[idx2].isMatched = true;
          newScores[prev.currentPlayerIndex]++;
          // Keep current player turn, reset flipped array
          setTimeout(() => {
            setGameState((curr) => curr ? { ...curr, flippedIndices: [] } : null);
          }, 1000);
        } else {
          // mismatch
          newPlayer = prev.currentPlayerIndex === 0 ? 1 : 0;
          setTimeout(() => {
            setGameState((curr) => {
              if (!curr) return null;
              const resetCards = [...curr.cards];
              resetCards[idx1] = { ...resetCards[idx1], isFlipped: false };
              resetCards[idx2] = { ...resetCards[idx2], isFlipped: false };
              return { ...curr, cards: resetCards, flippedIndices: [], currentPlayerIndex: newPlayer };
            });
          }, 1000);
        }
      }

      return {
        ...prev,
        cards: newCards,
        scores: newScores,
        flippedIndices: newFlipped,
        currentPlayerIndex: newFlipped.length === 2 ? prev.currentPlayerIndex : prev.currentPlayerIndex 
        // Note: we swap player in the setTimeout for mismatch
      };
    });
  }, []);

  return { localGameState: gameState, initLocalGame, handleLocalFlip };
};
