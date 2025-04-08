import { supabase } from "./supabase";
import { FOC_CONFIG } from "@/config/foc2025";

/**
 * Script to set up or reset database tables for FOC 2025
 * Run this once to initialize your database structure
 */
export async function setupDatabase() {
  try {
    console.log("Starting database setup for FOC 2025...");
    
    // Test Supabase connection first
    console.log("Testing Supabase connection...");
    let connectionError;
    try {
      const { error } = await supabase.from('foc_user').select('*').limit(1);
      connectionError = error;
    } catch (e) {
      console.error("Connection test failed:", e);
      connectionError = e as { message?: string };
    }
    
    if (connectionError) {
      console.error("Supabase connection error:", connectionError);
      const errorMessage = connectionError.message || "Unknown error";
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        console.log("Tables don't exist yet. Will attempt to create them.");
        await createTables();
      } else {
        return { success: false, error: `Connection error: ${errorMessage}` };
      }
    } else {
      console.log("Connection successful, proceeding with setup");
    }
    
    // Reset tables (optional - be careful with this in production)
    // await resetAllTables();
    
    // Create or update tables
    await setupUserTable();
    await setupGroupTable();
    await setupGameTable();
    await setupPointsTable();
    await setupStateTable();
    
    console.log("Database setup complete!");
    return { success: true };
  } catch (error: any) {
    console.error("Database setup failed:", error);
    return { success: false, error: JSON.stringify(error, Object.getOwnPropertyNames(error)) };
  }
}

// Create all tables if they don't exist
async function createTables() {
  console.log("Creating tables...");
  
  try {
    // Create user table
    const createUserTable = await supabase.rpc('create_foc_user_table');
    console.log("User table creation result:", JSON.stringify(createUserTable, null, 2));
    
    // Create group table
    const createGroupTable = await supabase.rpc('create_foc_group_table');
    console.log("Group table creation result:", JSON.stringify(createGroupTable, null, 2));
    
    // Create game table
    const createGameTable = await supabase.rpc('create_foc_game_table');
    console.log("Game table creation result:", JSON.stringify(createGameTable, null, 2));
    
    // Create points table
    const createPointsTable = await supabase.rpc('create_foc_points_table');
    console.log("Points table creation result:", JSON.stringify(createPointsTable, null, 2));
    
    // Create state table
    const createStateTable = await supabase.rpc('create_foc_state_table');
    console.log("State table creation result:", JSON.stringify(createStateTable, null, 2));
    
    // Create stored procedures for table creation if they don't exist
    await createStoredProcedures();
    
    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    console.log("Will try direct SQL method...");
    await createTablesDirectly();
  }
}

// Create stored procedures
async function createStoredProcedures() {
  // This function should be run in Supabase SQL editor
  console.log("Please create the following stored procedures in your Supabase SQL editor:");
  console.log(`
-- Create user table function
create or replace function create_foc_user_table()
returns void as $$
begin
  create table if not exists foc_user (
    admin text primary key,
    name text not null,
    type text not null,
    password text not null,
    created_at timestamp with time zone default now()
  );
end;
$$ language plpgsql;

-- Create group table function
create or replace function create_foc_group_table()
returns void as $$
begin
  create table if not exists foc_group (
    id integer primary key,
    name text not null,
    created_at timestamp with time zone default now()
  );
end;
$$ language plpgsql;

-- Create game table function
create or replace function create_foc_game_table()
returns void as $$
begin
  create table if not exists foc_game (
    id integer primary key,
    name text not null,
    day text not null,
    created_at timestamp with time zone default now()
  );
end;
$$ language plpgsql;

-- Create points table function
create or replace function create_foc_points_table()
returns void as $$
begin
  create table if not exists foc_points (
    id serial primary key,
    user text references foc_user(admin),
    group text references foc_group(id),
    game integer references foc_game(id),
    point integer not null,
    remarks text,
    created_at timestamp with time zone default now()
  );
end;
$$ language plpgsql;

-- Create state table function
create or replace function create_foc_state_table()
returns void as $$
begin
  create table if not exists foc_state (
    name text primary key,
    state text not null,
    created_at timestamp with time zone default now()
  );
end;
$$ language plpgsql;
  `);
}

// Direct table creation
async function createTablesDirectly() {
  console.log("Attempting to create tables directly...");
  
  try {
    // User table
    const userTableResult = await supabase.rpc('execute_sql', {
      sql_query: `
        create table if not exists foc_user (
          admin text primary key,
          name text not null,
          type text not null,
          password text not null,
          created_at timestamp with time zone default now()
        )
      `
    });
    console.log("User table creation:", JSON.stringify(userTableResult, null, 2));
    
    // Group table
    await supabase.rpc('execute_sql', {
      sql_query: `
        create table if not exists foc_group (
          id integer primary key,
          name text not null,
          created_at timestamp with time zone default now()
        )
      `
    });
    
    // Game table
    await supabase.rpc('execute_sql', {
      sql_query: `
        create table if not exists foc_game (
          id integer primary key,
          name text not null,
          day text not null,
          created_at timestamp with time zone default now()
        )
      `
    });
    
    // Points table
    await supabase.rpc('execute_sql', {
      sql_query: `
        create table if not exists foc_points (
          id serial primary key,
          user text references foc_user(admin),
          group text references foc_group(id),
          game integer references foc_game(id),
          point integer not null,
          remarks text,
          created_at timestamp with time zone default now()
        )
      `
    });
    
    // State table
    await supabase.rpc('execute_sql', {
      sql_query: `
        create table if not exists foc_state (
          name text primary key,
          state text not null,
          created_at timestamp with time zone default now()
        )
      `
    });
    
    console.log("Direct table creation completed");
  } catch (error) {
    console.error("Direct table creation failed:", error);
    console.log("You will need to create the tables manually in the Supabase dashboard");
  }
}

// Function to reset all tables - USE WITH CAUTION
async function resetAllTables() {
  console.log("Resetting all tables...");
  
  try {
    // Delete all data from tables
    await supabase.from("foc_points").delete().not("id", "is", null);
    await supabase.from("foc_game").delete().not("id", "is", null);
    await supabase.from("foc_group").delete().not("id", "is", null);
    await supabase.from("foc_user").delete().not("admin", "is", null);
    await supabase.from("foc_state").delete().not("name", "is", null);
    
    console.log("All tables reset.");
  } catch (error) {
    console.error("Error resetting tables:", error);
    throw error;
  }
}

// Set up user table and initial users
async function setupUserTable() {
  try {
    console.log("Setting up user table...");
    
    // Define the OC user accounts
    const users = [
      {
        admin: "OC001",
        name: "Admin User",
        type: "OC",
        password: "password123" // Use a secure password in production
      },
      // Add more users as needed
    ];
    
    // Insert users
    const { error } = await supabase.from("foc_user").upsert(users);
    if (error) {
      console.error("Error setting up users:", error);
      throw error;
    }
    
    console.log("User table set up successfully");
  } catch (error) {
    console.error("User table setup failed:", error);
    throw error;
  }
}

// Set up group table with this year's groups
async function setupGroupTable() {
  try {
    console.log("Setting up group table...");
    
    // Define the groups for this year
    const groups = [
      { id: 1, name: "Group 1" },
      { id: 2, name: "Group 2" },
      { id: 3, name: "Group 3" },
      { id: 4, name: "Group 4" },
      { id: 5, name: "Group 5" },
      // Add more groups as needed
    ];
    
    // Insert groups
    const { error } = await supabase.from("foc_group").upsert(groups);
    if (error) {
      console.error("Error setting up groups:", error);
      throw error;
    }
    
    console.log("Group table set up successfully");
  } catch (error) {
    console.error("Group table setup failed:", error);
    throw error;
  }
}

// Set up game table with this year's activities
async function setupGameTable() {
  try {
    console.log("Setting up game table...");
    
    // Get game configurations from FOC_CONFIG
    const allGameIds = [
      ...FOC_CONFIG.games.day1,
      ...FOC_CONFIG.games.scavenger,
      ...FOC_CONFIG.games.day2
    ];
    
    // Define the games/activities for this year
    const games = [
      { id: 1, name: "Opening Ceremony", day: "1" },
      { id: 2, name: "Ice Breakers", day: "1" },
      { id: 3, name: "Team Building 1", day: "1" },
      { id: 4, name: "Team Building 2", day: "1" },
      { id: 5, name: "Scavenger Hunt", day: "1.5" },
      { id: 6, name: "Main Event 1", day: "2" },
      { id: 7, name: "Main Event 2", day: "2" },
      { id: 8, name: "Closing Ceremony", day: "2" },
      // Add more games as needed
    ];
    
    // Insert games
    const { error } = await supabase.from("foc_game").upsert(games);
    if (error) {
      console.error("Error setting up games:", error);
      throw error;
    }
    
    console.log("Game table set up successfully");
  } catch (error) {
    console.error("Game table setup failed:", error);
    throw error;
  }
}

// Set up points table (this table will be empty initially)
async function setupPointsTable() {
  console.log("Points table ready");
}

// Set up state table with initial states
async function setupStateTable() {
  try {
    console.log("Setting up state table...");
    
    // Use default states from configuration
    const states = [
      { name: "game", state: FOC_CONFIG.defaultState.game },
      { name: "freeze", state: FOC_CONFIG.defaultState.freeze }
    ];
    
    // Insert states
    const { error } = await supabase.from("foc_state").upsert(states);
    if (error) {
      console.error("Error setting up states:", error);
      throw error;
    }
    
    console.log("State table set up successfully");
  } catch (error) {
    console.error("State table setup failed:", error);
    throw error;
  }
}

// Optional: Create a function to run this setup
export async function runDatabaseSetup() {
  console.log("Starting database setup...");
  const result = await setupDatabase();
  console.log("Setup result:", result);
  return result;
} 