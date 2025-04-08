# FOC 2025 Setup Guide

This guide explains how to set up and manage the FOC 2025 website.

## 1. Initial Setup

### 1.1 Environment Configuration

1. Create a Supabase project at [https://supabase.com/](https://supabase.com/)
2. Copy the Supabase URL and anon key from your project dashboard
3. Create or update the `.env` file with these credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 1.2 Install Dependencies and Run the Project

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 1.3 Initialize the Database

1. Navigate to `http://localhost:5173/setup` in your browser
2. Click the "Run Setup" button to initialize the database tables

## 2. Customizing for FOC 2025

### 2.1 Update Configuration

Edit the configuration file at `src/config/foc2025.ts` to update:
- Event dates and venue
- Game activities and scoring rules
- Default states

### 2.2 Modify the Database Setup Script

Edit the setup script at `src/utils/setupDatabase.ts` to:
- Configure groups for this year's FOC
- Set up OC, GL, and GP accounts
- Define activities and games

## 3. During the Event

### 3.1 Admin Dashboard

Access the admin dashboard at `http://localhost:5173/admin` to:
- Toggle active game days
- Freeze/unfreeze the scoreboard
- Reset points if needed
- Monitor groups and data

### 3.2 User Access

- **OCs**: Access `/OC` and `/admin` routes
- **GLs**: Access `/GL` route
- **GPs**: Access `/GP` route
- **Public**: Access home page for leaderboard

## 4. Database Structure

- **foc_user**: User accounts (OCs, GLs, GPs)
- **foc_group**: Groups participating in FOC
- **foc_game**: Games and activities
- **foc_points**: Points awarded to groups
- **foc_state**: Application state (active games, freeze)

## 5. Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. The application can be deployed to:
   - Vercel (recommended)
   - Netlify
   - Any static hosting service

## 6. Technical Support

For issues or questions:
1. Check existing code in the repository
2. Refer to this setup guide
3. Contact the original development team 