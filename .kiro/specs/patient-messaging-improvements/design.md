# Design Document

## Overview

This design document outlines the improvements to the patient messaging system to create a consistent, clean interface that matches the provider's messaging design while ensuring proper functionality for loading conversations, displaying unread indicators, and handling message interactions.

## Architecture

### Component Structure
```
PatientMessagesPage
├── ConversationsList (Left Sidebar)
│   ├── SearchBar
│   ├── ConversationItem[]
│   └── EmptyState
├── ChatArea (Main Content)
│   ├── ChatHeader
│   ├── MessagesContainer
│   │   ├── DateSeparator
│   │   └── MessageBubble[]
│   └── MessageInput
└── NewConversationModal
```

### Data Flow
1. **Initial Load**: Fetch conversations list from `/api/patient/messages`
2. **Conversation Selection**: Fetch specific conversation messages from `/api/patient/messages/[conversationId]`
3. **Message Sending**: POST to `/api/patient/messages/send`
4. **Real-time Updates**: Refresh conversations after sending messages

## Components and Interfaces

### ConversationsList Component
- **Purpose**: Display list of patient's conversations with providers
- **Design**: Clean, compact list matching provider interface
- **Features**:
  - Provider avatars with initials
  - Online status indicators
  - Unread message badges
  - Last message preview
  - Timestamp display
  - Search functionality

### ChatArea Component
- **Purpose**: Display selected conversation messages and input
- **Design**: Clean chat interface with proper message bubbles
- **Features**:
  - Minimal header with provider info and back button (mobile)
  - Scrollable messages container
  - Patient messages: Blue gradient bubbles (right-aligned)
  - Provider messages: White bubbles with border (left-aligned)
  - Fixed input area at bottom

### MessageInput Component
- **Purpose**: Handle message composition and sending
- **Design**: Clean input with attach and send buttons
- **Features**:
  - Text input with placeholder
  - Attach file button (left)
  - Send button (right, disabled when empty)
  - Enter key support

## Data Models

### Conversation Interface
```typescript
interface Conversation {
  id: string;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  messages: Message[];
}
```

### Message Interface
```typescript
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'doctor';
  timestamp: string;
  read: boolean;
}
```

## Error Handling

### API Failure Scenarios
1. **Conversations Load Failure**: Show empty state with retry option
2. **Message Load Failure**: Display error message in chat area
3. **Send Message Failure**: Show error toast, keep message in input
4. **Network Issues**: Graceful degradation with offline indicators

### User Feedback
- Loading states with spinners
- Error messages with clear actions
- Success confirmations for sent messages
- Retry mechanisms for failed operations

## Testing Strategy

### Unit Tests
- Component rendering with different props
- Message formatting and display logic
- Unread count calculations
- API response handling

### Integration Tests
- Full conversation flow (load → select → send)
- Mobile responsive behavior
- Error handling scenarios
- Real-time message updates

### User Experience Tests
- Message sending and receiving flow
- Conversation switching
- Mobile navigation (back button)
- Unread message marking

## Implementation Notes

### Key Improvements from Current Design
1. **Consistent Styling**: Match provider interface colors, spacing, and layout
2. **Proper Message Loading**: Implement conversation-specific message fetching
3. **Unread Indicators**: Add proper badge system with counts
4. **Mobile Optimization**: Hide/show panels appropriately
5. **Clean Input Design**: Simplified message input matching provider style

### Performance Considerations
- Lazy load conversation messages only when selected
- Implement message pagination for large conversations
- Optimize re-renders with proper React keys
- Cache conversation list to reduce API calls

### Accessibility
- Proper ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode compatibility
- Touch-friendly button sizes (44px minimum)