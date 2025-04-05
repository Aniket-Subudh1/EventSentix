import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Meh, Frown, User } from 'react-feather';
import { useParams } from 'react-router-dom';
import socketService from '../services/socketService';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { v4 as uuidv4 } from 'uuid';

const SentimentIcon = ({ sentiment }) => {
  switch (sentiment) {
    case 'positive': return <Smile className="text-green-500" size={16} />;
    case 'negative': return <Frown className="text-red-500" size={16} />;
    default: return <Meh className="text-gray-500" size={16} />;
  }
};

const ChatMessage = ({ message, isUser }) => (
  <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[70%] p-3 rounded-lg ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
      <div className="flex items-center space-x-2 mb-1">
        {!isUser && (
          <>
            <User size={16} />
            <span className="text-xs font-medium">{message.user}</span>
          </>
        )}
        {message.sentiment && (
          <>
            <SentimentIcon sentiment={message.sentiment} />
            <span className="text-xs capitalize">{message.sentiment}</span>
          </>
        )}
      </div>
      <p className="text-sm">{message.text}</p>
      <div className="text-xs mt-1 opacity-75 text-right">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const Chat = () => {
  const { eventId } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const name = prompt('Enter your name:') || 'Anonymous';
        setUsername(name);
        await socketService.connect();
        socketService.joinEvent(eventId);

        socketService.on('new-message', handleNewMessage);
        setIsConnected(true);
        setLoading(false);
      } catch (error) {
        console.error('Chat init failed:', error);
        setLoading(false);
      }
    };
    initializeChat();

    return () => {
      socketService.off('new-message');
      socketService.leaveEvent(eventId);
    };
  }, [eventId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewMessage = (message) => {
    // Avoid duplicates based on sourceId
    setMessages((prev) => {
      const exists = prev.some((m) => m.sourceId === message.sourceId);
      return exists ? prev : [...prev, message];
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMsg = {
      event: eventId,
      text: inputMessage.trim(),
      user: username,
      createdAt: new Date(),
      source: 'direct',
      sourceId: `${Date.now()}-${uuidv4().slice(0, 8)}`,
      userId: socketService.getUserId()
    };

    // Show message locally instantly
    handleNewMessage(newMsg);

    try {
      await socketService.submitFeedback(newMsg);
    } catch (error) {
      console.error('Send failed:', error);
      alert('Could not send message. Try again.');
    }

    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader size="lg" />
    </div>
  );

  if (!isConnected) return (
    <div className="flex h-screen items-center justify-center p-6 bg-red-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Connect</h2>
        <p className="text-red-600 mb-4">Please try again later.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white shadow-md p-4">
        <h2 className="text-xl font-bold text-gray-800">Event Chat</h2>
        <p className="text-sm text-gray-500">You are: {username}</p>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No messages yet. Start chatting!</div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage key={msg.sourceId || index} message={msg} isUser={msg.user === username} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-4 border-t">
        <div className="flex items-center space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-grow resize-none rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
          />
          <Button
            variant="primary"
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            icon={<Send size={16} />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
