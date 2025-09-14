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
        // Show demo conversations for display purposes
        setConversations([
          {
            id: '1',
            patient: {
              id: 'patient1',
              firstName: 'Ahmad',
              lastName: 'Ibrahim',
              email: 'ahmad.ibrahim@email.com',
              phone: '+60123456789',
              isOnline: true
            },
            messages: [
              {
                id: '1',
                content: 'Hello Dr., I have some questions about my smoking cessation program.',
                senderId: 'patient1',
                senderName: 'Ahmad Ibrahim',
                senderType: 'patient',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                read: false
              }
            ],
            unreadCount: 1,
            lastMessage: {
              id: '1',
              content: 'Hello Dr., I have some questions about my smoking cessation program.',
              senderId: 'patient1',
              senderName: 'Ahmad Ibrahim',
              senderType: 'patient',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              read: false
            }
          },
          {
            id: '2',
            patient: {
              id: 'patient2',
              firstName: 'Siti',
              lastName: 'Nurhaliza',
              email: 'siti.nurhaliza@email.com',
              phone: '+60198765432',
              isOnline: false,
              lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
            },
            messages: [
              {
                id: '2',
                content: 'Thank you for the medication advice. I feel much better now.',
                senderId: 'patient2',
                senderName: 'Siti Nurhaliza',
                senderType: 'patient',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
                read: true
              },
              {
                id: '3',
                content: 'You\'re welcome! Continue taking the medication as prescribed and let me know if you have any side effects.',
                senderId: session?.user?.id || 'doctor1',
                senderName: session?.user?.name || 'Doctor',
                senderType: 'doctor',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
                read: true
              }
            ],
            unreadCount: 0,
            lastMessage: {
              id: '3',
              content: 'You\'re welcome! Continue taking the medication as prescribed and let me know if you have any side effects.',
              senderId: session?.user?.id || 'doctor1',
              senderName: session?.user?.name || 'Doctor',
              senderType: 'doctor',
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              read: true
            }
          }
        ]);
      }
    } catch (err) {
      // Show demo conversations even if API fails
      console.log('Provider messaging API not yet implemented - showing demo conversations');
      setConversations([
        {
          id: '1',
          patient: {
            id: 'patient1',
            firstName: 'Ahmad',
            lastName: 'Ibrahim',
            email: 'ahmad.ibrahim@email.com',
            phone: '+60123456789',
            isOnline: true
          },
          messages: [
            {
              id: '1',
              content: 'Hello Dr., I have some questions about my smoking cessation program.',
              senderId: 'patient1',
              senderName: 'Ahmad Ibrahim',
              senderType: 'patient',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              read: false
            }
          ],
          unreadCount: 1,
          lastMessage: {
            id: '1',
            content: 'Hello Dr., I have some questions about my smoking cessation program.',
            senderId: 'patient1',
            senderName: 'Ahmad Ibrahim',
            senderType: 'patient',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            read: false
          }
        }
      ]);
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
        // Simulate message sent for demo - add to current conversation
        const currentConversation = conversations.find(c => c.id === conversationId);
        if (currentConversation) {
          const newMsg = {
            id: Date.now().toString(),
            content: newMessage.trim(),
            senderId: session?.user?.id || 'doctor',
            senderName: session?.user?.name || 'Doctor',
            senderType: 'doctor' as const,
            timestamp: new Date().toISOString(),
            read: true
          };
          
          const updatedConversation = {
            ...currentConversation,
            messages: [...currentConversation.messages, newMsg],
            lastMessage: newMsg,
            unreadCount: 0
          };
          
          setConversations(convs => 
            convs.map(c => c.id === conversationId ? updatedConversation : c)
          );
        }
        setNewMessage('');
      }
    } catch (err) {
      // Simulate message sent for demo
      const currentConversation = conversations.find(c => c.id === conversationId);
      if (currentConversation) {
        const newMsg = {
          id: Date.now().toString(),
          content: newMessage.trim(),
          senderId: session?.user?.id || 'doctor',
          senderName: session?.user?.name || 'Doctor',
          senderType: 'doctor' as const,
          timestamp: new Date().toISOString(),
          read: true
        };
        
        const updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, newMsg],
          lastMessage: newMsg,
          unreadCount: 0
        };
        
        setConversations(convs => 
          convs.map(c => c.id === conversationId ? updatedConversation : c)
        );
      }
      setNewMessage('');
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
      <div className="flex items-center justify-center min-h-96">
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
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Patient Messages</h2>
          <p className="text-sm md:text-base text-gray-500">
            Reply to patient messages {totalUnreadCount > 0 && `(${totalUnreadCount} unread)`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 px-3 py-1 rounded-full">
            <span className="text-blue-600 text-sm font-medium">
              {conversations.length} Active Conversations
            </span>
          </div>
        </div>
      </div>

      {/* Messages Interface */}
      <div className="card shadow-soft overflow-hidden">
        <div className="flex h-[600px] md:h-[700px]">
          {/* Conversations List */}
          <div className={`w-full md:w-1/3 border-r border-gray-200 ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <IconWithFallback icon="chat" emoji="💬" className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">Patient Conversations</h3>
                {totalUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
            </div>
            
            <div className="overflow-y-auto h-full">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation.id);
                      markAsRead(conversation.id);
                    }}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                    } ${conversation.unreadCount > 0 ? 'bg-blue-25' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {conversation.patient.firstName?.charAt(0)}{conversation.patient.lastName?.charAt(0)}
                        </div>
                        {conversation.patient.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`truncate ${conversation.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {conversation.patient.firstName} {conversation.patient.lastName}
                          </h4>
                          {conversation.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{conversation.patient.phone}</p>
                        {conversation.lastMessage && (
                          <p className={`text-xs mt-1 truncate ${conversation.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                            {conversation.lastMessage.senderType === 'patient' ? '' : 'You: '}
                            {conversation.lastMessage.content}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {conversation.lastMessage ? new Date(conversation.lastMessage.timestamp).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconWithFallback icon="chat_bubble_outline" emoji="💭" className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No patient messages</h3>
                  <p className="text-gray-500">Patient messages will appear here when they contact you</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
            {selectedConversation && currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <IconWithFallback icon="arrow_back" emoji="←" className="text-gray-600" />
                      </button>
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {currentConversation.patient.firstName?.charAt(0)}{currentConversation.patient.lastName?.charAt(0)}
                        </div>
                        {currentConversation.patient.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {currentConversation.patient.firstName} {currentConversation.patient.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {currentConversation.patient.isOnline ? 'Online' : 
                           currentConversation.patient.lastSeen ? `Last seen ${new Date(currentConversation.patient.lastSeen).toLocaleString()}` : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <IconWithFallback icon="videocam" emoji="📹" className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <IconWithFallback icon="phone" emoji="📞" className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <IconWithFallback icon="person" emoji="👤" className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                        message.senderType === 'doctor'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderType === 'doctor' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <IconWithFallback icon="attach_file" emoji="📎" className="text-gray-600" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendMessage(selectedConversation);
                          }
                        }}
                        placeholder="Type your reply..."
                        className="w-full p-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors">
                        <IconWithFallback icon="emoji_emotions" emoji="😊" className="text-gray-400" />
                      </button>
                    </div>
                    <button
                      onClick={() => sendMessage(selectedConversation)}
                      disabled={!newMessage.trim()}
                      className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <IconWithFallback icon="send" emoji="➤" className="text-white" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconWithFallback icon="chat" emoji="💬" className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Select a conversation</h3>
                  <p className="text-gray-500">Choose a patient conversation to reply</p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Only patients can start new conversations. You can reply to their messages here.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}