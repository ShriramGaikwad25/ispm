# Dynamic Progress Summary Charts

This document describes the implementation of dynamic progress summary charts for the ISPM application, specifically for TreeClient and AppOwner components.

## Overview

The progress summary charts now automatically calculate and display progress data based on the actual row data from the grid, rather than using static/hardcoded values. This provides real-time insights into the current state of access reviews and certifications.

## Components

### 1. DynamicProgressSummary Component

**Location**: `components/DynamicProgressSummary.tsx`

**Features**:
- Automatically analyzes row data to determine progress status
- Calculates percentages based on actual data counts
- Provides interactive tooltips with detailed information
- Shows summary statistics below the chart
- Responsive design with customizable height

**Props**:
```typescript
interface DynamicProgressSummaryProps {
  rowData: any[];           // Array of row data to analyze
  title?: string;           // Chart title (default: "Progress Summary")
  height?: string;          // CSS height class (default: "h-72")
}
```

### 2. Updated ProgressDonutChart Component

**Location**: `components/ProgressDonutChart.tsx`

**Features**:
- Maintains backward compatibility with static data
- Can accept dynamic data as props
- Enhanced tooltips and statistics display
- Same visual styling as DynamicProgressSummary

**Props**:
```typescript
interface ProgressDonutChartProps {
  data?: ProgressData;      // Optional progress data (falls back to defaults)
  title?: string;           // Chart title (default: "Progress Summary")
  height?: string;          // CSS height class (default: "h-72")
}
```

## Progress Status Detection

The charts automatically detect progress status from row data by analyzing these fields:

1. **Approved/Completed**:
   - `status === "completed"` or `"approved"`
   - `aiInsights === "thumbs-up"`
   - `recommendation === "certify"`
   - `action === "approve"`

2. **Revoked**:
   - `status === "revoked"`
   - `action === "reject"`
   - `recommendation === "revoke"`

3. **Delegated**:
   - `status === "delegated"`
   - `action === "delegate"`

4. **Remediated**:
   - `status === "remediated"`
   - `action === "remediate"`

5. **Pending** (default):
   - Any row that doesn't match the above criteria

## Implementation in Components

### TreeClient Component

**Location**: `app/access-review/[reviewerId]/[certId]/TreeClient.tsx`

**Features**:
- Progress chart displayed above the grid
- Shows access review progress for the current certification
- Updates automatically when row data changes
- Positioned prominently for easy visibility

### AppOwner Component

**Location**: `app/app-owner/page.tsx`

**Features**:
- Progress chart integrated into the existing chart section
- Shows application owner review progress
- Updates based on the current page data
- Maintains consistent styling with other charts

### Access Review Page

**Location**: `app/access-review/page.tsx`

**Features**:
- Progress chart for overall certification progress
- Displays above the main grid
- Shows progress across all certifications

## Usage Examples

### Basic Usage

```tsx
import DynamicProgressSummary from "@/components/DynamicProgressSummary";

// In your component
<DynamicProgressSummary 
  rowData={yourRowData} 
  title="Custom Title"
  height="h-64"
/>
```

### With Static Data (Backward Compatible)

```tsx
import ProgressDonutChart from "@/components/ProgressDonutChart";

const staticData = {
  totalItems: 100,
  approvedCount: 25,
  pendingCount: 60,
  revokedCount: 10,
  delegatedCount: 3,
  remediatedCount: 2,
};

<ProgressDonutChart 
  data={staticData}
  title="Static Progress"
  height="h-80"
/>
```

## Data Structure

The charts expect row data with these optional fields:

```typescript
interface RowData {
  status?: string;           // Status of the item
  aiInsights?: string;       // AI recommendation insights
  recommendation?: string;    // AI recommendation
  action?: string;           // Action taken
  // ... other fields
}
```

## Styling

The charts use a consistent color scheme:

- **Pending**: Blue (#6EC6FF)
- **Approved**: Green (#50BFA5)
- **Revoked**: Purple (#6478B9)
- **Delegated**: Orange (#E67E5A)
- **Remediated**: Indigo (#4F46E5)

## Responsive Design

- Charts automatically resize based on container width
- Height can be customized via CSS classes
- Mobile-friendly with appropriate touch interactions
- Legend positioning adapts to available space

## Performance Considerations

- Charts use `useMemo` to prevent unnecessary recalculations
- Data analysis only runs when `rowData` changes
- Chart rendering is optimized with Chart.js
- Tooltips and interactions are lightweight

## Testing

A demo component is available at `components/ProgressSummaryDemo.tsx` that shows:
- Dynamic chart with sample data
- Static chart with predefined data
- Data preview and comparison
- Usage instructions

## Future Enhancements

Potential improvements for future versions:
- Custom status detection rules
- Additional chart types (bar charts, line charts)
- Export functionality for progress reports
- Real-time updates via WebSocket
- Custom color schemes per organization
- Drill-down capabilities for detailed analysis

## Troubleshooting

### Common Issues

1. **Chart not displaying**: Check if `rowData` is properly passed and not empty
2. **Incorrect percentages**: Verify that status detection logic matches your data structure
3. **Styling issues**: Ensure Chart.js and required CSS are properly loaded
4. **Performance problems**: Check if `rowData` is being recreated unnecessarily

### Debug Mode

Enable console logging by adding this to your component:

```tsx
useEffect(() => {
  console.log('Row data for progress chart:', rowData);
}, [rowData]);
```

## Dependencies

- React 18+
- Chart.js 4+
- react-chartjs-2
- chartjs-plugin-datalabels
- Tailwind CSS (for styling)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

This implementation follows the same license as the main ISPM application.
