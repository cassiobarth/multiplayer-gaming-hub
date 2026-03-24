import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { BACKEND_URL } from '../config';

const SOCKET_SERVER_URL = BACKEND_URL;

export const useSocket = (roomId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);

  useEffect(() => {
    const socketInstance = io(SOCKET_SERVER_URL, {
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('join_room', roomId);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('room_ready', (joinedPlayers: string[]) => {
      setPlayers(joinedPlayers);
    });

    socketInstance.on('player_joined', (playerId: string) => {
      setPlayers((prev) => [...prev, playerId]);
    });

    socketInstance.on('player_left', (playerId: string) => {
      setPlayers((prev) => prev.filter((id) => id !== playerId));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [roomId]);

  return { socket, isConnected, players };
};
