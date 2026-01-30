# OpenSplit - Money Splitting PWA

A modern, offline-capable money splitting application built with React, TypeScript, Vite, TanStack Router, and PocketBase.

## Quick Start

### Prerequisites

- Node.js 18+
- PocketBase instance (local or remote)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up PocketBase:**
   - Download PocketBase from [pocketbase.io](https://pocketbase.io)
   - Start the server: `./pocketbase serve`
   - Open admin panel at `http://localhost:8090/_/`

3. **Create PocketBase Collections:**

   Create these collections in PocketBase admin panel with the following fields:

   **Collection: `groups`**
   - `name` (text, required)
   - `description` (text)

   **Collection: `people`**
   - `name` (text, required)
   - `group` (relation to `groups`, required)

   **Collection: `expenses`**
   - `description` (text, required)
   - `amount` (number, required)
   - `paidBy` (relation to `people`, required)
   - `splitAmong` (relation to `people`, required, allow multiple)
   - `date` (date, required)
   - `group` (relation to `groups`, required)

4. **Configure environment:**
   - `.env` - Local development (default: `http://localhost:8090`)
   - `.env.production` - Production URL

5. **Start development:**
   ```bash
   npm run dev
   ```

## Features

✅ **Group Management** - Create and manage expense groups
✅ **People Tracking** - Add people to groups
✅ **Expense Logging** - Record expenses with flexible split options
✅ **Smart Calculations** - Automatic balance calculation
✅ **Settlement Suggestions** - Optimal payment settlements
✅ **PWA Support** - Install as app, works offline
✅ **Responsive Design** - Mobile-first UI
✅ **Type-Safe Routing** - TanStack Router with full TypeScript support

## Project Structure

```
src/
├── routes/            # TanStack Router route definitions
│   ├── __root.tsx     # Root layout with query client & PWA
│   ├── index.tsx      # Home page (groups list)
│   └── group.$id.tsx  # Group detail page
├── pages/             # Page components
│   ├── GroupsPage.tsx
│   └── GroupDetailPage.tsx
├── components/        # Reusable UI components (future)
├── hooks/             # Custom React hooks
│   └── useApi.ts      # PocketBase API hooks
├── lib/               # Utilities & calculations
│   ├── pocketbase.ts  # PocketBase client setup
│   └── calculations.ts # Balance & settlement logic
├── types/             # TypeScript types
│   └── index.ts
├── App.tsx            # Router setup
└── main.tsx           # Entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Routing

Built with **TanStack Router** for type-safe, file-based routing:

- `/` - Groups list and creation
- `/group/:id` - Group details, people, and expenses

Routes are defined in `src/routes/` and automatically typed with full params validation.

## Next Steps

1. **Customize styling** - Edit `src/App.css` and add component styles
2. **Add PWA icons** - Add favicon and PWA icons to `public/` folder
3. **Enable authentication** - Add user accounts with PocketBase auth
4. **Add expense categories** - Extend the expense model
5. **Export/share groups** - Generate shareable links
6. **Statistics** - Add charts and analytics

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite (Rolldown)
- **Routing:** TanStack Router with DevTools
- **Styling:** Tailwind CSS (via utility classes)
- **Data Fetching:** TanStack Query (React Query)
- **Backend:** PocketBase
- **PWA:** vite-plugin-pwa
- **Icons:** Lucide React

## Database Schema Notes

PocketBase automatically creates `id`, `created`, and `updated` fields.

Relationships work bidirectionally, so you can:

- Access expenses from a person
- Query all groups with their expenses
- Expand relations in API calls for better performance

## Browser Support

Works on all modern browsers. PWA features require HTTPS in production.

## Quick Start

### Prerequisites

- Node.js 18+
- PocketBase instance (local or remote)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up PocketBase:**
   - Download PocketBase from [pocketbase.io](https://pocketbase.io)
   - Start the server: `./pocketbase serve`
   - Open admin panel at `http://localhost:8090/_/`

3. **Create PocketBase Collections:**

   Create these collections in PocketBase admin panel with the following fields:

   **Collection: `groups`**
   - `name` (text, required)
   - `description` (text)

   **Collection: `people`**
   - `name` (text, required)
   - `group` (relation to `groups`, required)

   **Collection: `expenses`**
   - `description` (text, required)
   - `amount` (number, required)
   - `paidBy` (relation to `people`, required)
   - `splitAmong` (relation to `people`, required, allow multiple)
   - `date` (date, required)
   - `group` (relation to `groups`, required)

4. **Configure environment:**
   - `.env` - Local development (default: `http://localhost:8090`)
   - `.env.production` - Production URL

5. **Start development:**
   ```bash
   npm run dev
   ```

## Features

✅ **Group Management** - Create and manage expense groups
✅ **People Tracking** - Add people to groups
✅ **Expense Logging** - Record expenses with flexible split options
✅ **Smart Calculations** - Automatic balance calculation
✅ **Settlement Suggestions** - Optimal payment settlements
✅ **PWA Support** - Install as app, works offline
✅ **Responsive Design** - Mobile-first UI

## Project Structure

```
src/
├── components/        # Reusable UI components (future)
├── hooks/             # Custom React hooks (useApi.ts)
├── lib/               # Utilities & calculations
│   ├── pocketbase.ts  # PocketBase client setup
│   └── calculations.ts # Balance & settlement logic
├── pages/             # Page components
│   ├── GroupsPage.tsx
│   └── GroupDetailPage.tsx
├── types/             # TypeScript types
│   └── index.ts
├── App.tsx            # Main app component with routing
└── main.tsx           # Entry point with PWA registration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps

1. **Customize styling** - Edit `src/App.css` and add component styles
2. **Add PWA icons** - Add favicon and PWA icons to `public/` folder
3. **Enable authentication** - Add user accounts with PocketBase auth
4. **Add expense categories** - Extend the expense model
5. **Export/share groups** - Generate shareable links
6. **Statistics** - Add charts and analytics

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (via utility classes)
- **Data Fetching:** TanStack Query (React Query)
- **Backend:** PocketBase
- **PWA:** vite-plugin-pwa
- **Icons:** Lucide React

## Database Schema Notes

PocketBase automatically creates `id`, `created`, and `updated` fields.

Relationships work bidirectionally, so you can:

- Access expenses from a person
- Query all groups with their expenses
- Expand relations in API calls for better performance

## Browser Support

Works on all modern browsers. PWA features require HTTPS in production.
