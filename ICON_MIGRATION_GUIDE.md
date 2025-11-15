# Icon Migration Guide - Material Icons → Lucide React

## Quick Reference

### Common Icon Replacements

```tsx
// ❌ OLD - Material Icons (Broken)
<span className="material-icons">people</span>
<span className="material-icons">event</span>
<span className="material-icons">search</span>

// ✅ NEW - Lucide React (Working)
<Users className="w-5 h-5" />
<Calendar className="w-5 h-5" />
<Search className="w-5 h-5" />
```

## Complete Mapping Table

| Material Icon | Lucide React | Import |
|---------------|--------------|--------|
| `people` / `person` | `Users` / `User` | `import { Users, User } from 'lucide-react'` |
| `event` / `calendar_today` | `Calendar` | `import { Calendar } from 'lucide-react'` |
| `search` | `Search` | `import { Search } from 'lucide-react'` |
| `close` / `clear` | `X` | `import { X } from 'lucide-react'` |
| `expand_more` | `ChevronDown` | `import { ChevronDown } from 'lucide-react'` |
| `expand_less` | `ChevronUp` | `import { ChevronUp } from 'lucide-react'` |
| `chevron_right` | `ChevronRight` | `import { ChevronRight } from 'lucide-react'` |
| `chevron_left` | `ChevronLeft` | `import { ChevronLeft } from 'lucide-react'` |
| `arrow_forward` | `ArrowRight` | `import { ArrowRight } from 'lucide-react'` |
| `arrow_back` | `ArrowLeft` | `import { ArrowLeft } from 'lucide-react'` |
| `check` / `check_circle` | `Check` / `CheckCircle` | `import { Check, CheckCircle } from 'lucide-react'` |
| `error` / `error_outline` | `AlertCircle` | `import { AlertCircle } from 'lucide-react'` |
| `warning` | `AlertTriangle` | `import { AlertTriangle } from 'lucide-react'` |
| `info` | `Info` | `import { Info } from 'lucide-react'` |
| `refresh` / `sync` | `Loader2` / `RefreshCw` | `import { Loader2, RefreshCw } from 'lucide-react'` |
| `home` | `Home` | `import { Home } from 'lucide-react'` |
| `settings` | `Settings` | `import { Settings } from 'lucide-react'` |
| `mail` / `email` | `Mail` | `import { Mail } from 'lucide-react'` |
| `phone` | `Phone` | `import { Phone } from 'lucide-react'` |
| `location_on` | `MapPin` | `import { MapPin } from 'lucide-react'` |
| `videocam` | `Video` | `import { Video } from 'lucide-react'` |
| `chat` / `message` | `MessageSquare` | `import { MessageSquare } from 'lucide-react'` |
| `description` / `article` | `FileText` | `import { FileText } from 'lucide-react'` |
| `favorite` / `heart` | `Heart` | `import { Heart } from 'lucide-react'` |
| `notifications` | `Bell` | `import { Bell } from 'lucide-react'` |
| `logout` | `LogOut` | `import { LogOut } from 'lucide-react'` |
| `login` | `LogIn` | `import { LogIn } from 'lucide-react'` |
| `visibility` | `Eye` | `import { Eye } from 'lucide-react'` |
| `visibility_off` | `EyeOff` | `import { EyeOff } from 'lucide-react'` |
| `edit` | `Edit` | `import { Edit } from 'lucide-react'` |
| `delete` | `Trash` | `import { Trash } from 'lucide-react'` |
| `add` / `add_circle` | `Plus` / `PlusCircle` | `import { Plus, PlusCircle } from 'lucide-react'` |
| `remove` | `Minus` | `import { Minus } from 'lucide-react'` |
| `download` | `Download` | `import { Download } from 'lucide-react'` |
| `upload` | `Upload` | `import { Upload } from 'lucide-react'` |
| `share` | `Share2` | `import { Share2 } from 'lucide-react'` |
| `print` | `Printer` | `import { Printer } from 'lucide-react'` |
| `attach_file` | `Paperclip` | `import { Paperclip } from 'lucide-react'` |
| `folder` | `Folder` | `import { Folder } from 'lucide-react'` |
| `cloud` | `Cloud` | `import { Cloud } from 'lucide-react'` |
| `lock` | `Lock` | `import { Lock } from 'lucide-react'` |
| `lock_open` | `Unlock` | `import { Unlock } from 'lucide-react'` |
| `star` | `Star` | `import { Star } from 'lucide-react'` |
| `bookmark` | `Bookmark` | `import { Bookmark } from 'lucide-react'` |
| `schedule` / `access_time` | `Clock` | `import { Clock } from 'lucide-react'` |
| `today` | `CalendarDays` | `import { CalendarDays } from 'lucide-react'` |
| `payment` / `credit_card` | `CreditCard` / `DollarSign` | `import { CreditCard, DollarSign } from 'lucide-react'` |
| `medication` / `local_pharmacy` | `Pill` | `import { Pill } from 'lucide-react'` |
| `local_hospital` | `Hospital` | `import { Hospital } from 'lucide-react'` |
| `local_drink` | `Droplet` | `import { Droplet } from 'lucide-react'` |
| `smoking_rooms` | `Cigarette` | `import { Cigarette } from 'lucide-react'` |
| `fitness_center` | `Activity` | `import { Activity } from 'lucide-react'` |
| `menu` | `Menu` | `import { Menu } from 'lucide-react'` |
| `more_vert` | `MoreVertical` | `import { MoreVertical } from 'lucide-react'` |
| `more_horiz` | `MoreHorizontal` | `import { MoreHorizontal } from 'lucide-react'` |

## Sizing Guide

### Material Icons (Old)
```tsx
<span className="material-icons" style={{ fontSize: '24px' }}>icon_name</span>
```

### Lucide React (New)
```tsx
// Small
<IconName className="w-4 h-4" />  // 16px

// Medium (default)
<IconName className="w-5 h-5" />  // 20px

// Large
<IconName className="w-6 h-6" />  // 24px

// Extra Large
<IconName className="w-8 h-8" />  // 32px

// Custom size
<IconName className="w-10 h-10" />  // 40px
```

## Coloring Guide

### Material Icons (Old)
```tsx
<span className="material-icons text-blue-600">icon_name</span>
```

### Lucide React (New)
```tsx
<IconName className="w-5 h-5 text-blue-600" />
```

## Animation Examples

### Spinning Loader
```tsx
<Loader2 className="w-6 h-6 animate-spin text-blue-600" />
```

### Pulse Effect
```tsx
<Bell className="w-5 h-5 animate-pulse text-red-600" />
```

### Bounce Effect
```tsx
<ArrowDown className="w-5 h-5 animate-bounce text-gray-600" />
```

## Migration Steps

### 1. Find Material Icons in Your Code
```bash
# Search for Material Icons usage
grep -r "material-icons" src/
grep -r "IconWithFallback" src/
```

### 2. Import Lucide Icons
```tsx
// At the top of your file
import { 
  Users, 
  Calendar, 
  Search,
  // ... other icons you need
} from 'lucide-react';
```

### 3. Replace Icon Components
```tsx
// Before
<span className="material-icons">people</span>

// After
<Users className="w-5 h-5" />
```

### 4. Update Styling
```tsx
// Before
<span className="material-icons text-blue-600" style={{ fontSize: '24px' }}>
  event
</span>

// After
<Calendar className="w-6 h-6 text-blue-600" />
```

## Benefits

✅ **No External Dependencies** - Icons bundled with your app
✅ **Better Performance** - Tree-shakeable, smaller bundle size
✅ **Type Safety** - Full TypeScript support
✅ **Consistent** - All icons follow same design language
✅ **Customizable** - Easy to size, color, and animate
✅ **Modern** - Clean, professional design
✅ **Reliable** - No CDN failures or loading issues

## Resources

- **Lucide Icons**: https://lucide.dev/icons/
- **Documentation**: https://lucide.dev/guide/
- **GitHub**: https://github.com/lucide-icons/lucide

## Need Help?

If you're unsure which Lucide icon to use:
1. Visit https://lucide.dev/icons/
2. Search for the icon you need
3. Click to see usage example
4. Copy the import and component code

## Example: Complete Component Migration

### Before (Material Icons)
```tsx
const MyComponent = () => {
  return (
    <div>
      <span className="material-icons">people</span>
      <span className="material-icons">event</span>
      <span className="material-icons">search</span>
    </div>
  );
};
```

### After (Lucide React)
```tsx
import { Users, Calendar, Search } from 'lucide-react';

const MyComponent = () => {
  return (
    <div className="flex gap-4">
      <Users className="w-5 h-5 text-blue-600" />
      <Calendar className="w-5 h-5 text-green-600" />
      <Search className="w-5 h-5 text-gray-600" />
    </div>
  );
};
```

---

**Migration Complete!** Your icons should now render properly without any external dependencies. 🎉
