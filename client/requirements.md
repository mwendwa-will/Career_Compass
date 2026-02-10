## Packages
framer-motion | Essential for the smooth state transitions and entry animations requested
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes safely

## Notes
Tailwind Config: Extended font families 'sans' (Inter/DM Sans) and 'display' (Playfair Display/Libre Baskerville) needed for editorial look.
API: POST /api/analyze/upload expects multipart/form-data.
State Management: Analysis results need to be passed from Home to Dashboard. Using simple route state or React Context.
