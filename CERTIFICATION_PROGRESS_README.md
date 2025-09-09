# Certification Progress in Header

This document describes the certification progress feature that displays real-time progress information in the application header.

## Overview

The certification progress feature shows the current status of access review campaigns directly in the header, providing users with immediate visibility into their certification progress without needing to navigate to specific pages.

## Components

### CertificationProgress Component

**Location**: `components/CertificationProgress.tsx`

A reusable component that displays certification progress with:
- Progress bar showing completion percentage
- Color-coded progress indicators (green for high completion, red for low)
- Detailed breakdown of different action types:
  - 🟢 Approved (green)
  - 🔴 Revoked (red) 
  - 🔵 Delegated (blue)
  - 🟣 Remediated (purple)
  - ⚪ Pending (gray)

### Integration

**HeaderContent Component**: `components/HeaderContent.tsx`
- Listens for progress data changes via custom events
- Displays the progress component in the header when on access-review pages
- Only shows progress when there are items to display

**TreeClient Component**: `app/access-review/[reviewerId]/[certId]/TreeClient.tsx`
- Calculates progress data from entitlements
- Dispatches custom events when progress data changes
- Updates progress in real-time as users take actions

## Data Flow

```
TreeClient Component
    ↓ (loads entitlements)
    ↓ (calculates progress)
    ↓ (dispatches 'progressDataChange' event)
    ↓
HeaderContent Component
    ↓ (listens for event)
    ↓ (updates progress state)
    ↓
CertificationProgress Component
    ↓ (renders progress display)
    ↓
Header UI (shows progress bar + stats)
```

1. **TreeClient** loads entitlements and calculates progress
2. **TreeClient** dispatches `progressDataChange` custom event
3. **HeaderContent** listens for the event and updates state
4. **CertificationProgress** component renders the progress display

## Progress Data Structure

```typescript
interface ProgressData {
  totalItems: number;        // Total number of entitlements
  approvedCount: number;     // Number of approved items
  pendingCount: number;      // Number of pending items
  revokedCount: number;      // Number of revoked items
  delegatedCount: number;    // Number of delegated items
  remediatedCount: number;   // Number of remediated items
}
```

## Visual Design

- **Progress Bar**: 24px wide, 8px height with rounded corners
- **Color Coding**: 
  - Green (≥80% completion)
  - Blue (≥60% completion)
  - Yellow (≥40% completion)
  - Red (<40% completion)
- **Stats Display**: Small colored dots with counts
- **Responsive**: Adapts to header layout constraints

## Usage

The progress component automatically appears in the header when:
1. User is on an access-review page (`/access-review/[reviewerId]/[certId]`)
2. Progress data is available (totalItems > 0)

No additional configuration is required - the feature works automatically once the TreeClient loads entitlement data.

## Testing

Test file: `components/__tests__/CertificationProgress.test.tsx`

Tests cover:
- Progress percentage calculation
- Display of all progress counts
- Handling of empty data
- Component rendering

## Future Enhancements

Potential improvements:
- Click-to-expand detailed view
- Historical progress tracking
- Progress animations
- Export progress reports
- Progress notifications/alerts
