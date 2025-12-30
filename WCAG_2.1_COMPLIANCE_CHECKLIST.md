# WCAG 2.1 Compliance Checklist for ISPM Project

This document outlines all accessibility requirements needed to achieve WCAG 2.1 Level AA compliance (and some Level AAA recommendations).

## Overview
- **Current Status**: Partial compliance - some ARIA labels exist, but many areas need improvement
- **Target Level**: WCAG 2.1 Level AA (minimum) with Level AAA recommendations where applicable
- **Priority**: High - Accessibility is a legal requirement in many jurisdictions

---

## 1. PERCEIVABLE

### 1.1 Text Alternatives (Level A)

#### ✅ Partially Implemented
- Some images have `alt` attributes (e.g., user avatars, application logos)
- SVG logos in login page need text alternatives

#### ❌ Issues Found:
1. **Missing Alt Text**
   - Many decorative images lack `alt=""` attributes
   - Icons used as buttons (lucide-react icons) need `aria-label` or `alt` text
   - Application logos in `app/applications/page.tsx` have alt text but could be more descriptive
   - User avatars in `components/HeaderContent.tsx` use generic "User Avatar" - should be personalized

2. **Action Items:**
   - [ ] Add `alt=""` to all decorative images
   - [ ] Add descriptive `alt` text to all informative images
   - [ ] Replace generic "User Avatar" with user-specific alt text (e.g., "Profile picture of [User Name]")
   - [ ] Ensure all icon-only buttons have `aria-label` attributes
   - [ ] Add `aria-label` to SVG logos in login page

**Files to Update:**
- `components/HeaderContent.tsx` (line 432)
- `app/applications/page.tsx` (lines 108, 136)
- `components/MsAsyncData.tsx` (line 210)
- All icon buttons throughout the application

---

### 1.2 Time-based Media (Level A)

#### ❌ Issues Found:
1. **No Captions/Transcripts**
   - If any video/audio content exists, captions are required
   - [ ] Add captions for any video content
   - [ ] Add transcripts for audio content

---

### 1.3 Adaptable (Level A)

#### ❌ Issues Found:
1. **Information and Relationships**
   - [ ] Ensure proper heading hierarchy (h1 → h2 → h3, etc.)
   - [ ] Use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`)
   - [ ] Review all pages for proper document structure

2. **Semantic HTML Issues:**
   - Navigation component uses `<div>` instead of `<nav>` in some places
   - Missing `<main>` landmark on many pages
   - Headers may not follow proper hierarchy

**Files to Update:**
- `components/Navigation.tsx` - Ensure proper `<nav>` usage
- All page components - Add `<main>` landmarks
- Review heading hierarchy across all pages

---

### 1.4 Distinguishable (Level A & AA)

#### ❌ Critical Issues Found:

1. **Color Contrast (Level AA - Required)**
   - **Current Issues:**
     - Gray text on white backgrounds may not meet 4.5:1 ratio for normal text
     - Blue buttons (#2563eb) on white may need verification
     - Header background (#27B973) with white text needs verification
     - Gray-500 text (#6B7280) on white may fail contrast requirements
     - Disabled button states may have insufficient contrast
   
   - **Action Items:**
     - [ ] Audit all text colors against WCAG contrast ratios:
       - Normal text: 4.5:1 contrast ratio
       - Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio
     - [ ] Test all color combinations with contrast checker tools
     - [ ] Fix any failing color combinations
     - [ ] Ensure focus indicators meet 3:1 contrast ratio

2. **Color as Sole Indicator (Level A)**
   - **Current Issues:**
     - Risk status indicators (High/Medium/Low) may rely only on color
     - Status indicators in tables may use only color
     - Error messages may rely only on red color
   
   - **Action Items:**
     - [ ] Add text labels or icons alongside color indicators
     - [ ] Ensure error messages include text, not just red color
     - [ ] Add patterns or shapes to color-coded status indicators
     - [ ] Review all status/state indicators for color-only reliance

3. **Audio Control (Level A)**
   - [ ] If auto-playing audio exists, provide controls to stop/pause
   - [ ] Ensure audio doesn't play automatically for more than 3 seconds

**Files to Review:**
- `app/globals.css` - All color definitions
- `components/Header.tsx` - Header colors
- All components with status indicators
- Error message components

---

## 2. OPERABLE

### 2.1 Keyboard Accessible (Level A)

#### ⚠️ Partially Implemented
- Some keyboard navigation exists (ESC key in Dialog component)
- Tab navigation works in forms

#### ❌ Issues Found:

1. **Keyboard Navigation**
   - [ ] Ensure all interactive elements are keyboard accessible
   - [ ] Test tab order is logical and intuitive
   - [ ] Ensure no keyboard traps exist
   - [ ] Add keyboard shortcuts for common actions where appropriate

2. **Focus Management**
   - **Current Issues:**
     - Focus indicators may not be visible enough
     - Focus may not be properly managed in modals/dialogs
     - Focus may not return to trigger after closing modals
     - Dynamic content changes may not announce focus changes
   
   - **Action Items:**
     - [ ] Ensure all focusable elements have visible focus indicators (2px outline minimum)
     - [ ] Implement focus trap in modals/dialogs
     - [ ] Return focus to trigger element when modals close
     - [ ] Manage focus when content dynamically changes (e.g., tab switching)
     - [ ] Ensure skip links are present for main content

3. **No Keyboard Trap (Level A)**
   - [ ] Test all modals, sidebars, and overlays for keyboard traps
   - [ ] Ensure ESC key closes all modals (partially implemented in Dialog.tsx)

**Files to Update:**
- `components/Dialog.tsx` - Improve focus management
- `components/RightSideBarHost.tsx` - Focus trap implementation
- `components/ActionPanel.tsx` - Keyboard accessibility
- All modal components
- All tab components (`components/tabs.tsx`, `components/HorizontalTabs.tsx`)

---

### 2.2 Enough Time (Level A)

#### ❌ Issues Found:

1. **Timing Adjustable (Level A)**
   - [ ] If time limits exist, allow users to extend or disable them
   - [ ] Provide warnings before time expires
   - [ ] Review any session timeout mechanisms

2. **Pause, Stop, Hide (Level A)**
   - [ ] If auto-updating content exists, provide controls to pause/stop
   - [ ] Review any carousels or auto-rotating content

---

### 2.3 Seizures and Physical Reactions (Level AAA)

#### ❌ Issues Found:
- [ ] Ensure no content flashes more than 3 times per second
- [ ] Review animations for motion sensitivity

---

### 2.4 Navigable (Level A & AA)

#### ❌ Critical Issues Found:

1. **Page Titled (Level A)**
   - **Current Status:** ✅ Partially implemented - `app/layout.tsx` has metadata title
   - **Action Items:**
     - [ ] Ensure all pages have unique, descriptive titles
     - [ ] Review page titles for clarity and context

2. **Focus Order (Level A)**
   - [ ] Ensure tab order follows visual order
   - [ ] Test keyboard navigation flow
   - [ ] Fix any illogical tab sequences

3. **Link Purpose (Level A)**
   - **Current Issues:**
     - Some links may lack descriptive text
     - Icon-only links may not have accessible names
     - "Read more" or "Click here" links need context
   
   - **Action Items:**
     - [ ] Ensure all links have descriptive text
     - [ ] Add `aria-label` to icon-only links
     - [ ] Review all "Read more" links for context

4. **Multiple Ways (Level AA)**
   - [ ] Ensure multiple navigation methods (site map, search, navigation menu)
   - [ ] Review if search functionality is accessible

5. **Headings and Labels (Level A)**
   - **Current Issues:**
     - Some form inputs may lack proper labels
     - Floating labels may not be properly associated
     - Placeholder text used as labels (anti-pattern)
   
   - **Action Items:**
     - [ ] Ensure all form inputs have associated `<label>` elements
     - [ ] Fix floating label implementations to use proper label association
     - [ ] Never use placeholder as the only label
     - [ ] Ensure all form fields have visible labels

6. **Focus Visible (Level AA)**
   - **Current Issues:**
     - Focus indicators may be too subtle or missing
     - Custom focus styles may not meet contrast requirements
   
   - **Action Items:**
     - [ ] Ensure all focusable elements have visible focus indicators
     - [ ] Test focus indicators meet 3:1 contrast ratio
     - [ ] Ensure focus indicators are at least 2px wide

**Files to Update:**
- All form components (especially those with floating labels)
- `app/settings/app-inventory/add-application/page.tsx` - Floating labels
- `app/settings/app-inventory/ai-assist-app/page.tsx` - Floating labels
- `components/DatePicker.tsx` - Form inputs
- `components/ExpressionBuilder.tsx` - Form inputs
- All page components - Page titles

---

## 3. UNDERSTANDABLE

### 3.1 Readable (Level A)

#### ❌ Issues Found:

1. **Language of Page (Level A)**
   - ✅ Implemented - `app/layout.tsx` has `lang="en"` on `<html>` tag
   - [ ] Ensure language attribute is correct for all content
   - [ ] If content in other languages exists, use `lang` attribute appropriately

2. **Language of Parts (Level AA)**
   - [ ] Mark any foreign language content with appropriate `lang` attribute

---

### 3.2 Predictable (Level A & AA)

#### ❌ Issues Found:

1. **On Focus (Level A)**
   - [ ] Ensure no context changes occur on focus alone
   - [ ] Review any focus-triggered actions

2. **On Input (Level A)**
   - [ ] Ensure no unexpected context changes on input
   - [ ] Review form submissions and navigation

3. **Consistent Navigation (Level AA)**
   - ✅ Partially implemented - Navigation component exists
   - [ ] Ensure navigation is consistent across pages
   - [ ] Review navigation order and structure

4. **Consistent Identification (Level AA)**
   - [ ] Ensure components with same functionality have consistent labels
   - [ ] Review button labels and icons for consistency

5. **Change on Request (Level AAA)**
   - [ ] Ensure no automatic context changes without user request

---

### 3.3 Input Assistance (Level A & AA)

#### ❌ Critical Issues Found:

1. **Error Identification (Level A)**
   - **Current Issues:**
     - Error messages may not be properly associated with form fields
     - Error messages may rely only on color (red text)
     - Error messages may not be announced to screen readers
   
   - **Action Items:**
     - [ ] Associate error messages with form fields using `aria-describedby`
     - [ ] Add `aria-invalid="true"` to fields with errors
     - [ ] Ensure error messages are announced to screen readers
     - [ ] Add icons or text alongside color for error indication
     - [ ] Review all form validation error displays

2. **Labels or Instructions (Level A)**
   - **Current Issues:**
     - Floating labels may not be properly associated
     - Some inputs may lack visible labels
     - Required fields may not be clearly indicated
   
   - **Action Items:**
     - [ ] Ensure all inputs have visible, associated labels
     - [ ] Fix floating label implementations
     - [ ] Clearly indicate required fields (not just asterisk)
     - [ ] Add instructions where needed for complex inputs

3. **Error Suggestion (Level AA)**
   - [ ] Provide suggestions for fixing errors where possible
   - [ ] Review error messages for helpfulness

4. **Error Prevention (Level AA)**
   - [ ] For critical actions, provide confirmation or undo
   - [ ] Review delete, submit, and other critical actions
   - [ ] Ensure users can review and correct information before submission

**Files to Update:**
- All form components with validation
- `app/campaigns/new/Step1.tsx` - Error display
- `app/settings/gateway/workflow-builder/page.tsx` - Error display
- `components/DatePicker.tsx` - Error handling
- All components with floating labels

---

## 4. ROBUST

### 4.1 Compatible (Level A)

#### ❌ Issues Found:

1. **Parsing (Level A)**
   - [ ] Ensure valid HTML (no duplicate IDs, proper nesting, etc.)
   - [ ] Run HTML validator on all pages
   - [ ] Fix any parsing errors

2. **Name, Role, Value (Level A)**
   - **Current Issues:**
     - Some custom components may not have proper ARIA roles
     - Custom buttons may not have proper roles
     - Custom controls may not expose state properly
     - Tab components may not use proper ARIA tab pattern
   
   - **Action Items:**
     - [ ] Ensure all interactive elements have proper ARIA roles
     - [ ] Implement proper ARIA tab pattern for tab components
     - [ ] Add `aria-expanded` to collapsible elements
     - [ ] Add `aria-selected` to selected items
     - [ ] Add `aria-checked` to checkboxes
     - [ ] Add `aria-disabled` to disabled elements
     - [ ] Ensure custom components expose proper states
     - [ ] Review all custom UI components for ARIA compliance

**Files to Update:**
- `components/tabs.tsx` - Implement ARIA tab pattern
- `components/HorizontalTabs.tsx` - Implement ARIA tab pattern
- `components/Navigation.tsx` - ARIA navigation pattern
- `components/SegmentedControl.tsx` - ARIA roles
- `components/MultiSelect.tsx` - ARIA combobox pattern
- `components/CustomMultiSelect.tsx` - ARIA roles
- All custom interactive components

---

## 5. ADDITIONAL WCAG 2.1 REQUIREMENTS

### 5.1 Reflow (Level AA) - NEW in 2.1

#### ❌ Issues Found:
- [ ] Ensure content reflows at 320px width without horizontal scrolling
- [ ] Test all pages at 320px, 768px, and 1280px widths
- [ ] Fix any horizontal scrolling issues
- [ ] Review responsive design implementation

---

### 5.2 Non-text Contrast (Level AA) - NEW in 2.1

#### ❌ Issues Found:
- [ ] Ensure UI components (buttons, form controls, graphics) meet 3:1 contrast ratio
- [ ] Test all interactive elements for sufficient contrast
- [ ] Review icons and graphics for contrast

---

### 5.3 Text Spacing (Level AA) - NEW in 2.1

#### ❌ Issues Found:
- [ ] Ensure text remains readable when:
  - Line height set to 1.5x font size
  - Paragraph spacing set to 2x font size
  - Letter spacing set to 0.12x font size
  - Word spacing set to 0.16x font size
- [ ] Test with user style sheets
- [ ] Avoid fixed heights that prevent text spacing adjustments

---

### 5.4 Content on Hover or Focus (Level AA) - NEW in 2.1

#### ❌ Issues Found:
- [ ] Ensure hover/focus content is dismissible
- [ ] Ensure hover/focus content is hoverable
- [ ] Ensure hover/focus content is persistent
- [ ] Review tooltips and popovers
- [ ] Review dropdown menus

**Files to Review:**
- All components with tooltips
- Dropdown menus
- Popover components
- Hover-triggered content

---

## 6. IMPLEMENTATION PRIORITIES

### Priority 1 (Critical - Level A)
1. ✅ Keyboard accessibility for all interactive elements
2. ✅ Focus management in modals and dynamic content
3. ✅ Proper form labels and error associations
4. ✅ Color contrast for text (4.5:1 ratio)
5. ✅ ARIA roles and properties for custom components
6. ✅ Alt text for all images

### Priority 2 (Important - Level AA)
1. ✅ Color contrast for UI components (3:1 ratio)
2. ✅ Focus indicators (visible, 2px minimum)
3. ✅ Error identification and suggestions
4. ✅ Consistent navigation
5. ✅ Responsive design (reflow at 320px)
6. ✅ Non-text contrast

### Priority 3 (Enhancement - Level AAA)
1. ✅ Language of parts
2. ✅ Consistent identification
3. ✅ Text spacing support

---

## 7. TESTING REQUIREMENTS

### Automated Testing
- [ ] Set up axe-core or similar accessibility testing tool
- [ ] Integrate into CI/CD pipeline
- [ ] Run automated tests on all pages

### Manual Testing
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Test keyboard-only navigation
- [ ] Test with browser zoom at 200%
- [ ] Test color contrast with tools (WebAIM Contrast Checker)
- [ ] Test with different viewport sizes (320px, 768px, 1280px)
- [ ] Test with user style sheets for text spacing

### Testing Tools
- **Browser Extensions:**
  - axe DevTools
  - WAVE
  - Lighthouse
  - Accessibility Insights

- **Online Tools:**
  - WebAIM Contrast Checker
  - W3C HTML Validator
  - WAVE Web Accessibility Evaluation Tool

---

## 8. SPECIFIC COMPONENT FIXES NEEDED

### Navigation Component (`components/Navigation.tsx`)
- [ ] Add `role="navigation"` and `aria-label`
- [ ] Implement proper ARIA expanded states for collapsible items
- [ ] Ensure keyboard navigation works for all menu items
- [ ] Add skip link to main content

### Tab Components (`components/tabs.tsx`, `components/HorizontalTabs.tsx`)
- [ ] Implement ARIA tab pattern:
  - `role="tablist"` on container
  - `role="tab"` on tab buttons
  - `role="tabpanel"` on content
  - `aria-selected` on active tab
  - `aria-controls` linking tabs to panels
  - `tabindex` management

### Dialog/Modal Components (`components/Dialog.tsx`)
- [ ] Add `role="dialog"` and `aria-modal="true"`
- [ ] Add `aria-labelledby` pointing to title
- [ ] Implement focus trap
- [ ] Return focus to trigger on close
- [ ] Ensure ESC key closes (partially done)

### Form Components
- [ ] Fix floating label implementations to use proper `<label>` association
- [ ] Add `aria-describedby` for help text and errors
- [ ] Add `aria-required="true"` for required fields
- [ ] Ensure error messages are associated with fields

### Button Components
- [ ] Ensure all icon-only buttons have `aria-label`
- [ ] Add `aria-disabled` for disabled buttons
- [ ] Ensure loading states are announced

### Table Components (AG Grid)
- [ ] Ensure proper table semantics
- [ ] Add table captions where needed
- [ ] Ensure sortable columns are keyboard accessible
- [ ] Add ARIA labels for table actions

---

## 9. DOCUMENTATION NEEDS

- [ ] Create accessibility statement page
- [ ] Document keyboard shortcuts
- [ ] Create user guide for assistive technology users
- [ ] Document any known limitations

---

## 10. ESTIMATED EFFORT

### Quick Wins (1-2 days)
- Add missing `aria-label` attributes
- Fix basic color contrast issues
- Add alt text to images
- Fix form label associations

### Medium Effort (1-2 weeks)
- Implement ARIA patterns for tabs, modals, navigation
- Fix focus management
- Improve error handling and announcements
- Responsive design fixes

### Larger Effort (2-4 weeks)
- Complete accessibility audit
- Comprehensive testing with assistive technologies
- Full keyboard navigation implementation
- Documentation and training

---

## 11. RESOURCES

### WCAG 2.1 Guidelines
- https://www.w3.org/WAI/WCAG21/quickref/
- https://www.w3.org/WAI/WCAG21/Understanding/

### ARIA Patterns
- https://www.w3.org/WAI/ARIA/apg/
- https://www.w3.org/WAI/ARIA/apg/patterns/

### Testing Tools
- https://www.deque.com/axe/devtools/
- https://wave.webaim.org/
- https://webaim.org/resources/contrastchecker/

### React Accessibility
- https://react.dev/learn/accessibility
- https://github.com/reactjs/react-a11y

---

## Notes

- This checklist should be reviewed and updated as fixes are implemented
- Regular accessibility audits should be conducted
- Consider involving users with disabilities in testing
- Keep accessibility in mind for all new features


