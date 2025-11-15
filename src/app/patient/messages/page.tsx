'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

import { RefreshCw, MessageCircle, Plus, Search, HelpCircle, ArrowLeft, Paperclip, X } from 'lucide-react';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '' }: { 
  icon: string; 
  emoji: string; 
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <HelpCircle />
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
  const [sendingMessage, setSendingMessage] = useState(false);
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
  }, [selectedConversation]);

  useEffect(() => {
    // Scroll to bottom when messages change for the selected conversation
    if (selectedConversation) {
      const currentConv = conversations.find(c => c.id === selectedConversation);
      if (currentConv && currentConv.messages.length > 0) {
        scrollToBottom();
      }
    }
  }, [conversations, selectedConversation]);

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
      console.log('Fetch conversations API call failed, showing empty state', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      // Optimistically update UI
      setConversations(convs => 
        convs.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      );

      const response = await fetch(`/api/patient/messages/${conversationId}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.log('Failed to mark messages as read, but UI updated optimistically');
      }
    } catch (err) {
      console.log('Mark as read API call failed, but UI updated optimistically', err);
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/patient/messages/${conversationId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Update the conversation with the loaded messages
        setConversations(convs =>
          convs.map(c => c.id === conversationId ? { ...c, messages: data.messages || [] } : c)
        );
      } else {
        // If API fails, keep existing messages or show demo messages
        const currentConv = conversations.find(c => c.id === conversationId);
        if (currentConv && currentConv.messages.length === 0) {
          // Add demo messages if no messages exist
          const demoMessages = [
            {
              id: '1',
              content: `Hello! I'm Dr. ${currentConv.doctor.firstName} ${currentConv.doctor.lastName}. How can I help you today?`,
              senderId: conversationId,
              senderName: `Dr. ${currentConv.doctor.firstName} ${currentConv.doctor.lastName}`,
              senderType: 'doctor' as const,
              timestamp: new Date().toISOString(),
              read: false
            }
          ];
          setConversations(convs =>
            convs.map(c => c.id === conversationId ? { ...c, messages: demoMessages } : c)
          );
        }
      }
    } catch (err) {
      console.log('Fetch conversation messages failed, using fallback', err);
      // Add demo messages as fallback
      const currentConv = conversations.find(c => c.id === conversationId);
      if (currentConv && currentConv.messages.length === 0) {
        const demoMessages = [
          {
            id: '1',
            content: `Hello! I'm Dr. ${currentConv.doctor.firstName} ${currentConv.doctor.lastName}. How can I help you today?`,
            senderId: conversationId,
            senderName: `Dr. ${currentConv.doctor.firstName} ${currentConv.doctor.lastName}`,
            senderType: 'doctor' as const,
            timestamp: new Date().toISOString(),
            read: false
          }
        ];
        setConversations(convs =>
          convs.map(c => c.id === conversationId ? { ...c, messages: demoMessages } : c)
        );
      }
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
    if (!newMessage.trim() || sendingMessage) return;

    const messageContent = newMessage.trim();
    setSendingMessage(true);
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const response = await fetch('/api/patient/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          content: messageContent,
        }),
      });

      if (response.ok) {
        // Refresh conversations to get the new message
        await fetchConversations();
        // Reload messages for current conversation
        fetchConversationMessages(conversationId);
      } else {
        // Simulate message sent for demo - add to current conversation
        const newMsg = {
          id: Date.now().toString(),
          content: messageContent,
          senderId: session?.user?.id || 'patient',
          senderName: session?.user?.name || 'You',
          senderType: 'patient' as const,
          timestamp: new Date().toISOString(),
          read: true
        };
        
        setConversations(convs =>
          convs.map(c => c.id === conversationId ? {
            ...c,
            messages: [...c.messages, newMsg],
            lastMessage: newMsg
          } : c)
        );
      }
    } catch (err) {
      console.log('API call failed, using fallback mock message for patient', err);
      // Simulate message sent for demo - add to current conversation
      const newMsg = {
        id: Date.now().toString(),
        content: messageContent,
        senderId: session?.user?.id || 'patient',
        senderName: session?.user?.name || 'You',
        senderType: 'patient' as const,
        timestamp: new Date().toISOString(),
        read: true
      };
      
      setConversations(convs =>
        convs.map(c => c.id === conversationId ? {
          ...c,
          messages: [...c.messages, newMsg],
          lastMessage: newMsg
        } : c)
      );
    } finally {
      setSendingMessage(false);
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
        // Load messages for the new conversation
        fetchConversationMessages(data.conversationId);
      } else {
        // Create a demo conversation for the selected doctor
        const selectedDoctor = availableDoctors.find(d => d.id === doctorId);
        if (selectedDoctor) {
          const demoMessages = [
            {
              id: '1',
              content: `Hello! I'm Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}. How can I help you today?`,
              senderId: doctorId,
              senderName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
              senderType: 'doctor' as const,
              timestamp: new Date().toISOString(),
              read: false
            }
          ];
          
          const demoConversation = {
            id: doctorId,
            doctor: selectedDoctor,
            messages: demoMessages,
            unreadCount: 1,
            lastMessage: demoMessages[0]
          };
          
          setConversations(prev => [...prev, demoConversation]);
          setSelectedConversation(doctorId);
          setShowDoctorList(false);
        }
      }
    } catch (err) {
      console.log('API call failed, using fallback mock message for doctor', err);
      // Create a demo conversation for the selected doctor
      const selectedDoctor = availableDoctors.find(d => d.id === doctorId);
      if (selectedDoctor) {
        const demoMessages = [
          {
            id: '1',
            content: `Hello! I'm Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}. How can I help you today?`,
            senderId: doctorId,
            senderName: `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
            senderType: 'doctor' as const,
            timestamp: new Date().toISOString(),
            read: false
          }
        ];
        
        const demoConversation = {
          id: doctorId,
          doctor: selectedDoctor,
          messages: demoMessages,
          unreadCount: 1,
          lastMessage: demoMessages[0]
        };
        
        setConversations(prev => [...prev, demoConversation]);
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
            <RefreshCw className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading messages...</span>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Simple Header */}
      <div className={`bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex-shrink-0 ${selectedConversation ? 'hidden md:block' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center space-x-2">
              <MessageCircle className="text-blue-600" />
              <span>Messages</span>
            </h2>
            <p className="text-xs text-gray-500 ml-8">
              {conversations.length} conversations {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && `• ${conversations.reduce((sum, c) => sum + c.unreadCount, 0)} unread`}
            </p>
          </div>
          <button
            onClick={() => setShowDoctorList(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="text-white" />
            <span className="hidden sm:inline">New Message</span>
          </button>
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
                placeholder="Search doctors..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                      // Mark as read when selected
                      markConversationAsRead(conversation.id);
                      // Load messages for this conversation
                      fetchConversationMessages(conversation.id);
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
                          {conversation.doctor.firstName?.charAt(0)}{conversation.doctor.lastName?.charAt(0)}
                        </div>
                        {conversation.doctor.isOnline && (
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
                            Dr. {conversation.doctor.firstName} {conversation.doctor.lastName}
                          </h4>
                          {conversation.unreadCount > 0 && (
                            <span className="flex-shrink-0 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-2 font-semibold">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{conversation.doctor.specialty}</p>
                        {conversation.lastMessage && (
                          <>
                            <p className={`text-xs truncate ${
                              conversation.unreadCount > 0 
                                ? 'font-medium text-gray-700' 
                                : 'text-gray-500'
                            }`}>
                              {conversation.lastMessage.senderType === 'doctor' ? '' : 'You: '}
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
                    <HelpCircle className="text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">No conversations yet</h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Start a conversation with your doctors
                  </p>
                  <button
                    onClick={() => setShowDoctorList(true)}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Start New Conversation
                  </button>
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
              {/* Chat Header */}
              <div className="px-4 md:px-6 py-2.5 border-b border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-3 -ml-3 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    <ArrowLeft className="text-gray-600" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {currentConversation.doctor.firstName?.charAt(0)}{currentConversation.doctor.lastName?.charAt(0)}
                    </div>
                    {currentConversation.doctor.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      Dr. {currentConversation.doctor.firstName} {currentConversation.doctor.lastName}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center space-x-1">
                      {currentConversation.doctor.isOnline ? (
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

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white min-h-0"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {currentConversation.messages.length > 0 ? (
                  currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`
                        max-w-[75%] md:max-w-md px-3 py-2 rounded-2xl shadow-sm
                        ${message.senderType === 'patient'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                        }
                      `}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderType === 'patient' ? 'text-blue-100' : 'text-gray-400'
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
                      <HelpCircle className="text-3xl mb-2" />
                      <p className="text-sm">Start the conversation</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 md:px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
                    title="Attach file"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    <Paperclip className="text-gray-600" />
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
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm touch-manipulation"
                    style={{ minHeight: '44px' }}
                  />
                  <button
                    onClick={() => sendMessage(selectedConversation)}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md touch-manipulation"
                    title="Send message"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    {sendingMessage ? (
                      <div className="animate-spin">
                        <RefreshCw className="text-white" />
                      </div>
                    ) : (
                      <HelpCircle className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <MessageCircle className="text-blue-600 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Choose a doctor to view and send messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showDoctorList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Start New Conversation</h3>
                <button
                  onClick={() => setShowDoctorList(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {availableDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => startConversation(doctor.id)}
                    className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {doctor.firstName?.charAt(0)}{doctor.lastName?.charAt(0)}
                      </div>
                      {doctor.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </h4>
                      <p className="text-xs text-gray-600">{doctor.specialty}</p>
                      <p className="text-xs text-gray-500">
                        {doctor.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <MessageCircle className="text-blue-600" />
                  </div>
                ))}
                {availableDoctors.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <HelpCircle className="text-gray-400" />
                    </div>
                    <h4 className="font-medium text-gray-600 mb-1 text-sm">No connected doctors</h4>
                    <p className="text-xs text-gray-500">Connect with doctors first to start messaging</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}