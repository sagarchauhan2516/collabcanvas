import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { CanvasElement, User, Guide } from '../types';

export function useSocket(
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setGuides: React.Dispatch<React.SetStateAction<Guide[]>>,
  addToHistory: (elements: CanvasElement[]) => void,
  setHistoryStep: React.Dispatch<React.SetStateAction<number>>,
  setHistory: React.Dispatch<React.SetStateAction<CanvasElement[][]>>
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const newSocket = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    newSocket.on('init', ({ elements }: { elements: CanvasElement[] }) => {
      const initialElements = elements || [];
      setElements(initialElements);
      setHistory([JSON.parse(JSON.stringify(initialElements))]);
      setHistoryStep(0);
    });

    newSocket.on('users:update', (updatedUsers: User[]) => {
      setUsers(updatedUsers || []);
    });

    newSocket.on('element:added', (element: CanvasElement) => {
      setElements((prev) => {
        const next = [...prev, element];
        addToHistory(next);
        return next;
      });
    });

    newSocket.on('element:updated', (updatedElement: CanvasElement) => {
      setElements((prev) => prev.map((el) => el.id === updatedElement.id ? updatedElement : el));
    });

    newSocket.on('element:deleted', (elementId: string) => {
      setElements((prev) => {
        const next = prev.filter((el) => el.id !== elementId);
        addToHistory(next);
        return next;
      });
    });

    newSocket.on('cursor:moved', ({ userId, cursor }: { userId: string, cursor: { x: number, y: number } }) => {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, cursor } : u));
    });

    newSocket.on('canvas:cleared', () => {
      setElements([]);
      addToHistory([]);
    });

    newSocket.on('guide:add', (guide: Guide) => {
      setGuides((prev) => [...prev, guide]);
    });

    newSocket.on('guide:remove', (id: string) => {
      setGuides((prev) => prev.filter((g) => g.id !== id));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [setElements, setUsers, setGuides, addToHistory, setHistory, setHistoryStep]);

  const join = useCallback((user: User) => {
    setCurrentUser(user);
    setIsJoined(true);
    socket?.emit('join', user);
  }, [socket]);

  return { socket, isJoined, currentUser, join, setIsJoined };
}
