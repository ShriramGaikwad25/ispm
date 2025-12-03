# POST Operations Missing API Integration

This document lists all POST operations in the project that currently do not have proper API integration implemented, along with their expected payload structures.

## 1. Campaign Management

### 1.1 Create Campaign (Wizard Form)
- **File**: `app/campaigns/new/WizardForm.tsx`
- **Line**: 33-74
- **Status**: Uses mock API (mocky.io)
- **Current Implementation**: 
  - POST to `https://run.mocky.io/v3/ecaeebf3-b936-41b0-9d8e-176afc79099c`
  - Only shows alert on success
- **Action Required**: Replace with actual campaign creation API endpoint

**Payload Structure:**
```json
{
  "step1": {
    "template": "string (optional)",
    "ownerUser": [{"label": "string", "value": "string"}],
    "ownerGroup": [{"label": "string", "value": "string"}],
    "certificationTemplate": "string",
    "description": "string",
    "ownerType": "User" | "Group"
  },
  "step2": {
    "userType": "All users" | "Specific users" | "Custom User Group",
    "specificUserExpression": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string"
      }
    ],
    "specificApps": ["string"],
    "expressionApps": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string"
      }
    ],
    "expressionEntitlement": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string"
      }
    ],
    "groupListIsChecked": boolean,
    "userGroupList": "string | null",
    "importNewUserGroup": File | null,
    "excludeUsersIsChecked": boolean,
    "excludeUsers": "string | null",
    "selectData": "All Applications" | "Specific Applications" | "Select Entitlement"
  },
  "step3": {
    "multiStageReview": boolean,
    "stages": [
      {
        "reviewer": "string",
        "duration": "string",
        "reviewerlistIsChecked": boolean,
        "genericExpression": [
          {
            "attribute": {"label": "string", "value": "string"},
            "operator": {"label": "string", "value": "string"},
            "value": "string"
          }
        ],
        "customReviewerlist": File | null,
        "nextReviewerAction": boolean
      }
    ]
  },
  "step4": {
    "socReminders": [{"label": "string", "value": "string"}],
    "eocReminders": [{"label": "string", "value": "string"}],
    "msTeamsNotification": boolean,
    "msTeamsWebhookUrl": "string",
    "remediationTicketing": boolean,
    "allowDownloadUploadCropNetwork": boolean,
    "markUndecidedRevoke": boolean,
    "disableBulkAction": boolean,
    "enforceComments": "string",
    "genericExpression": [{"attribute": "string", "operator": "string", "value": "string"}],
    "allowEscalation": "string",
    "certifierUnavailableUsers": [{"label": "string", "value": "string"}],
    "ticketConditionalApproval": boolean,
    "authenticationSignOff": boolean,
    "generatePin": "string",
    "options": [{"label": "string", "value": "string"}],
    "userAttribute": "string",
    "applicationScope": boolean,
    "preDelegate": boolean,
    "campaignPreview": boolean,
    "campaignPreviewDuration": "string",
    "campaignPreviewEmailNotificationsEnabled": boolean,
    "campaignPreviewEmailNotifications": boolean,
    "reviewRecurrence": "string",
    "duration": "string",
    "startDate": "ISO date string",
    "end": "string"
  }
}
```

**Note**: There's also a commented-out transformation in the file (lines 258-401) that shows a more structured API payload format. Consider using that structure if the API requires it.

### 1.2 Run Campaign Template Now
- **File**: `app/campaigns/TemplateTab.tsx`
- **Line**: 20-24
- **Status**: TODO comment, no API call
- **Current Implementation**: 
  - Only console.log and alert
  - Comment: `// TODO: Call API to run the template`
- **Action Required**: Implement API call to execute/run campaign template

**Payload Structure:**
```json
{
  "certificationTemplate": "string",
  "description": "string",
  "userType": "All users" | "Specific users" | "Custom User Group",
  "selectData": "All Applications" | "Specific Applications" | "Select Entitlement",
  "specificUserExpression": [
    {
      "attribute": {"label": "string", "value": "string"},
      "operator": {"label": "string", "value": "string"},
      "value": "string"
    }
  ],
  "specificApps": ["string"],
  "expressionApps": [
    {
      "attribute": {"label": "string", "value": "string"},
      "operator": {"label": "string", "value": "string"},
      "value": "string"
    }
  ],
  "expressionEntitlement": [
    {
      "attribute": {"label": "string", "value": "string"},
      "operator": {"label": "string", "value": "string"},
      "value": "string"
    }
  ],
  "groupListIsChecked": boolean,
  "userGroupList": "string",
  "excludeUsersIsChecked": boolean,
  "excludeUsers": "string"
}
```

### 1.3 Run Now Sidebar Submission
- **File**: `app/campaigns/RunNowSidebar.tsx`
- **Line**: 117-120
- **Status**: Calls callback function, but parent handler has no API
- **Parent Handler**: `app/campaigns/TemplateTab.tsx` (line 20-24)
- **Action Required**: Implement API call in parent handler

## 2. User Management

### 2.1 Create User Group
- **File**: `app/user/create-group/page.tsx`
- **Line**: 247-261
- **Status**: No API integration
- **Current Implementation**: 
  - Only console.log
  - Simulates API call with setTimeout
  - Shows alert on success
- **Action Required**: Implement POST API to create user group

**Payload Structure:**
```json
{
  "step1": {
    "groupName": "string",
    "description": "string",
    "owner": "string",
    "tags": "string",
    "ownerIsReviewer": boolean
  },
  "step2": {
    "selectionMethod": "specific" | "selectEach" | "upload",
    "specificUserExpression": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string",
        "logicalOp": "AND" | "OR",
        "id": "string"
      }
    ],
    "selectedUsers": ["string (email addresses)"],
    "uploadedFile": File | null
  }
}
```

**Note**: If `selectionMethod` is "upload", the file should be sent as FormData with multipart/form-data encoding.

### 2.2 Start Access Request (User Profile)
- **File**: `app/user/[id]/page.tsx`
- **Line**: 594-607
- **Status**: TODO comment, no API call
- **Current Implementation**: 
  - Comment: `// TODO: Wire to API`
  - Only console.log
- **Action Required**: Implement POST API to submit access request

**Payload Structure:**
```json
{
  "item": {
    "id": "string",
    "name": "string",
    "application": "string",
    "entitlement": "string"
  },
  "accessMode": "string",
  "hours": number,
  "scheduleDate": "string (MM/DD/YYYY)",
  "startTime": "string (HH:MM AM/PM)",
  "endTime": "string (HH:MM AM/PM)",
  "justification": "string"
}
```

## 3. Settings - Gateway

### 3.1 Create Access Policy
- **File**: `app/settings/gateway/manage-access-policy/new/page.tsx`
- **Line**: 76-83
- **Status**: No API integration
- **Current Implementation**: 
  - Comment: `// TODO: Implement policy creation logic`
  - Only console.log and alert
- **Action Required**: Implement POST API to create access policy

**Payload Structure:**
```json
{
  "policyName": "string",
  "description": "string",
  "priority": "string (number as string)",
  "enabled": boolean,
  "userAttributeConditions": [
    {
      "attribute": {"label": "string", "value": "string"},
      "operator": {"label": "string", "value": "string"},
      "value": "string",
      "logicalOp": "AND" | "OR"
    }
  ],
  "accessProvisions": [
    {
      "id": "string",
      "type": "Business Role" | "Entitlement" | "Role" | "Permission" | "Profile",
      "application": "string (N/A for Business Role)",
      "name": "string"
    }
  ]
}
```

### 3.2 Workflow Builder Submission
- **File**: `app/settings/gateway/workflow-builder/page.tsx`
- **Line**: 1355-1359
- **Status**: No API integration
- **Current Implementation**: 
  - Only console.log
  - Comment: `// Here you would typically submit to your API`
  - Shows alert on success
- **Action Required**: Implement POST API to create workflow

**Payload Structure:**
```json
{
  "step1": {
    "ownerUser": [{"label": "string", "value": "string"}],
    "ownerGroup": [{"label": "string", "value": "string"}],
    "certificationTemplate": "string",
    "description": "string",
    "ownerType": "User" | "Group",
    "userType": "string",
    "specificUserExpression": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string"
      }
    ],
    "specificApps": ["string"],
    "expressionApps": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string"
      }
    ],
    "expressionEntitlement": [
      {
        "attribute": {"label": "string", "value": "string"},
        "operator": {"label": "string", "value": "string"},
        "value": "string"
      }
    ],
    "groupListIsChecked": boolean,
    "userGroupList": "string | null",
    "importNewUserGroup": File | null,
    "excludeUsersIsChecked": boolean,
    "excludeUsers": "string | null",
    "selectData": "string"
  },
  "step2": {
    "stages": [
      {
        "id": "string",
        "name": "string",
        "order": number,
        "steps": [
          {
            "id": "string",
            "label": "string",
            "code": "string",
            "kind": "SYSTEM" | "HUMAN" | "AI",
            "type": "LOGIC" | "APPROVAL" | "FULFILLMENT" | "AI AGENT",
            "condition": "string"
          }
        ]
      }
    ],
    "selectedStep": "string | null",
    "selectedStage": "string | null"
  },
  "step3": {
    "notificationEnabled": boolean,
    "emailTemplate": "string",
    "escalationEnabled": boolean,
    "escalationTime": "string"
  }
}
```

### 3.3 Gateway General Settings
- **File**: `app/settings/gateway/general/page.tsx`
- **Lines**: 
  - CMDB Settings: 146-150
  - ITSM Integration: 157-161
  - Email Server: 163-167
- **Status**: Only saves to localStorage, no API
- **Current Implementation**: 
  - Saves to localStorage only
  - Shows alert on success
- **Action Required**: Implement POST API for each settings section

**CMDB Settings Payload:**
```json
{
  "cmdbSystem": "string",
  "apiEndpoint": "string",
  "usernameClientId": "string",
  "passwordClientSecret": "string",
  "authenticationType": "string",
  "authUrl": "string",
  "tableClassName": "string",
  "queryParametersFilter": "string",
  "retrievalFields": "string"
}
```

**ITSM Integration Payload:**
```json
{
  "itsmSystem": "string"
}
```

**Email Server Payload:**
```json
{
  "fromEmail": "string",
  "smtpHost": "string",
  "smtpPort": "string",
  "smtpUsername": "string",
  "smtpPassword": "string",
  "enabled": boolean,
  "testingMode": boolean,
  "testingEmail": "string"
}
```

**IGA Settings Payload:**
```json
{
  "igaSystem": "string",
  "application_server_type": "string",
  "naming_provider_url": "string",
  "auth_login_config_path": "string",
  "username": "string",
  "password": "string",
  "dbSchema": "string"
}
```

## 4. Application Inventory

### 4.1 Add Application
- **File**: `app/settings/app-inventory/add-application/page.tsx`
- **Line**: 144-149
- **Status**: No API integration
- **Current Implementation**: 
  - Only console.log
  - Comment: `// Here you would typically submit to your API`
  - Shows alert on success
- **Action Required**: Implement POST API to add application

**Payload Structure:**
```json
{
  "step1": {
    "applicationName": "string",
    "type": "string",
    "oauthType": "string"
  },
  "step2": {
    "applicationName": "string",
    "description": "string",
    "trustedSource": boolean,
    "technicalOwner": "string",
    "businessOwner": "string"
  },
  "step3": {
    // Dynamic fields based on application type
    // Fields vary based on selected application type from API
    [key: string]: any
  },
  "step4": {
    "complianceRequirements": ["string"],
    "securityControls": ["string"],
    "monitoringEnabled": boolean
  },
  "step5": {
    "backupFrequency": "string",
    "disasterRecovery": "string",
    "maintenanceWindow": "string"
  },
  "step6": {
    "reviewNotes": "string",
    "approvalRequired": boolean,
    "goLiveDate": "string"
  },
  "attributeMapping": [
    {
      "source": "string",
      "target": "string",
      "defaultValue": "string",
      "type": "provisioning" | "deprovisioning"
    }
  ]
}
```

### 4.2 Onboard Application
- **File**: `app/settings/onboard-app/page.tsx`
- **Line**: 111-116
- **Status**: Placeholder, no API integration
- **Current Implementation**: 
  - Comment: `// Placeholder: integrate with API when available`
  - Only console.log and alert
- **Action Required**: Implement POST API to onboard application

**Payload Structure:**
```json
{
  "appName": "string",
  "databaseType": "string",
  "connectionUrl": "string",
  "driver": "string",
  "username": "string",
  "password": "string"
}
```

## 5. Access Request

### 5.1 Delegate Action Modal
- **File**: `components/DelegateActionModal.tsx`
- **Line**: 67-73
- **Status**: Only calls callback, no API integration
- **Current Implementation**: 
  - Just calls `onSelectDelegate` callback
  - No API call to actually delegate action
- **Action Required**: Implement POST API to delegate action to selected user/group

**Payload Structure:**
```json
{
  "delegateType": "User" | "Group",
  "delegate": {
    // User or Group object with attributes
    // Structure depends on selected attribute and search result
    [key: string]: string
  },
  "actionId": "string (ID of action being delegated)",
  "certificationId": "string (if applicable)",
  "reviewerId": "string (if applicable)"
}
```

**Note**: The exact payload structure depends on the context where this modal is used. The delegate object contains the selected user/group data from the search results.

### 5.2 Proxy Action Modal
- **File**: `components/ProxyActionModal.tsx`
- **Line**: 226-232
- **Status**: Only calls callback, no API integration
- **Current Implementation**: 
  - Just calls `onSelectOwner` callback
  - No API call to actually proxy action
- **Action Required**: Implement POST API to proxy action to selected owner

**Payload Structure:**
```json
{
  "ownerType": "User" | "Group",
  "owner": {
    // User or Group object with attributes
    // Typically contains: username, email, etc.
    "username": "string",
    "email": "string",
    [key: string]: string
  },
  "actionId": "string (ID of action being proxied)",
  "certificationId": "string (if applicable)",
  "reviewerId": "string (if applicable)"
}
```

**Note**: The exact payload structure depends on the context where this modal is used. The owner object contains the selected user/group data from the API search results.

## 6. UI Components

### 6.1 Header Content Form Submission
- **File**: `components/HeaderContent.tsx`
- **Line**: 65-69
- **Status**: No API integration
- **Current Implementation**: 
  - Only console.log
  - Closes dialog
- **Action Required**: Implement POST API if form submission requires backend processing

**Payload Structure:**
```json
{
  "name": "string",
  "email": "string",
  "comments": "string"
}
```

**Note**: This appears to be a user feedback/comment form. May not require API integration if it's just for display purposes.

### 6.2 Edit/Reassign Buttons
- **File**: `components/agTable/EditReassignButtons.tsx`
- **Lines**: 641, 730, 755
- **Status**: Only updates local state, no API
- **Current Implementation**: 
  - Updates AG Grid state only
  - Shows alert on success
  - No persistence to backend
- **Action Required**: Implement POST/PUT API to save changes to backend

**Payload Structure (Edit):**
```json
{
  "entitlementId": "string",
  "fields": {
    // Dynamic fields based on what was edited
    // Common fields may include:
    "status": "string",
    "owner": "string",
    "description": "string",
    "application": "string",
    "role": "string",
    // ... other editable fields
    [key: string]: any
  }
}
```

**Payload Structure (Reassign):**
```json
{
  "entitlementId": "string",
  "newOwner": {
    "type": "User" | "Group",
    "id": "string",
    "name": "string",
    "email": "string"
  },
  "reason": "string (optional)"
}
```

**Note**: The exact fields depend on the entitlement/row data structure. Use PUT for updates, POST for reassignments.

## 7. User Groups Tab (List View)

### 7.1 Fetch User Groups
- **File**: `app/user/page.tsx`
- **Line**: 375-377
- **Status**: TODO comment, no API query
- **Current Implementation**: 
  - Comment: `// TODO: Replace with actual API query when available`
  - Returns empty data
- **Action Required**: Implement GET API to fetch user groups list (not POST, but related)

## Summary

**Total POST Operations Missing API Integration: 15**

### Priority Breakdown:

**High Priority:**
1. Create Campaign (Wizard Form) - Core functionality
2. Create User Group - Core functionality
3. Create Access Policy - Core functionality
4. Add Application - Core functionality
5. Run Campaign Template - Core functionality

**Medium Priority:**
6. Workflow Builder Submission
7. Onboard Application
8. Start Access Request
9. Gateway Settings (CMDB, ITSM, Email)

**Low Priority:**
10. Delegate Action Modal
11. Proxy Action Modal
12. Header Content Form
13. Edit/Reassign Buttons (may need PUT instead of POST)

### Notes:
- Some operations use mock APIs (mocky.io) that need to be replaced
- Some operations only save to localStorage and need backend persistence
- Some operations have TODO comments indicating missing integration
- Delegate and Proxy modals may need additional context to determine the exact API endpoint

