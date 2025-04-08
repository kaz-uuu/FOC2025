import { useState } from "react";
import { runDatabaseSetup } from "@/utils/setupDatabase";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Setup() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: any } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleSetup = async () => {
    if (!confirm("This will set up the database for FOC 2025. Continue?")) {
      return;
    }
    
    setIsLoading(true);
    setLogs(["Starting database setup..."]);
    
    // Capture console logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args) => {
      originalConsoleLog(...args);
      setLogs(prevLogs => [...prevLogs, args.join(" ")]);
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      setLogs(prevLogs => [...prevLogs, `ERROR: ${args.join(" ")}`]);
    };
    
    try {
      const setupResult = await runDatabaseSetup();
      setResult(setupResult);
    } catch (error) {
      setResult({ success: false, error });
      setLogs(prevLogs => [...prevLogs, `EXCEPTION: ${error}`]);
    } finally {
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      setIsLoading(false);
    }
  };

  // Check if Supabase credentials are configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">FOC 2025 - Database Setup</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <p className="mb-4">
          This page will help you set up the database for FOC 2025. It will:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-1">
          <li>Create or update the user accounts for OCs, GLs, and GPs</li>
          <li>Set up the groups for this year</li>
          <li>Configure the games and activities</li>
          <li>Initialize the state table</li>
        </ul>
        <p className="font-medium text-amber-600">
          Warning: If you run this on an existing database, it will modify data according to the setup script.
        </p>
      </div>

      <Separator className="my-6" />
      
      {!isSupabaseConfigured && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Supabase not configured</AlertTitle>
          <AlertDescription>
            Your Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
            in your .env file.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col items-start space-y-4">
        <Button 
          onClick={handleSetup} 
          disabled={isLoading || !isSupabaseConfigured}
          className="w-48"
        >
          {isLoading ? "Setting up..." : "Run Setup"}
        </Button>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <AlertTitle>
              {result.success ? "Setup Successful" : "Setup Failed"}
            </AlertTitle>
            <AlertDescription>
              {result.success 
                ? "Database has been successfully set up for FOC 2025." 
                : `Error: ${JSON.stringify(result.error)}`
              }
            </AlertDescription>
          </Alert>
        )}
        
        {logs.length > 0 && (
          <Card className="w-full mt-6">
            <CardHeader>
              <CardTitle>Setup Logs</CardTitle>
              <CardDescription>
                Detailed logs to help diagnose any issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-white p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
                {logs.map((log, i) => (
                  <div key={i} className={log.startsWith('ERROR') ? 'text-red-400' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-4">Manual Setup Instructions</h3>
          <p className="mb-4">
            If automatic setup fails, you can create the necessary tables manually in your Supabase dashboard SQL editor:
          </p>
          <div className="bg-gray-100 p-4 rounded-md font-mono text-sm overflow-auto max-h-96 mb-6">
            {`
-- Create tables
create table if not exists foc_user (
  admin text primary key,
  name text not null,
  type text not null,
  password text not null,
  created_at timestamp with time zone default now()
);

create table if not exists foc_group (
  id integer primary key,
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists foc_game (
  id integer primary key,
  name text not null,
  day text not null,
  created_at timestamp with time zone default now()
);

create table if not exists foc_points (
  id serial primary key,
  user text references foc_user(admin),
  group text references foc_group(id),
  game integer references foc_game(id),
  point integer not null,
  remarks text,
  created_at timestamp with time zone default now()
);

create table if not exists foc_state (
  name text primary key,
  state text not null,
  created_at timestamp with time zone default now()
);

-- Add OC User
insert into foc_user (admin, name, type, password)
values ('OC001', 'Admin User', 'OC', 'password123')
on conflict (admin) do nothing;

-- Initial state
insert into foc_state (name, state)
values 
  ('game', '1'),
  ('freeze', 'false')
on conflict (name) do nothing;
            `}
          </div>
        </div>
      </div>
    </div>
  );
} 