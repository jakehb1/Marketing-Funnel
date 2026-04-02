# ENNIE Design System — Quick Reference

## 🎨 Color Palette

```css
/* Backgrounds */
--bg-neutral:  #FAFBFC  /* Primary background */
--bg-card:     #FFFFFF  /* Card/content background */

/* Text */
--color-text:           #1F2937  /* Primary text */
--color-text-secondary: #6B7280  /* Secondary text */

/* Interactive */
--color-primary:  #2563EB  /* Primary action/link */
--color-accent:   #DC2626  /* Destructive/alert */
--color-success:  #10B981  /* Success state */
--color-warning:  #F59E0B  /* Warning state */

/* Structural */
--color-border: #E5E7EB  /* Subtle borders */
```

## 📐 Typography

### Font Family
```css
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', sans-serif
```

### Font Sizes
- **H1:** 32px, weight 600, line-height 1.4, letter-spacing -0.5px
- **H2:** 24px, weight 600, line-height 1.4, letter-spacing -0.5px
- **H3:** 18px, weight 600, line-height 1.4, letter-spacing -0.3px
- **Body:** 14px, weight 400, line-height 1.6
- **Caption:** 12px, weight 400, line-height 1.6

### Font Weights
- 600 — Headers, labels, emphasis
- 500 — Semi-bold accents
- 400 — Body text, regular

## 📏 Spacing (8px Grid)

```css
--spacing-xs:   4px    /* Minimal spacing */
--spacing-sm:   8px    /* Small gaps */
--spacing-md:   12px   /* Medium spacing */
--spacing-lg:   16px   /* Standard gap */
--spacing-xl:   20px   /* Large spacing */
--spacing-2xl:  24px   /* Extra large */
--spacing-3xl:  32px   /* Section spacing */
```

**Usage:** Use multiples of 8px for consistency
- Padding: `--spacing-lg` to `--spacing-3xl`
- Gaps: `--spacing-md` to `--spacing-2xl`
- Margins: `--spacing-lg` to `--spacing-3xl`

## 💫 Shadows

```css
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05)        /* Subtle */
--shadow-md:  0 4px 6px rgba(0, 0, 0, 0.07)        /* Hover */
--shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.1)       /* Modals */
```

**Usage:**
- Resting state: no shadow
- Hover state: `--shadow-md`
- Modals/dropdowns: `--shadow-lg`

## ⚡ Transitions

```css
--transition-base: all 0.2s ease
```

Use for:
- Color changes on hover
- Border color transitions
- Background changes
- Transform effects

## 🧩 Component Patterns

### Button (Primary)
```html
<button class="btn primary">Save Changes</button>
```

CSS:
```css
.btn {
  padding: var(--spacing-lg) var(--spacing-xl);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-header);
  cursor: pointer;
  transition: var(--transition-base);
}

.btn.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn.primary:hover {
  background: #1d4ed8;
}
```

### Card
```html
<div class="card">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

CSS:
```css
.card {
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  padding: var(--spacing-xl);
  transition: var(--transition-base);
}

.card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}
```

### Status Badge
```html
<span class="status-badge status-active">ACTIVE</span>
<span class="status-badge status-paused">PAUSED</span>
```

CSS:
```css
.status-badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 12px;
  font-size: 10px;
  font-weight: var(--font-weight-header);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-paused {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}
```

### Form Input
```html
<input class="form-input" type="text" placeholder="Enter..." />
```

CSS:
```css
.form-input {
  width: 100%;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: var(--font-size-body);
  font-family: var(--font-family);
  color: var(--color-text);
  transition: var(--transition-base);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

## 🎯 Design Rules

1. **Always use CSS variables** — Never hardcode colors or spacing
2. **Mobile-first** — Design for mobile first, enhance for desktop
3. **Consistency** — Use the same spacing, colors, and typography
4. **Whitespace** — Use generous padding and margins
5. **Contrast** — Ensure text is readable (WCAG AA minimum)
6. **Touch targets** — Buttons minimum 44px height on mobile
7. **Transitions** — Smooth 0.2s transitions on interactive elements
8. **No shadows** — Use only on hover/modal states
9. **Borders over backgrounds** — Prefer subtle borders to fill colors
10. **Minimal color** — Stick to the defined palette

## 📱 Breakpoints

```css
/* Tablet */
@media (max-width: 1200px) { /* Larger tablets */ }

/* Mobile */
@media (max-width: 768px) { /* Tablets, larger phones */ }

/* Small Mobile */
@media (max-width: 480px) { /* Small phones */ }
```

## ♿ Accessibility Checklist

- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Focus states visible on all interactive elements
- [ ] Semantic HTML (proper headings, lists, labels)
- [ ] Form labels associated with inputs
- [ ] Status indicated by more than color alone
- [ ] Touch targets ≥ 44px on mobile
- [ ] Text legible (minimum 14px body)

## 🚀 Implementation Examples

### Hero Section with Stats
```html
<div class="hero">
  <h1>Title</h1>
  <p>Description</p>
</div>

<div class="metrics-grid">
  <div class="metric">
    <div class="metric-label">Label</div>
    <div class="metric-value">Value</div>
  </div>
</div>
```

### Card Grid
```html
<div class="card-grid">
  <div class="card">
    <h3>Card Title</h3>
    <p>Card description</p>
    <button class="btn primary">Action</button>
  </div>
</div>
```

### Data Table
```html
<table class="settings-table">
  <thead>
    <tr>
      <th>Header</th>
      <th>Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
      <td>Data</td>
    </tr>
  </tbody>
</table>
```

## 📋 Files Using Design System

1. ✅ **master-hub.html** — Command center
2. ✅ **metrics.html** — Metrics dashboard
3. ✅ **calendar.html** — Campaign calendar
4. ✅ **integrations.html** — Integration status
5. ✅ **team-settings.html** — Team management
6. ✅ **visual-strategy.html** — Funnel visualization
7. ✅ **content-library-simple.html** — Asset library

## 🔗 Related Documentation

- See `DESIGN_POLISH_SUMMARY.md` for full redesign details
- Check individual HTML files for complete component examples
- Reference `README.md` for project overview

---

**Last Updated:** April 1, 2026  
**Design Version:** 1.0 (Premium Minimal SaaS)
