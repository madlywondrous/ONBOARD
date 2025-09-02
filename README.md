# ONBOARD - Formula 1 Dashboard

A modern, dark-themed Formula 1 race calendar dashboard built with Next.js and TypeScript.

## Features

- **Interactive Sidebar**: Collapsible sidebar with smart open/close mechanics
  - Opens instantly when hovering at the left edge
  - Closes when cursor leaves (only if opened by cursor)
  - Manual toggle button with custom icon
  - Maintains state when opened manually

- **Dashboard Layout**: 
  - Compact top bar with status indicators
  - Navigation cards for different sections
  - Live session indicator
  - Formula 1 themed UI

- **Typography**: Geist Mono font for a modern, technical aesthetic

## Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React + custom icons
- **Font**: Geist Mono

## Project Structure

```
app/
├── layout.tsx          # Global layout with Geist Mono font
├── page.tsx           # Main dashboard with sidebar and navigation
├── globals.css        # Global styles
└── [sections]/        # Dashboard sections (agent-network, command-center, etc.)

components/
├── ui/               # shadcn/ui components
└── theme-provider.tsx

public/
└── icons/
    └── sidebar.png   # Custom sidebar toggle icon
```

## Sidebar Mechanics

The sidebar features advanced open/close logic:

1. **Cursor Hover**: Hovering near the left edge (first 20px) instantly opens the sidebar
2. **Auto-Close**: Sidebar closes when cursor leaves, but only if it was opened by cursor hover
3. **Manual Toggle**: Button toggle maintains sidebar state and prevents auto-close
4. **Smart State**: Tracks how the sidebar was opened to determine appropriate close behavior

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Design Philosophy

- **Dark Theme**: Professional, easy on the eyes for extended use
- **Compact UI**: Efficient use of space while maintaining readability
- **Interactive Elements**: Smooth transitions and responsive design
- **Formula 1 Themed**: Racing-inspired aesthetics and terminology
