# Loading System Documentation

This document explains how to use the comprehensive loading system implemented in the ISPM application.

## Overview

The loading system provides:
- Global loading state management
- Page transition loading
- API call loading indicators
- Reusable loading components
- Integration with React Query

## Components

### 1. LoadingSpinner Components

Located in `components/LoadingSpinner.tsx`:

- **LoadingSpinner**: Basic spinner with size and color options
- **PageLoader**: Full-screen overlay loader for page transitions
- **InlineLoader**: Inline loader for content areas
- **ButtonLoader**: Loading state for buttons

```tsx
import { LoadingSpinner, PageLoader, InlineLoader, ButtonLoader } from '@/components/LoadingSpinner';

// Basic spinner
<LoadingSpinner size="md" color="primary" />

// Full page loader
<PageLoader message="Loading page..." />

// Inline loader
<InlineLoader message="Loading data..." />

// Button with loading state
<ButtonLoader loading={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</ButtonLoader>
```

### 2. Loading Context

Located in `contexts/LoadingContext.tsx`:

Provides global loading state management:

```tsx
import { useLoading } from '@/contexts/LoadingContext';

const { 
  isLoading, 
  loadingMessage, 
  setLoading, 
  showPageLoader, 
  hidePageLoader, 
  showApiLoader, 
  hideApiLoader 
} = useLoading();

// Show page loader
showPageLoader('Loading page...');

// Show API loader
showApiLoader('Loading data...');

// Hide loaders
hidePageLoader();
hideApiLoader();
```

### 3. Page Transition Loading

Located in `components/PageTransitionLoader.tsx`:

Automatically shows loading during page transitions. Already integrated in `app/layout.tsx`.

## Hooks

### 1. useQueryWithLoading

Located in `hooks/useQueryWithLoading.ts`:

Enhanced React Query hook with automatic loading states:

```tsx
import { useQueryWithLoading } from '@/hooks/useQueryWithLoading';
import { getCertifications } from '@/lib/api';

const { data, isLoading, error } = useQueryWithLoading({
  queryKey: ['certifications', reviewerId],
  queryFn: () => getCertifications(reviewerId),
  loadingMessage: 'Loading certifications...',
});
```

### 2. useLoadingApi

Located in `hooks/useLoadingApi.ts`:

Pre-built hooks for common API calls with loading states:

```tsx
import { useCertificationsWithLoading } from '@/hooks/useLoadingApi';

const { data, isLoading, error } = useCertificationsWithLoading(
  reviewerId,
  pageSize,
  pageNumber,
  setTotalPages,
  setTotalItems
);
```

### 3. useApiWithLoading

Located in `hooks/useApiWithLoading.ts`:

Generic hook for custom API calls with loading:

```tsx
import { useApiWithLoading } from '@/hooks/useApiWithLoading';

const { isLoading, executeApiCall, fetchWithLoading } = useApiWithLoading();

const handleApiCall = async () => {
  const result = await executeApiCall(
    () => fetch('/api/data'),
    'Loading data...'
  );
};
```

## API Functions with Loading

Located in `lib/apiWithLoading.ts`:

Enhanced API functions that accept loading callbacks:

```tsx
import { getCertificationsWithLoading } from '@/lib/apiWithLoading';
import { useLoading } from '@/contexts/LoadingContext';

const { showApiLoader, hideApiLoader } = useLoading();

const data = await getCertificationsWithLoading(
  reviewerId,
  pageSize,
  pageNumber,
  (loading, message) => {
    if (loading) showApiLoader(message);
    else hideApiLoader();
  }
);
```

## Usage Examples

### 1. Basic Component with Loading

```tsx
'use client';

import React from 'react';
import { useQueryWithLoading } from '@/hooks/useQueryWithLoading';
import { getCertifications } from '@/lib/api';
import { InlineLoader } from '@/components/LoadingSpinner';

export const MyComponent = ({ reviewerId }) => {
  const { data, isLoading, error } = useQueryWithLoading({
    queryKey: ['certifications', reviewerId],
    queryFn: () => getCertifications(reviewerId),
    loadingMessage: 'Loading certifications...',
  });

  if (isLoading) {
    return <InlineLoader message="Loading certifications..." />;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {data?.items?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
```

### 2. Form with Loading States

```tsx
'use client';

import React, { useState } from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { ButtonLoader } from '@/components/LoadingSpinner';

export const MyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showApiLoader, hideApiLoader } = useLoading();

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      showApiLoader('Submitting form...');
      await submitForm(formData);
    } finally {
      setIsSubmitting(false);
      hideApiLoader();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isSubmitting}>
        <ButtonLoader loading={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </ButtonLoader>
      </button>
    </form>
  );
};
```

### 3. Page with Multiple Loading States

```tsx
'use client';

import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { useQueryWithLoading } from '@/hooks/useQueryWithLoading';
import { getCertifications, getCertificationDetails } from '@/lib/api';

export const MyPage = ({ reviewerId, certId }) => {
  const { showPageLoader, hidePageLoader } = useLoading();

  const { data: certifications, isLoading: certsLoading } = useQueryWithLoading({
    queryKey: ['certifications', reviewerId],
    queryFn: () => getCertifications(reviewerId),
    loadingMessage: 'Loading certifications...',
  });

  const { data: details, isLoading: detailsLoading } = useQueryWithLoading({
    queryKey: ['certificationDetails', reviewerId, certId],
    queryFn: () => getCertificationDetails(reviewerId, certId),
    loadingMessage: 'Loading details...',
    enabled: !!certId,
  });

  const handlePageAction = async () => {
    try {
      showPageLoader('Processing...');
      await performPageAction();
    } finally {
      hidePageLoader();
    }
  };

  return (
    <div>
      <h1>My Page</h1>
      {/* content */}
      <button onClick={handlePageAction}>
        Perform Page Action
      </button>
    </div>
  );
};
```

## Integration

The loading system is already integrated into the app:

1. **LoadingProvider** wraps the entire app in `app/layout.tsx`
2. **PageTransitionLoader** automatically handles page transitions
3. All loading components are available throughout the app

## Best Practices

1. **Use appropriate loading components**:
   - `PageLoader` for full-page loading
   - `InlineLoader` for content area loading
   - `ButtonLoader` for button loading states
   - `LoadingSpinner` for small inline loading

2. **Provide meaningful loading messages**:
   - "Loading certifications..." instead of just "Loading..."
   - Be specific about what's being loaded

3. **Handle loading states properly**:
   - Always hide loaders in finally blocks
   - Use try/catch for error handling
   - Disable buttons during loading

4. **Use the enhanced hooks**:
   - Prefer `useQueryWithLoading` over regular `useQuery`
   - Use `useLoadingApi` hooks for common API calls
   - Use `useApiWithLoading` for custom API calls

5. **Consistent loading experience**:
   - Use the global loading context for consistent behavior
   - Show appropriate loading messages
   - Handle errors gracefully

## Migration Guide

To migrate existing components to use the loading system:

1. **Replace regular useQuery**:
   ```tsx
   // Before
   const { data, isLoading } = useQuery({
     queryKey: ['data'],
     queryFn: fetchData,
   });

   // After
   const { data, isLoading } = useQueryWithLoading({
     queryKey: ['data'],
     queryFn: fetchData,
     loadingMessage: 'Loading data...',
   });
   ```

2. **Add loading components**:
   ```tsx
   // Before
   if (isLoading) return <div>Loading...</div>;

   // After
   if (isLoading) return <InlineLoader message="Loading data..." />;
   ```

3. **Use loading context for manual operations**:
   ```tsx
   // Before
   const handleAction = async () => {
     setLoading(true);
     await performAction();
     setLoading(false);
   };

   // After
   const { showApiLoader, hideApiLoader } = useLoading();
   const handleAction = async () => {
     try {
       showApiLoader('Performing action...');
       await performAction();
     } finally {
       hideApiLoader();
     }
   };
   ```

This loading system provides a comprehensive solution for all loading states in the application, ensuring a consistent and user-friendly experience.
