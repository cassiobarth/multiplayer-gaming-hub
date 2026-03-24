import { Server, Socket } from 'socket.io';

interface CardType {
  id: number;
  imageId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface RoomData {
  players: string[];
  gameState: {
    cards: CardType[];
    currentPlayerIndex: number; // 0 or 1
    scores: [number, number];
    flippedIndices: number[];
  };
}

const activeRooms: Record<string, RoomData> = {};

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Room Management
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);

      if (!activeRooms[roomId]) {
        activeRooms[roomId] = { 
          players: [], 
          gameState: {
            cards: [],
            currentPlayerIndex: 0,
            scores: [0, 0],
            flippedIndices: []
          } 
        };
      }

      const room = activeRooms[roomId];
      if (room.players.length < 2 && !room.players.includes(socket.id)) {
        room.players.push(socket.id);
      }

      // Notify others in room
      socket.to(roomId).emit('player_joined', socket.id);

      // If room is full, start the signaling process
      if (room.players.length === 2) {
        io.to(roomId).emit('room_ready', room.players);
        // Also emit initial game state
        io.to(roomId).emit('memory_state_update', room.gameState);
      }
    });

    // WebRTC Signaling
    socket.on('webrtc_signal', ({ target, signal }: { target: string, signal: any }) => {
      io.to(target).emit('webrtc_signal', {
        sender: socket.id,
        signal
      });
    });

    // ---- MEMORY GAME ACTIONS ---- //
    
    // 1. Initialize custom pack
    socket.on('memory_init', ({ roomId, images }: { roomId: string, images: string[] }) => {
      const room = activeRooms[roomId];
      if (!room) return;
      
      // Create pairs
      const rawCards = [...images, ...images].map((imgUrl, i) => ({
        id: i,
        imageId: imgUrl,
        isFlipped: false,
        isMatched: false
      }));

      // Shuffle deterministically in server
      const shuffled = rawCards.sort(() => 0.5 - Math.random());
      
      room.gameState = {
        cards: shuffled,
        currentPlayerIndex: 0,
        scores: [0, 0],
        flippedIndices: []
      };

      io.to(roomId).emit('memory_state_update', room.gameState);
    });

    // 2. Flip Card Action
    socket.on('memory_flip', ({ roomId, cardIndex }: { roomId: string, cardIndex: number }) => {
      const room = activeRooms[roomId];
      if (!room) return;

      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== room.gameState.currentPlayerIndex) {
        // Not this player's turn (cheat attempt or lag)
        return;
      }

      const state = room.gameState;
      // Prevent flipping already flipped or matched cards
      if (state.cards[cardIndex].isFlipped || state.cards[cardIndex].isMatched) return;
      // Prevent flipping more than 2 at a time
      if (state.flippedIndices.length >= 2) return;

      state.cards[cardIndex].isFlipped = true;
      state.flippedIndices.push(cardIndex);

      // Broadcast update instantly for the flip animation
      io.to(roomId).emit('memory_state_update', state);

      // Evaluate match if 2 cards flipped
      if (state.flippedIndices.length === 2) {
        const [idx1, idx2] = state.flippedIndices;
        const card1 = state.cards[idx1];
        const card2 = state.cards[idx2];

        setTimeout(() => {
          if (card1.imageId === card2.imageId) {
            // Match found!
            card1.isMatched = true;
            card2.isMatched = true;
            state.scores[state.currentPlayerIndex] += 1;
          } else {
            // No match, turn them back
            card1.isFlipped = false;
            card2.isFlipped = false;
            // Switch turn
            state.currentPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
          }
          
          state.flippedIndices = [];
          io.to(roomId).emit('memory_state_update', state);
        }, 1500); // 1.5 second delay before reverting or confirming
      }
    });

    socket.on('disconnect', () => {
      for (const roomId in activeRooms) {
        const room = activeRooms[roomId];
        const index = room.players.indexOf(socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          socket.to(roomId).emit('player_left', socket.id);
          
          if (room.players.length === 0) {
            delete activeRooms[roomId];
          }
        }
      }
    });
  });
}
