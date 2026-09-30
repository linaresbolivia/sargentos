import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '@config/api';

export const GlobalPresenceTracker: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    const username = (
      (user as any)?.username ||
      user?.email?.split('@')[0] ||
      'usuario'
    ).toLowerCase();

    // 1. Unirse a la presencia global inmediatamente
    socket.emit('user:presence:join', {
      userId: user.id,
      username,
      email: user.email,
    });

    // 2. Control de visibilidad de pestaña y ausencia/actividad
    const handleVisibilityChange = () => {
      if (document.hidden) {
        socket.emit('user:presence:heartbeat', {
          userId: user.id,
          username,
          email: user.email,
          status: 'AWAY',
        });
      } else {
        socket.emit('user:presence:heartbeat', {
          userId: user.id,
          username,
          email: user.email,
          status: 'ONLINE',
        });
      }
    };

    let idleTimer: NodeJS.Timeout;
    const handleUserActivity = () => {
      socket.emit('user:presence:heartbeat', {
        userId: user.id,
        username,
        email: user.email,
        status: 'ONLINE',
      });
      clearTimeout(idleTimer);
      // Tras 4 minutos de inactividad total, pasar a AWAY
      idleTimer = setTimeout(() => {
        socket.emit('user:presence:heartbeat', {
          userId: user.id,
          username,
          email: user.email,
          status: 'AWAY',
        });
      }, 4 * 60 * 1000);
    };

    // Heartbeat periódico cada 30 segundos
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        socket.emit('user:presence:heartbeat', {
          userId: user.id,
          username,
          email: user.email,
          status: 'ONLINE',
        });
      }
    }, 30 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('focus', handleUserActivity);

    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(idleTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('focus', handleUserActivity);
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id, user?.email]);

  return null;
};

export default GlobalPresenceTracker;
