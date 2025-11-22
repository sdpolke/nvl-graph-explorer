---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# KIRO Code Generation Standards

## 1. Complexity Assessment (Pre-Generation)

### Before Writing Code, Calculate:

**Cyclomatic Complexity Target: ≤ 10 per function**

```
Complexity = 1 + (decision points)

Decision points:
- if/else: +1
- switch case: +1 per case
- for/while: +1
- &&/||: +1
- ternary: +1
- catch: +1
```

**Example:**
```ts
// Complexity = 1 + 2 (if) + 1 (loop) + 1 (&&) = 5 ✓
function processUsers(users: User[]) {
  if (!users.length) return [];
  
  const active = [];
  for (const user of users) {
    if (user.isActive && user.verified) {
      active.push(user);
    }
  }
  return active;
}
```

### Complexity > 10? Refactor First

```ts
// BAD: Complexity = 15
function handleOrder(order: Order) {
  if (order.status === 'pending') {
    if (order.items.length > 0) {
      for (const item of order.items) {
        if (item.stock > 0) {
          if (item.price > 0) {
            // ... more nesting
          }
        }
      }
    }
  }
}

// GOOD: Split into functions (each ≤ 10)
function handleOrder(order: Order) {
  if (order.status !== 'pending') return;
  processOrderItems(order.items);
}

function processOrderItems(items: Item[]) {
  const valid = items.filter(isValidItem);
  valid.forEach(processItem);
}
```

---

## 2. Comment Minimization

### Rules:
1. **Code should be self-documenting**
2. **Only comment WHY, never WHAT**
3. **Max 1 comment per 20 lines of code**
4. **Remove all obvious comments**

### DON'T
```ts
// Create a new user object
const user = {
  // Set the user ID
  id: generateId(),
  // Set the user name
  name: data.name,
  // Set the email address
  email: data.email
};

// Loop through users
for (const user of users) {
  // Check if user is active
  if (user.isActive) {
    // Add to active list
    activeUsers.push(user);
  }
}
```

### DO
```ts
const user = {
  id: generateId(),
  name: data.name,
  email: data.email
};

// Filter mutates original array for performance
for (const user of users) {
  if (user.isActive) activeUsers.push(user);
}
```

### When to Comment
```ts
// Using bitwise for 2x faster integer division
const mid = (left + right) >>> 1;

// Cache invalidation after 5min due to API rate limits
const CACHE_TTL = 300000;

// Regex matches ISO 8601 except fractional seconds (legacy API constraint)
const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
```

---

## 3. Performance First

### Benchmark Before Choosing Implementation

```ts
// ❌ SLOW: Creates new array, filters twice
const adults = users.filter(u => u.age >= 18).map(u => u.name);

// ✓ FAST: Single pass
const adults = users.reduce((acc, u) => {
  if (u.age >= 18) acc.push(u.name);
  return acc;
}, []);

// ✓ FASTER: Pre-allocate if size known
const adults = new Array(estimatedSize);
let idx = 0;
for (const u of users) {
  if (u.age >= 18) adults[idx++] = u.name;
}
adults.length = idx;
```

### Algorithm Complexity Targets

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Lookups | O(1) | O(log n) |
| Filters | O(n) | O(n log n) |
| Sorts | O(n log n) | O(n²) with n < 100 |
| Nested loops | Avoid | O(n²) if n < 1000 |

### Performance Checklist

**Data Structures:**
- [ ] Use `Map` over objects for frequent lookups
- [ ] Use `Set` for uniqueness checks
- [ ] Use typed arrays for numeric data

```ts
// ❌ Object lookup: O(n) worst case
const exists = Object.keys(obj).includes(key);

// ✓ Map lookup: O(1)
const exists = map.has(key);
```

**Loops:**
- [ ] Prefer `for...of` over `.forEach()` (25% faster)
- [ ] Cache array length in hot loops
- [ ] Avoid function calls in loop conditions

```ts
// ❌ Calls length on every iteration
for (let i = 0; i < items.length; i++) { }

// ✓ Cache length
const len = items.length;
for (let i = 0; i < len; i++) { }

// ✓ Even better for simple iterations
for (const item of items) { }
```

**Memory:**
- [ ] Reuse objects instead of creating new ones
- [ ] Use object pools for frequently created/destroyed objects
- [ ] Clear references when done

```ts
// ❌ Creates new objects in loop
for (let i = 0; i < 10000; i++) {
  const point = { x: i, y: i * 2 };
  process(point);
}

// ✓ Reuse object
const point = { x: 0, y: 0 };
for (let i = 0; i < 10000; i++) {
  point.x = i;
  point.y = i * 2;
  process(point);
}
```

**Async Operations:**
- [ ] Use `Promise.all()` for parallel operations
- [ ] Debounce/throttle frequent calls
- [ ] Cancel pending operations on unmount

```ts
// ❌ Sequential: 3 seconds total
await fetchUser();
await fetchPosts();
await fetchComments();

// ✓ Parallel: 1 second total
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
]);
```

---

## Quick Reference

### Pre-Code Checklist
1. Complexity ≤ 10? → Proceed
2. Complexity > 10? → Split into smaller functions
3. Algorithm choice benchmarked? → Use fastest for scale
4. Comments only explain WHY? → Remove WHAT comments

### Code Review Red Flags
- Function > 50 lines
- Complexity > 10
- O(n²) with n > 1000
- Comments explaining obvious code
- No performance consideration for hot paths

### Performance Priorities
1. **Critical paths**: User interactions, render loops
2. **Hot paths**: Called > 1000x per second
3. **Normal paths**: Everything else

Only optimize critical and hot paths. Profile first, optimize second.