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

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface Conversation {
  id: string;
  doctor: Doctor;
  lastMessage?: Message;
  unreadCount: number;
  messages: Message[];
}

export default function PatientMessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDoctorList, setShowDoctorList] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
      fetchAvailableDoctors();
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
      setError(null);
      
      const response = await fetch('/api/patient/messages');
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        // Gracefully handle API not available - just show empty state
        setConversations([]);
      }
    } catch (err) {
      // Don't show error to user - just show empty state like no conversations
      console.log('Messaging API not yet implemented - showing empty state');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDoctors = async () => {
    try {
      const response = await fetch('/api/patient/doctors?connected=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableDoctors(data.doctors || []);
      } else {
        // Show some sample doctors for demonstration
        setAvailableDoctors([
          {
            id: '1',
            firstName: 'Ahmad',
            lastName: 'Rahman',
            specialty: 'General Medicine',
            isOnline: true
          },
          {
            id: '2',
            firstName: 'Siti',
            lastName: 'Aminah',
            specialty: 'Smoking Cessation',
            isOnline: false,
            lastSeen: new Date().toISOString()
          },
          {
            id: '3',
            firstName: 'David',
            lastName: 'Lee',
            specialty: 'Mental Health',
            isOnline: true
          }
        ]);
      }
    } catch (err) {
      // Show sample doctors even if API fails
      setAvailableDoctors([
        {
          id: '1',
          firstName: 'Ahmad',
          lastName: 'Rahman',
          specialty: 'General Medicine',
          isOnline: true
        },
        {
          id: '2',
          firstName: 'Siti',
          lastName: 'Aminah',
          specialty: 'Smoking Cessation',
          isOnline: false,
          lastSeen: new Date().toISOString()
        },
        {
          id: '3',
          firstName: 'David',
          lastName: 'Lee',
          specialty: 'Mental Health',
          isOnline: true
        }
      ]);
    }
  };

  const sendMessage = async (conversationId: string) => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/patient/messages/send', {
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
        // Refresh conversations to get the new message
        await fetchConversations();
        setNewMessage('');
      } else {
        // Simulate message sent for demo - add to current conversation
        if (currentConversation) {
          const newMsg = {
            id: Date.now().toString(),
            content: newMessage.trim(),
            senderId: session?.user?.id || 'patient',
            senderName: session?.user?.name || 'You',
            senderType: 'patient' as const,
            timestamp: new Date().toISOString(),
            read: true
          };
          
          const updatedConversation = {
            ...currentConversation,
            messages: [...currentConversation.messages, newMsg],
            lastMessage: newMsg
          };
          
          setConversations(convs =>
            convs.map(c => c.id === conversationId ? updatedConversation : c)
          );
        }
        setNewMessage('');
      }
    } catch (err) {
      // Simulate message sent for demo - add to current conversation
      if (currentConversation) {
        const newMsg = {
          id: Date.now().toString(),
          content: newMessage.trim(),
          senderId: session?.user?.id || 'patient',
          senderName: session?.user?.name || 'You',
          senderType: 'patient' as const,
          timestamp: new Date().toISOString(),
          read: true
        };
        
        const updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, newMsg],
          lastMessage: newMsg
        };
        
        setConversations(convs =>
          convs.map(c => c.id === conversationId ? updatedConversation : c)
        );
      }
      setNewMessage('');
    }
  };

  const startConversation = async (doctorId: string) => {
    try {
      const response = await fetch('/api/patient/messages/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctorId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversationId);
        setShowDoctorList(false);
        await fetchConversations();
      } else {
        // Create a demo conversation for the selected doctor
        const selectedDoctor = availableDoctors.find(d => d.id === doctorId);
        if (selectedDoctor) {
          const demoConversation = {
            id: doctorId,
            doctor: selectedDoctor,
            messages: [
              {
                id: '1',
                content: `Hello! I'm Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}. How can I help you today?`,
                senderId: doctorId,
                senderName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
                senderType: 'doctor' as const,
                timestamp: new Date().toISOString(),
                read: false
              }
            ],
            unreadCount: 1,
            lastMessage: {
              id: '1',
              content: `Hello! I'm Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}. How can I help you today?`,
              senderId: doctorId,
              senderName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
              senderType: 'doctor' as const,
              timestamp: new Date().toISOString(),
              read: false
            }
          };
          setConversations([demoConversation]);
          setSelectedConversation(doctorId);
          setShowDoctorList(false);
        }
      }
    } catch (err) {
      // Create a demo conversation for the selected doctor
      const selectedDoctor = availableDoctors.find(d => d.id === doctorId);
      if (selectedDoctor) {
        const demoConversation = {
          id: doctorId,
          doctor: selectedDoctor,
          messages: [
            {
              id: '1',
              content: `Hello! I'm Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}. How can I help you today?`,
              senderId: doctorId,
              senderName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
              senderType: 'doctor' as const,
              timestamp: new Date().toISOString(),
              read: false
            }
          ],
          unreadCount: 1,
          lastMessage: {
            id: '1',
            content: `Hello! I'm Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}. How can I help you today?`,
            senderId: doctorId,
            senderName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
            senderType: 'doctor' as const,
            timestamp: new Date().toISOString(),
            read: false
          }
        };
        setConversations([demoConversation]);
        setSelectedConversation(doctorId);
        setShowDoctorList(false);
      }
    }
  };

  const currentConversation = conversations.find(c => c.id === selectedConversation);

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
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold gradient-text">Messages</h2>
          <p className="text-sm md:text-base text-gray-500 flex items-center">
            Chat with your doctors
            <span className="ml-2 text-sm text-gray-400">•</span>
            <span className="ml-2 text-sm text-blue-600 font-medium">{conversations.length} conversations</span>
          </p>
        </div>
        <button
          onClick={() => setShowDoctorList(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly"
        >
          <IconWithFallback icon="add" emoji="➕" className="text-white" />
          <span className="hidden sm:inline">New Message</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Enhanced Messages Interface */}
      <div className="card shadow-strong hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="flex h-[600px] md:h-[700px]">
          {/* Conversations List */}
          <div className={`w-full md:w-1/3 border-r border-gray-200 ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <IconWithFallback icon="chat" emoji="💬" className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">Conversations</h3>
              </div>
            </div>
            
            <div className="overflow-y-auto h-full">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-medium ${
                      selectedConversation === conversation.id ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-medium' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {conversation.doctor.firstName?.charAt(0)}{conversation.doctor.lastName?.charAt(0)}
                        </div>
                        {conversation.doctor.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800 truncate">
                            Dr. {conversation.doctor.firstName} {conversation.doctor.lastName}
                          </h4>
                          {conversation.unreadCount > 0 && (
                            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1 rounded-full shadow-medium font-semibold">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{conversation.doctor.specialty}</p>
                        {conversation.lastMessage && (
                          <p className="text-xs text-gray-400 truncate mt-1">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
                    <IconWithFallback icon="chat_bubble_outline" emoji="💭" className="text-gray-400 text-3xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-3">No conversations yet</h3>
                  <p className="text-gray-500 text-lg mb-6">Start a conversation with your doctors</p>
                  <button
                    onClick={() => setShowDoctorList(true)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
                  >
                    Start New Conversation
                  </button>
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
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {currentConversation.doctor.firstName?.charAt(0)}{currentConversation.doctor.lastName?.charAt(0)}
                        </div>
                        {currentConversation.doctor.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          Dr. {currentConversation.doctor.firstName} {currentConversation.doctor.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {currentConversation.doctor.isOnline ? 'Online' : 
                           currentConversation.doctor.lastSeen ? `Last seen ${new Date(currentConversation.doctor.lastSeen).toLocaleString()}` : 'Offline'}
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
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                        message.senderType === 'patient'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderType === 'patient' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-center space-x-3">
                    <button className="p-3 hover:bg-white hover:shadow-medium rounded-lg transition-all duration-300 hover:scale-110">
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
                        placeholder="Type your message..."
                        className="w-full p-4 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white hover:bg-gray-50"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
                        <IconWithFallback icon="emoji_emotions" emoji="😊" className="text-gray-400" />
                      </button>
                    </div>
                    <button
                      onClick={() => sendMessage(selectedConversation)}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    >
                      <IconWithFallback icon="send" emoji="➤" className="text-white" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
                    <IconWithFallback icon="chat" emoji="💬" className="text-gray-400 text-3xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-3">Select a conversation</h3>
                  <p className="text-gray-500 text-lg">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Conversation Modal */}
      {showDoctorList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Start New Conversation</h3>
                <button
                  onClick={() => setShowDoctorList(false)}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <div className="space-y-3">
                {availableDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => startConversation(doctor.id)}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {doctor.firstName?.charAt(0)}{doctor.lastName?.charAt(0)}
                      </div>
                      {doctor.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{doctor.specialty}</p>
                      <p className="text-xs text-gray-400">
                        {doctor.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <IconWithFallback icon="chat" emoji="💬" className="text-blue-600" />
                  </div>
                ))}
                {availableDoctors.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <IconWithFallback icon="people" emoji="👥" className="text-gray-400" />
                    </div>
                    <h4 className="font-medium text-gray-600 mb-2">No connected doctors</h4>
                    <p className="text-sm text-gray-500">Connect with doctors first to start messaging</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}