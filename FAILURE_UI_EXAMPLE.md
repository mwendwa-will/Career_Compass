# CV Analysis Failure Screen - UI Example

## Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Career Compass                            │
│                          Navigation                              │
└─────────────────────────────────────────────────────────────────┘

                            ╭─────╮
                            │  ?  │   <-- Icon (FileQuestion/AlertCircle)
                            │ 📄  │       in colored circle
                            ╰─────╯


                      We need your help

          We couldn't extract readable text from your CV.


┌─────────────────────────────────────────────────────────────────┐
│  →  What to do next                                             │
│                                                                  │
│     This usually happens with scanned PDFs or image-based       │
│     documents. Try converting your CV to a text-based PDF.      │
└─────────────────────────────────────────────────────────────────┘


        QUICK FIXES

    ╭─────────────────────────────────────────────────────────╮
    │ ① Export your CV from Word/Google Docs as PDF          │
    ╰─────────────────────────────────────────────────────────╯

    ╭─────────────────────────────────────────────────────────╮
    │ ② Use an online PDF converter                          │
    ╰─────────────────────────────────────────────────────────╯

    ╭─────────────────────────────────────────────────────────╮
    │ ③ Ensure 'Save as text-based PDF' is enabled           │
    ╰─────────────────────────────────────────────────────────╯


          ┌────────────────────┐  ┌─────────────────────────┐
          │  🔄 Try Another    │  │  ✏️ Enter Skills        │
          │      File          │  │     Manually            │
          └────────────────────┘  └─────────────────────────┘


       Having trouble? Most CVs work best as single-column,
            text-based PDFs exported from Word or Google Docs.
```

## Color Scheme by Failure Type

| Failure Code | Icon Color | Theme |
|--------------|-----------|--------|
| IMAGE_ONLY | Orange | Warning |
| UNSUPPORTED_FORMAT | Orange | Warning |
| MISSING_SECTIONS | Yellow | Caution |
| NON_STANDARD_LAYOUT | Blue | Info |
| LOW_CONFIDENCE | Yellow | Caution |
| FILE_SIZE_INVALID | Red | Error |
| CORRUPTED_FILE | Red | Error |
| PASSWORD_PROTECTED | Orange | Warning |

## Component Breakdown

### Header Section
- **Icon**: Large circular badge (80x80px) with relevant icon
- **Title**: "We need your help" (48px, bold, display font)
- **Message**: User-friendly explanation (18px, muted color)

### Actionable Card
- **Bordered card** with subtle shadow
- **Arrow icon** (→) to draw attention
- **Section title**: "What to do next"
- **Instructions**: Clear, specific guidance

### Quick Fixes List
- **Numbered steps** (①②③) for easy scanning
- **Card layout** for each fix
- **Hover states** for interactivity
- **Sequential animations** for visual appeal

### Action Buttons
- **Primary**: "Try Another File" (with refresh icon)
- **Secondary**: "Enter Skills Manually" (with edit icon)
- Large, touch-friendly size (44px height)
- Clear icons for quick recognition

### Footer
- **Helper text** in small, muted font
- Provides general guidance without overwhelming

## Animation Flow

1. **Initial Load** (0-0.5s)
   - Icon fades in from below (+20px)
   - Opacity: 0 → 1

2. **Content Reveal** (0.3-0.8s)
   - Title and message slide up
   - Smooth easing for professional feel

3. **Card Entrance** (0.5-1.0s)
   - Actionable card scales in
   - Subtle bounce effect

4. **Quick Fixes** (0.7-1.3s)
   - Each fix slides in from left
   - Staggered delay (100ms between items)
   - Creates waterfall effect

5. **Buttons** (1.0-1.5s)
   - Fade in last to prevent premature clicks
   - Hover states: scale(1.02) on interaction

## Responsive Behavior

### Mobile (<768px)
- Single column layout
- Full-width cards
- Stacked buttons (vertical)
- Larger touch targets

### Tablet (768px-1024px)
- Centered content, max-width: 600px
- Side-by-side buttons
- Increased padding

### Desktop (>1024px)
- Centered content, max-width: 800px
- Generous whitespace
- Subtle backdrop blur effects
- Floating card appearance

## Accessibility

- **ARIA labels** on all interactive elements
- **Focus indicators** on buttons
- **Color contrast** meets WCAG AA standards
- **Keyboard navigation** fully supported
- **Screen reader** friendly structure
- **Motion respects** `prefers-reduced-motion`

## Tone of Voice

The copy follows these principles:
- **Empathetic**: "We need your help" vs "Error: Parse failed"
- **Specific**: "Convert to text-based PDF" vs "Fix your file"
- **Actionable**: "Export from Word as PDF" vs "Use different format"
- **Non-blaming**: "The file has..." vs "You uploaded wrong..."
- **Professional yet warm**: Like a helpful senior recruiter
