import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

export const useWebRTC = (socket: Socket | null) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCamEnabled, setIsCamEnabled] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    if (isCamEnabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsCamEnabled(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // If we are already connected to a room with players, we might need to renegotiate or emitting a ready signal
      // For simplicity, we just trigger the track logic via useEffect below.
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  };

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (!socket || !localStream) return;

    const createPeerConnection = (target: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add local tracks
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // Listen for remote tracks
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            target,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      return pc;
    };

    socket.on('room_ready', async (players: string[]) => {
      const isInitiator = players[players.length - 1] === socket.id;
      if (isInitiator) {
        const target = players.find((p) => p !== socket.id);
        if (!target) return;

        const pc = createPeerConnection(target);
        pcRef.current = pc;

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_signal', { target, signal: { type: 'offer', offer } });
      }
    });

    socket.on('webrtc_signal', async (data: { sender: string; signal: any }) => {
      const { sender, signal } = data;
      
      let pc = pcRef.current;
      
      if (!pc) {
        pc = createPeerConnection(sender);
        pcRef.current = pc;
      }

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_signal', { target: sender, signal: { type: 'answer', answer } });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === 'candidate') {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    return () => {
      socket.off('room_ready');
      socket.off('webrtc_signal');
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [socket, localStream]);

  return { localVideoRef, remoteVideoRef, localStream, remoteStream, isCamEnabled, startCamera };
};
