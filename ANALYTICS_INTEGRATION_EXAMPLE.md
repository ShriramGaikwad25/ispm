# Analytics Integration Example

## How to Access Analytics Data in Existing Components

The analytics API is now automatically called whenever you use `getCertifications` or `useCertifications`. Here's how to access the analytics data in your existing components.

## Example: Access Review Page

### Before (only certifications):
```typescript
// In app/access-review/page.tsx
const { data, error } = useCertifications(
  reviewerId,
  defaultPageSize,
  pageNumber
);

// data was just the certification list
const certifications = data;
```

### After (certifications + analytics automatically):
```typescript
// In app/access-review/page.tsx
const { data, error } = useCertifications(
  reviewerId,
  defaultPageSize,
  pageNumber
);

// data now contains both certifications and analytics
const { certifications, analytics } = data || {};

// Use certifications as before
const certificationItems = certifications?.items || [];

// Access analytics data
const analyticsData = analytics?.analytics || {};
```

## Example: Displaying Analytics Data

```typescript
const MyComponent = ({ reviewerId }: { reviewerId: string }) => {
  const { data, isLoading, error } = useCertifications(reviewerId, 10, 1);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { certifications, analytics } = data || {};

  return (
    <div>
      {/* Display certifications as before */}
      <h2>Certifications ({certifications?.total_items || 0})</h2>
      {certifications?.items?.map(cert => (
        <div key={cert.certificationId}>
          {cert.certificationName}
        </div>
      ))}

      {/* Display analytics data */}
      <h2>Analytics Summary</h2>
      {Object.entries(analytics?.analytics || {}).map(([certId, stats]) => (
        <div key={certId} className="analytics-card">
          <h3>Certification: {certId}</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="label">New Accounts:</span>
              <span className="value">{stats.newaccount_count}</span>
            </div>
            <div className="stat">
              <span className="label">New Access:</span>
              <span className="value">{stats.newaccess_count}</span>
            </div>
            <div className="stat">
              <span className="label">Violations:</span>
              <span className="value">{stats.violations_count}</span>
            </div>
            <div className="stat">
              <span className="label">Dormant:</span>
              <span className="value">{stats.dormant_count}</span>
            </div>
            <div className="stat">
              <span className="label">Inactive Accounts:</span>
              <span className="value">{stats.inactiveaccount_count}</span>
            </div>
            <div className="stat">
              <span className="label">High Risk Entitlements:</span>
              <span className="value">{stats.highriskentitlement_count}</span>
            </div>
            <div className="stat">
              <span className="label">Orphaned:</span>
              <span className="value">{stats.orphan_count}</span>
            </div>
            <div className="stat">
              <span className="label">Inactive Users:</span>
              <span className="value">{stats.inactiveuser_count}</span>
            </div>
            <div className="stat">
              <span className="label">High Risk Accounts:</span>
              <span className="value">{stats.highriskaccount_count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Key Points

1. **No Breaking Changes**: Existing code continues to work, you just need to destructure the data differently
2. **Automatic**: Analytics are fetched automatically - no additional API calls needed
3. **Performance**: Both APIs are called in parallel for optimal performance
4. **Type Safety**: Full TypeScript support with proper interfaces

## Migration Steps

1. Update your data destructuring from `const certifications = data` to `const { certifications, analytics } = data || {}`
2. Access analytics data using `analytics?.analytics` (the outer `analytics` is the response wrapper, inner `analytics` is the data object)
3. Use the analytics data in your UI as needed

The analytics data is now automatically available whenever you call the certification list API!
