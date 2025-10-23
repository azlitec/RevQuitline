'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '' }: { 
  icon: string; 
  emoji: string; 
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <span 
        className="material-icons"
        style={{ 
          fontSize: '24px',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: '1',
          letterSpacing: 'normal',
          textTransform: 'none',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
          direction: 'ltr',
          WebkitFontFeatureSettings: '"liga"',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {icon}
      </span>
      <span 
        className="emoji-fallback"
        style={{ 
          fontSize: '20px',
          display: 'none'
        }}
      >
        {emoji}
      </span>
    </span>
  );
};

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'doctor';
  timestamp: string;
  read: boolean;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface Conversation {
  id: string;
  patient: Patient;
  lastMessage?: Message;
  unreadCount: number;
  messages: Message[];
}

export default function ProviderInboxPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user?.isProvider) {
      fetchConversations();
    }
  }, [session]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/provider/messages');

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.log('Provider messaging API not yet implemented');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string) => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/provider/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        await fetchConversations();
        setNewMessage('');
      } else {
        console.error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const markAsRead = (conversationId: string) => {
    setConversations(convs => 
      convs.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
    );
  };

  const currentConversation = conversations.find(c => c.id === selectedConversation);
  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Compact Header */}
      <div className={`bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex-shrink-0 ${selectedConversation ? 'hidden md:block' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center space-x-2">
              <IconWithFallback icon="chat" emoji="💬" className="text-blue-600" />
              <span>Patient Messages</span>
            </h2>
            <p className="text-xs text-gray-500 ml-8">
              {conversations.length} active {totalUnreadCount > 0 && `• ${totalUnreadCount} unread`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Conversations List */}
        <div className={`
          w-full md:w-80 lg:w-96 
          bg-white border-r border-gray-200 
          flex flex-col
          ${selectedConversation ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <IconWithFallback 
                icon="search" 
                emoji="🔍" 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
              />
            </div>
          </div>
          
          {/* Conversations List - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversations.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation.id);
                      markAsRead(conversation.id);
                    }}
                    className={`
                      p-3 cursor-pointer transition-all duration-200
                      hover:bg-blue-50
                      ${selectedConversation === conversation.id 
                        ? 'bg-blue-100 border-l-4 border-blue-600' 
                        : conversation.unreadCount > 0 
                          ? 'bg-blue-25' 
                          : 'bg-white'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                          {conversation.patient.firstName?.charAt(0)}{conversation.patient.lastName?.charAt(0)}
                        </div>
                        {conversation.patient.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className={`text-sm truncate ${
                            conversation.unreadCount > 0 
                              ? 'font-bold text-gray-900' 
                              : 'font-medium text-gray-800'
                          }`}>
                            {conversation.patient.firstName} {conversation.patient.lastName}
                          </h4>
                          {conversation.unreadCount > 0 && (
                            <span className="flex-shrink-0 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-2 font-semibold">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <>
                            <p className={`text-xs truncate ${
                              conversation.unreadCount > 0 
                                ? 'font-medium text-gray-700' 
                                : 'text-gray-500'
                            }`}>
                              {conversation.lastMessage.senderType === 'patient' ? '' : 'You: '}
                              {conversation.lastMessage.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <IconWithFallback icon="chat_bubble_outline" emoji="💭" className="text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">No messages yet</h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Patient messages will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`
          flex-1 flex flex-col bg-white min-h-0
          ${!selectedConversation ? 'hidden md:flex' : 'flex'}
        `}>
          {selectedConversation && currentConversation ? (
            <>
              {/* Minimal Chat Header - Removed 3 icons */}
              <div className="px-4 md:px-6 py-2.5 border-b border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <IconWithFallback icon="arrow_back" emoji="←" className="text-gray-600" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {currentConversation.patient.firstName?.charAt(0)}{currentConversation.patient.lastName?.charAt(0)}
                    </div>
                    {currentConversation.patient.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {currentConversation.patient.firstName} {currentConversation.patient.lastName}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center space-x-1">
                      {currentConversation.patient.isOnline ? (
                        <>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <span>Online</span>
                        </>
                      ) : (
                        <span>Offline</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area - Optimized height */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white min-h-0"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {currentConversation.messages.length > 0 ? (
                  currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`
                        max-w-[75%] md:max-w-md px-3 py-2 rounded-2xl shadow-sm
                        ${message.senderType === 'doctor'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                        }
                      `}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderType === 'doctor' ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <IconWithFallback icon="chat_bubble_outline" emoji="💭" className="text-3xl mb-2" />
                      <p className="text-sm">Start the conversation</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Fixed Message Input - Always visible */}
              <div className="px-4 md:px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title="Attach file"
                  >
                    <IconWithFallback icon="attach_file" emoji="📎" className="text-gray-600" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage(selectedConversation);
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => sendMessage(selectedConversation)}
                    disabled={!newMessage.trim()}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md"
                    title="Send message"
                  >
                    <IconWithFallback icon="send" emoji="➤" className="text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <IconWithFallback icon="chat" emoji="💬" className="text-blue-600 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Choose a patient to view and reply to messages
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-800 flex items-start space-x-2">
                    <IconWithFallback icon="info" emoji="ℹ️" className="text-blue-600 flex-shrink-0 text-sm" />
                    <span>
                      Patients initiate conversations. Reply here to provide care support.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
