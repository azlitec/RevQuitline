# 🧠 Psychiatrist Session Service

## New Service Added: Psychiatrist Session

### ✅ What's Added:

**1. Database Schema:**
- Added `psychiatrist_session` to `ServiceType` enum in Prisma
- Database updated with new service type

**2. Appointment Creation:**
- New option in provider appointment form: "Psychiatrist Session"
- API supports creating psychiatrist session appointments
- Proper validation and handling

**3. Patient Interface:**
- Psychiatrist session option available in patient booking
- Price: RM 300 per session
- Special badge display: 🧠 Psychiatrist Session

**4. Display & UI:**
- Blue gradient badge for psychiatrist sessions
- Distinct visual styling from other services
- Consistent across patient dashboard and appointment lists

### 🎯 Service Types Available:

| Service Type | Display Name | Price | Badge Color |
|--------------|--------------|-------|-------------|
| `consultation` | General Consultation | Free | Default |
| `follow_up` | Follow-up Appointment | Free | Default |
| `emergency` | Emergency Consultation | Free | Red |
| `quitline_smoking_cessation` | Quitline Free-Smoking Session (INRT) | RM 150 | Purple 🚭 |
| `psychiatrist_session` | Psychiatrist Session | RM 300 | Blue 🧠 |

### 🔧 Technical Implementation:

#### Database:
```sql
-- ServiceType enum now includes:
enum ServiceType {
  consultation
  follow_up
  emergency
  quitline_smoking_cessation
  psychiatrist_session  -- NEW
}
```

#### API Endpoint:
```typescript
// POST /api/provider/appointments
const allowedTypes = [
  'consultation',
  'follow_up', 
  'emergency',
  'quitline_smoking_cessation',
  'psychiatrist_session'  // NEW
];
```

#### Frontend Forms:
```tsx
// Provider appointment form
<option value="psychiatrist_session">Psychiatrist Session</option>

// Patient booking form  
{ value: 'psychiatrist_session', label: 'Psychiatrist Session', price: 300 }
```

### 🎨 Visual Design:

**Psychiatrist Session Badge:**
- Background: Blue gradient (`from-blue-100 to-blue-200`)
- Text: Blue (`text-blue-700`)
- Icon: 🧠 Brain emoji
- Style: Rounded pill with padding

### 📋 Usage:

**For Providers:**
1. Go to "New Appointment" 
2. Select patient
3. Choose "Psychiatrist Session" from service dropdown
4. Set date, time, duration
5. Add notes if needed

**For Patients:**
1. Go to "Book Appointment"
2. Select "Psychiatrist Session" (RM 300)
3. Choose available provider
4. Select date and time
5. Complete booking

### 🚀 Features:

✅ **Booking System**: Full appointment booking support
✅ **Pricing**: RM 300 per session
✅ **Visual Identity**: Distinct blue badge with brain icon
✅ **Provider Tools**: Available in provider appointment management
✅ **Patient Access**: Easy booking through patient portal
✅ **Database Support**: Proper schema and validation

### 🔍 Next Steps:

1. **Specialized Forms**: Could add psychiatrist-specific intake forms
2. **Provider Filtering**: Filter providers by psychiatrist specialty
3. **Session Notes**: Specialized note templates for psychiatric sessions
4. **Billing Integration**: Connect with payment processing
5. **Reporting**: Track psychiatrist session metrics

Psychiatrist session service is now fully integrated and ready to use! 🧠✨