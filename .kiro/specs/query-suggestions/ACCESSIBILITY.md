# Query Suggestions - Accessibility Features

This document outlines the accessibility features implemented in the Query Suggestions feature to ensure WCAG 2.1 Level AA compliance.

## Overview

The Query Suggestions feature has been designed with accessibility as a core principle, ensuring that all users, including those using assistive technologies, can effectively discover and execute graph database queries.

## Implemented Features

### 1. ARIA Labels and Roles

#### QuerySuggestionsPanel Component
- **Navigation container**: `role="navigation"` with `aria-label="Query suggestions"`
- **Category sections**: `role="section"` with `aria-labelledby` linking to category headers
- **Suggestion lists**: `role="list"` with descriptive `aria-label`
- **Live region**: `role="status"` with `aria-live="polite"` for state change announcements
- **Screen reader announcements**: Hidden live region announces query execution status

#### QuerySuggestionItem Component
- **List items**: `role="listitem"` for semantic list structure
- **Active state**: `aria-current="true"` indicates the currently active query
- **Disabled state**: `aria-disabled="true"` when queries are executing
- **Comprehensive labels**: `aria-label` includes query text, description, complexity, and state
- **Loading indicator**: `role="status"` with `aria-label="Executing query"`

#### TaxonomySidebar Component
- **Tab list**: `role="tablist"` with `aria-label="Sidebar tabs"`
- **Tab buttons**: `role="tab"` with `aria-selected` and `aria-controls`
- **Tab panels**: `role="tabpanel"` with `aria-labelledby`
- **Collapse button**: `aria-expanded` indicates sidebar state
- **Node type filters**: `role="group"` with descriptive labels
- **Selection count**: `role="status"` with `aria-live="polite"`

### 2. Keyboard Navigation

#### Full Keyboard Support
- **Tab navigation**: All interactive elements are keyboard accessible
- **Enter/Space activation**: Suggestions respond to both keys
- **Arrow keys**: Navigate between suggestions within the panel
  - `ArrowDown`: Move to next suggestion (wraps to first)
  - `ArrowUp`: Move to previous suggestion (wraps to last)
  - `Home`: Jump to first suggestion
  - `End`: Jump to last suggestion
- **Focus management**: Logical tab order throughout the interface

#### Specific Implementations
- **Suggestion items**: `tabIndex={0}` makes items focusable, `onKeyDown` handles Enter/Space
- **Tab switching**: Proper `tabIndex` management (0 for active tab, -1 for inactive)
- **Disabled state**: `tabIndex={-1}` prevents focus on disabled items

### 3. Focus Indicators

#### Visual Focus States
- **Primary focus**: 3px solid blue outline (`#4a89dc`)
- **Focus offset**: 2px offset for clear separation
- **Focus shadow**: Additional 4px shadow for enhanced visibility
- **High contrast**: Enhanced borders in high contrast mode

#### CSS Implementation
```css
.query-suggestion-item:focus-visible {
  outline: 3px solid #4a89dc;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(74, 137, 220, 0.2);
}
```

### 4. Screen Reader Compatibility

#### Semantic HTML
- Proper heading hierarchy (`h3` for category names)
- Native button elements for all actions
- Semantic list structure with proper roles
- Navigation landmarks for major sections

#### Hidden Descriptions
- **Screen reader only text**: `.sr-only` class provides additional context
- **Icon labels**: Decorative icons marked with `aria-hidden="true"`
- **Category descriptions**: Hidden descriptions for additional context

#### Live Regions
- **Status updates**: `aria-live="polite"` for non-critical updates
- **Query execution**: Announces "Executing query: [query text]"
- **Query completion**: Announces "Query completed: [query text]"
- **Atomic updates**: `aria-atomic="true"` ensures complete messages are read

#### Descriptive Labels
- **Suggestions**: Include query text, description, complexity level, and state
- **Categories**: Clear category names and optional descriptions
- **Complexity badges**: `aria-label` explains complexity level

### 5. High Contrast Mode Support

#### Enhanced Borders
- **Container borders**: 2px borders in high contrast mode
- **Interactive elements**: Enhanced border visibility
- **Active items**: High contrast background (black/white)

#### CSS Implementation
```css
@media (prefers-contrast: high) {
  .query-suggestion-item {
    border-width: 2px;
  }

  .query-suggestion-item.active {
    background: #000;
    color: #fff;
    border-width: 3px;
  }

  .complexity-badge {
    border: 1px solid currentColor;
  }
}
```

### 6. Reduced Motion Support

#### Animation Control
- **Respects preference**: `prefers-reduced-motion` media query
- **Disabled animations**: Removes all animations when requested
- **Static transforms**: Removes hover transforms

```css
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  * {
    transition: none !important;
  }

  .query-suggestion-item:hover:not(.disabled) {
    transform: none;
  }
}
```

## Testing

### Manual Testing Checklist
- [x] Keyboard navigation works (Tab, Enter, Space, Arrow keys, Home, End)
- [x] Screen reader announces all content correctly
- [x] Focus indicators are visible and clear
- [x] High contrast mode displays properly
- [x] Reduced motion preference is respected
- [x] All interactive elements are keyboard accessible

### Automated Testing
- [x] ARIA roles and labels are present
- [x] Keyboard navigation functions correctly
- [x] Live regions announce state changes
- [x] Focus management works as expected
- [x] Disabled state prevents interaction

### Browser Testing
- Chrome with ChromeVox
- Firefox with NVDA
- Safari with VoiceOver
- Edge with Narrator

## WCAG 2.1 Compliance

### Level A
✅ 1.1.1 Non-text Content (decorative icons marked with aria-hidden)
✅ 1.3.1 Info and Relationships (semantic HTML and ARIA roles)
✅ 2.1.1 Keyboard (full keyboard navigation)
✅ 2.1.2 No Keyboard Trap (focus can move freely)
✅ 2.4.1 Bypass Blocks (navigation landmarks)
✅ 4.1.2 Name, Role, Value (proper ARIA attributes)

### Level AA
✅ 1.4.3 Contrast (Minimum) (sufficient color contrast)
✅ 2.4.6 Headings and Labels (descriptive labels)
✅ 2.4.7 Focus Visible (clear focus indicators)
✅ 3.2.3 Consistent Navigation (consistent tab behavior)
✅ 3.2.4 Consistent Identification (consistent component behavior)

## Key Features

### Keyboard Navigation
- Arrow keys navigate between suggestions
- Home/End keys jump to first/last suggestion
- Enter/Space activates suggestions
- Tab navigates between major sections
- Disabled items are not focusable

### Screen Reader Support
- All content is announced correctly
- State changes are announced via live regions
- Descriptive labels provide context
- Semantic HTML ensures proper navigation

### Visual Accessibility
- Clear focus indicators
- High contrast mode support
- Reduced motion support
- Sufficient color contrast

## Future Enhancements

1. **Keyboard shortcuts**: Add custom shortcuts for common actions
2. **Voice commands**: Integrate voice control support
3. **Customizable focus**: Allow users to customize focus indicator colors
4. **Enhanced announcements**: More detailed screen reader feedback

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

## Maintenance

This accessibility implementation should be reviewed and tested:
- Before each major release
- When adding new features
- After dependency updates
- When user feedback indicates issues

Last updated: 2024
