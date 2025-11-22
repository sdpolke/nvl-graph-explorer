# KIRO ViteJS + TypeScript Modularity Guide

## File Size Limits

| File Type | Max Lines | Action |
|-----------|-----------|--------|
| Components | 250 | Split into subcomponents |
| Utilities | 200 | Extract to modules |
| Stores | 150 | Split by domain |

---

## Project Structure

```
src/
├── components/
│   └── feature-name/
│       ├── FeatureName.tsx          # Main component
│       ├── FeatureItem.tsx          # Subcomponents
│       ├── useFeature.ts            # Custom hooks
│       ├── feature.types.ts         # Types
│       └── index.ts                 # Barrel export
├── lib/
│   ├── validation/
│   ├── formatting/
│   └── api/
├── store/
│   └── slices/
└── config/
```

---

## When to Split

**Split a file when:**
- Exceeds line limit
- Handles 3+ unrelated concerns
- Difficult to test in isolation
- Has 10+ imports

---

## Splitting Patterns

### Components
```tsx
// BEFORE: UserProfile.tsx (400 lines)

// AFTER:
UserProfile.tsx          // Orchestrator (100 lines)
UserProfileForm.tsx      // Form logic
useUserProfile.ts        // Data fetching
user.types.ts            // Types
```

### Utilities
```ts
// BEFORE: utils.ts (500 lines)

// AFTER:
lib/
├── string/
│   ├── capitalize.ts
│   ├── truncate.ts
│   └── index.ts
└── date/
    ├── format.ts
    └── index.ts
```

---

## Best Practices

### 1. Barrel Exports
```ts
// components/dashboard/index.ts
export { Dashboard } from './Dashboard'
export { DashboardCard } from './DashboardCard'
```

### 2. Extract Custom Hooks
Move logic to hooks when it exceeds 30 lines or is reusable.

### 3. Separate API Calls
```ts
// lib/api/userApi.ts
export const userApi = {
  getUser: (id: string) => fetch(`/api/users/${id}`),
  updateUser: (id: string, data: User) => fetch(`/api/users/${id}`, {...})
}
```

### 4. Dedicated Type Files
```ts
// types/user.ts
export interface User { id: string; name: string }
export type UserRole = 'admin' | 'user'
```

---

## Vite-Specific

### Path Aliases
```ts
// vite.config.ts
resolve: {
  alias: {
    '@': '/src',
    '@components': '/src/components',
    '@lib': '/src/lib'
  }
}
```

### Code Splitting
```ts
// Use dynamic imports for route-based splitting
const Dashboard = lazy(() => import('@/components/Dashboard'))
```

---

## Automation

### Check File Sizes
```bash
# Add to package.json
"check:size": "find src -name '*.ts*' | xargs wc -l | sort -rn | head -20"
```

### Pre-commit Hook
```bash
# .husky/pre-commit
FILES=$(git diff --cached --name-only | grep -E '\.tsx?$')
for file in $FILES; do
  LINES=$(wc -l < "$file")
  if [ "$LINES" -gt 300 ]; then
    echo "❌ $file has $LINES lines (max 300)"
    exit 1
  fi
done
```

---

## Review Checklist

- [ ] No file > 300 lines
- [ ] Single responsibility per file
- [ ] Hooks extracted from components
- [ ] API calls in dedicated files
- [ ] Types in separate files
- [ ] Barrel exports for feature folders