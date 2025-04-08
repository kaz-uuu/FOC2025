import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { FOC_CONFIG } from "@/config/foc2025";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Logout from "@/components/Logout";

export default function Admin() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<string[]>([]);
  const [freeze, setFreeze] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  
  // Check for OC access
  useEffect(() => {
    if (!auth) {
      navigate("/login");
      return;
    }
    
    if (auth.type !== "OC") {
      navigate("/");
      return;
    }
  }, [auth, navigate]);
  
  // Load state data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await Promise.all([
        getGameState(),
        getFreeze(),
        getGroups(),
      ]);
      setIsLoading(false);
    }
    
    loadData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel("admin-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foc_state" },
        () => {
          getGameState();
          getFreeze();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foc_group" },
        () => {
          getGroups();
        }
      )
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    };
  }, []);
  
  async function getGameState() {
    const { data, error } = await supabase
      .from("foc_state")
      .select()
      .eq("name", "game");
      
    if (error) {
      console.error(error);
      return;
    }
    
    if (!data || data.length === 0) return;
    setGameState(data[0].state.split("|"));
  }
  
  async function getFreeze() {
    const { data, error } = await supabase
      .from("foc_state")
      .select()
      .eq("name", "freeze");
      
    if (error) {
      console.error(error);
      return;
    }
    
    if (!data || data.length === 0) return;
    setFreeze(data[0].state === "true");
  }
  
  async function getGroups() {
    const { data, error } = await supabase
      .from("foc_group")
      .select()
      .order("id", { ascending: true });
      
    if (error) {
      console.error(error);
      return;
    }
    
    if (!data) return;
    setGroups(data);
  }
  
  async function updateGameState(newState: string[]) {
    const { error } = await supabase
      .from("foc_state")
      .update({
        state: newState.join("|"),
        created_at: new Date(),
      })
      .eq("name", "game");
      
    if (error) {
      console.error(error);
      return;
    }
    
    setGameState(newState);
  }
  
  async function updateFreeze(value: boolean) {
    const { error } = await supabase
      .from("foc_state")
      .update({
        state: value ? "true" : "false",
        created_at: new Date(),
      })
      .eq("name", "freeze");
      
    if (error) {
      console.error(error);
      return;
    }
    
    setFreeze(value);
  }
  
  async function resetPoints() {
    if (!confirm("Are you sure you want to reset ALL points? This cannot be undone!")) {
      return;
    }
    
    const { error } = await supabase
      .from("foc_points")
      .delete()
      .not("id", "is", null);
      
    if (error) {
      console.error(error);
      return;
    }
    
    alert("All points have been reset!");
  }
  
  function toggleDay(day: string) {
    const currentState = [...gameState];
    
    if (currentState.includes(day)) {
      // Remove day from active days
      updateGameState(currentState.filter(d => d !== day));
    } else {
      // Add day to active days
      updateGameState([...currentState, day]);
    }
  }
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">FOC 2025 Admin Dashboard</h1>
        <Logout />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">Loading...</div>
      ) : (
        <Tabs defaultValue="game-control">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="game-control">Game Control</TabsTrigger>
            <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="game-control" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Game Days</CardTitle>
                <CardDescription>
                  Control which game days are currently active
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant={gameState.includes("1") ? "default" : "outline"}
                    onClick={() => toggleDay("1")}
                  >
                    Day 1
                  </Button>
                  <Button 
                    variant={gameState.includes("1.5") ? "default" : "outline"}
                    onClick={() => toggleDay("1.5")}
                  >
                    Scavenger Hunt
                  </Button>
                  <Button 
                    variant={gameState.includes("2") ? "default" : "outline"}
                    onClick={() => toggleDay("2")}
                  >
                    Day 2
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Currently active: {gameState.length > 0 ? gameState.join(", ") : "None"}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Scoreboard Freeze</CardTitle>
                <CardDescription>
                  Freeze the scoreboard to hide real-time point updates
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center space-x-4">
                <Switch 
                  checked={freeze} 
                  onCheckedChange={updateFreeze} 
                />
                <span>
                  Scoreboard is currently {freeze ? "frozen" : "live"}
                </span>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="scoreboard" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Scoreboard Management</CardTitle>
                <CardDescription>
                  View and manage points for all groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <h3 className="text-lg font-medium mb-2">Danger Zone</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Reset all points data. This action cannot be undone.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={resetPoints}
                  >
                    Reset All Points
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Manage groups, users, and activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-medium mb-4">Groups ({groups.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {groups.map((group) => (
                    <div key={group.id} className="p-4 border rounded-md">
                      <span className="font-medium">Group {group.id}</span>: {group.name}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <Button onClick={() => navigate("/setup")}>
                    Go to Setup Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 