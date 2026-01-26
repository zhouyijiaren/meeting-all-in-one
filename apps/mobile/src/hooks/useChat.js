import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';

export function useChat() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Load existing messages when joining room
    socketService.on('room-messages', (existingMessages) => {
      setMessages(existingMessages);
    });

    // Handle new messages
    socketService.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socketService.off('room-messages');
      socketService.off('new-message');
    };
  }, []);

  const sendMessage = useCallback((content) => {
    if (content.trim()) {
      socketService.sendMessage(content);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
  };
}
