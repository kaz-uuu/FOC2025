import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Switch } from "@headlessui/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "dayjs";
import Logout from "@/components/Logout";
import { Trash2, Clock, User as UserIcon, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Home from "./Home";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CalculateRaceScores from "@/components/CalculateRaceScores";

function OC() {
  const [logs, setLogs] = useState<any[]>([]);
  const [amazingRaceLogs, setAmazingRaceLogs] = useState<any[]>([]);
  const [raceResults, setRaceResults] = useState<any[]>([]);
  const [isEditingRow, setIsEditingRow] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const navigate = useNavigate();
  const [freeze, setFreeze] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [group, setGroup] = useState<string>();
  const [value, setValue] = useState<number | "">("");
  const [remarks, setRemarks] = useState<string>("");
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  const [day1Game, setDay1Game] = useState<boolean>(false);
  const [day2Game, setDay2Game] = useState<boolean>(false);
  const [day3Game, setDay3Game] = useState<boolean>(false);

  const { auth, isLoading } = useAuth();

  function checkValue(value: number | ""): boolean {
    if (!value) {
      toast.warning(`Input value is invalid`);
      return false;
    }
    if (!Number.isInteger(value)) {
      toast.warning(`Input value is not an integer`);
      return false;
    }
    return true;
  }

  useEffect(() => {
    if (!auth && !isLoading) {
      return navigate("/login");
    }
    if (auth && auth.type != "OC") {
      return navigate("/");
    }
  }, [auth, isLoading]);

  async function confirmDelete(point_id: number) {
    console.log(point_id);
    const { error } = await supabase
      .from("foc_points")
      .delete()
      .eq("id", point_id);
    if (error) {
      console.log(error);
      return;
    }
    toast.success("Record removed");
    getLogs();
  }

  async function confirmDeleteRaceLog(tableName: string, log_id: number) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", log_id);
    if (error) {
      console.log(error);
      return;
    }
    toast.success("Time record removed");
    getAmazingRaceLogs();
  }

  function formatTime(min: number, sec: number, ms: number): string {
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  async function getFreeze() {
    const { data, error } = await supabase
      .from("foc_state")
      .select()
      .eq("name", "freeze");
    if (error) {
      console.log(error);
      return;
    }
    if (!data) {
      return;
    }
    return setFreeze(data[0].state == "true");
  }

  async function getGameState() {
    const { data, error } = await supabase
      .from("foc_state")
      .select()
      .eq("name", "game");
    if (error) {
      console.log(error);
      return;
    }
    if (!data) {
      return;
    }
    console.log(data);
    return data[0].state.split("|");
  }

  function checkGroup(group: string | undefined): boolean {
    if (!group) {
      toast.warning(`No Group selected`);
      return false;
    }
    return true;
  }

  async function submitForm() {
    let groupValidation = checkGroup(group);
    let valueValidation = checkValue(value);
    if (!(groupValidation && valueValidation && auth)) {
      return;
    }
    const { data, error } = await supabase
      .from("foc_points")
      .insert([
        {
          user_id: auth.admin,
          group_id: group,
          game_id: 99,
          point: value,
          remarks: remarks,
        },
      ])
      .select();
    if (error || !data) {
      console.log(error);
      toast.error("Internal Server Error");
      return;
    }
    if (data.length) {
      setRemarks("");
      setValue("");
      getLogs();
      return toast.success("Points Added");
    }
  }

  async function updateGameState() {
    let state = [];
    if (day1Game) {
      state.push("1");
    }
    if (day2Game) {
      state.push("2");
    }
    if (day3Game) {
      state.push("3");
    }
    console.log(state);
    const { data, error } = await supabase
      .from("foc_state")
      .update({
        state: state.join("|"),
      })
      .eq("name", "game")
      .select();
    if (error) {
      console.log(error);
      return;
    }
    if (!data) {
      return;
    }
    console.log(data);
  }

  async function updateFreeze() {
    if (!freeze) {
      // If we're freezing, save the current points directly from foc_points
      const { data: pointsData, error: pointsError } = await supabase
        .from("foc_points")
        .select("*");

      if (pointsError) {
        toast.error("Failed to fetch points data");
        return;
      }

      // Create a map of group_id to total points
      const groupPoints: { [key: string]: number } = {};
      pointsData.forEach((point) => {
        groupPoints[point.group_id] = (groupPoints[point.group_id] || 0) + point.point;
      });

      // Save the current points in the game state
      const { error: gameStateError } = await supabase
        .from("foc_state")
        .update({ state: JSON.stringify(groupPoints) })
        .eq("name", "game");

      if (gameStateError) {
        toast.error("Failed to save game points");
        return;
      }
    }

    const { error } = await supabase
      .from("foc_state")
      .update({ state: (!freeze).toString() })
      .eq("name", "freeze");

    if (error) {
      toast.error("Failed to update freeze state");
      return;
    }

    setFreeze(!freeze);
    toast.success(!freeze ? "Leaderboard frozen" : "Leaderboard unfrozen");
  }

  function getGameName(tableName: string): string {
    switch (tableName) {
      case "balloon_relay":
        return "Balloon Relay";
      case "hula_hoop_pass":
        return "Hula Hoop Pass";
      case "memory_chain":
        return "Memory Chain";
      case "six_legged_pentathlon":
        return "Six Legged Pentathlon";
      case "glass_bridge":
        return "Glass Bridge";
      case "guess_the_picture":
        return "Guess the Picture";
      case "bingo":
        return "Bingo";
      default:
        return tableName;
    }
  }

  async function getAmazingRaceLogs() {
    const tables = [
      "balloon_relay",
      "hula_hoop_pass",
      "memory_chain",
      "six_legged_pentathlon",
      "glass_bridge",
      "guess_the_picture",
      "bingo"
    ];
    
    let allLogs: any[] = [];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*, foc_group(*), foc_user(*)")
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log(`Error fetching from ${table}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        // Add table name to each log entry
        const logsWithTable = data.map(log => ({
          ...log,
          table_name: table
        }));
        allLogs = [...allLogs, ...logsWithTable];
      }
    }
    
    // Sort all logs by creation time
    allLogs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    setAmazingRaceLogs(allLogs);
  }

  // Move getLogs outside the useEffect to make it accessible
  async function getLogs() {
    const { data, error } = await supabase
      .from("foc_points")
      .select("*, foc_user(*), foc_group(*), foc_game(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }
    if (!data) {
      return;
    }
    const groups = await getGroups();
    setLogs(data);
    setGroups(groups);
    const gameState = await getGameState();
    console.log(gameState);
    if (gameState.includes("1")) {
      console.log("hi");
      setDay1Game(true);
    }
    if (gameState.includes("2")) {
      setDay2Game(true);
    }
    if (gameState.includes("3")) {
      setDay3Game(true);
    }
  }

  useEffect(() => {
    // Set up real-time subscription for both points logs and amazing race logs
    const channel = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "foc_group" },
        (payload) => {
          console.log("Change received!", payload);
          getLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foc_points" },
        (payload) => {
          console.log("Change received!", payload);
          getLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "balloon_relay" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hula_hoop_pass" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memory_chain" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "six_legged_pentathlon" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "glass_bridge" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guess_the_picture" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bingo" },
        (payload) => {
          console.log("Change received!", payload);
          getAmazingRaceLogs();
          return;
        }
      )
      .subscribe();

    // Initial data fetching
    getFreeze();
    getLogs();
    getAmazingRaceLogs();
    
    // Cleanup function
    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function getGroups(): Promise<any[]> {
    const { data, error } = await supabase
      .from("foc_group")
      .select()
      .order("id", { ascending: true });
    if (error) {
      console.log(error);
    }
    if (!data) {
      return [];
    }
    return data;
  }

  useEffect(() => {
    if (day1Game || day2Game || day3Game) updateGameState();
  }, [day1Game, day2Game, day3Game]);

  // Prepare data for the race results table
  function prepareRaceResultsTable() {
    // First, create a map to track the best time for each group-station combination
    const resultsMap = new Map();
    
    amazingRaceLogs.forEach(log => {
      const key = `${log.group_id}-${log.table_name}`;
      const time = (log.minutes * 60) + log.seconds + (log.milliseconds / 100);
      
      if (!resultsMap.has(key) || time < resultsMap.get(key).time) {
        resultsMap.set(key, {
          group_id: log.group_id,
          group_name: log.foc_group?.name || 'Unknown',
          station: getGameName(log.table_name),
          minutes: log.minutes,
          seconds: log.seconds,
          milliseconds: log.milliseconds,
          time_value: time,
          id: log.id,
          table_name: log.table_name
        });
      }
    });
    
    // Convert the map to an array
    return Array.from(resultsMap.values());
  }
  
  // Handle edit form data changes
  const handleEditFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditFormData({
      ...editFormData,
      [name]: name === 'minutes' || name === 'seconds' || name === 'milliseconds' 
        ? Number(value) 
        : value
    });
  };
  
  // Handle edit form submission
  const handleEditFormSubmit = async (index: number) => {
    const log = raceResults[index];
    const tableName = log.table_name;
    
    // Validate the time values
    if (
      editFormData.minutes < 0 || editFormData.minutes > 59 ||
      editFormData.seconds < 0 || editFormData.seconds > 59 ||
      editFormData.milliseconds < 0 || editFormData.milliseconds > 99
    ) {
      toast.error("Invalid time values. Please check your input.");
      return;
    }
    
    const { error } = await supabase
      .from(tableName)
      .update({
        minutes: editFormData.minutes,
        seconds: editFormData.seconds,
        milliseconds: editFormData.milliseconds
      })
      .eq('id', log.id);
      
    if (error) {
      console.log(error);
      toast.error("Failed to update time record");
      return;
    }
    
    toast.success("Time record updated successfully");
    getAmazingRaceLogs();
    setIsEditingRow(null);
  };
  
  // Start editing a row
  const handleEditClick = (index: number) => {
    const log = raceResults[index];
    setEditFormData({
      minutes: log.minutes,
      seconds: log.seconds,
      milliseconds: log.milliseconds
    });
    setIsEditingRow(index);
  };
  
  // Cancel editing
  const handleCancelClick = () => {
    setIsEditingRow(null);
  };

  useEffect(() => {
    // Update the race results table whenever amazingRaceLogs changes
    if (amazingRaceLogs.length > 0) {
      const results = prepareRaceResultsTable();
      setRaceResults(results);
    } else {
      setRaceResults([]);
    }
  }, [amazingRaceLogs]);

  return (
    <div className="w-full max-w-sm mx-auto min-h-[100dvh] px-3 py-5 flex flex-col gap-5">
      <Logout />
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <div className="flex gap-2 flex-col">
            <h1 className="text-xl font-bold">Activate Games</h1>
            <div className="flex items-center space-x-2">
              <Checkbox
                className="data-[state=checked]:bg-purple-800 h-6 w-6 rounded-md"
                id="day1Game"
                checked={day1Game}
                onCheckedChange={(e: boolean) => {
                  setDay1Game(e);
                }}
              />
              <label
                htmlFor="day1Game"
                className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Day 1 Games
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                className="data-[state=checked]:bg-purple-800 h-6 w-6 rounded-md"
                id="day2Game"
                checked={day2Game}
                onCheckedChange={(e: boolean) => {
                  setDay2Game(e);
                }}
              />
              <label
                htmlFor="day2Game"
                className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Day 2 Games
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                className="data-[state=checked]:bg-purple-800 h-6 w-6 rounded-md"
                id="day2Game"
                checked={day3Game}
                onCheckedChange={(e: boolean) => {
                  setDay3Game(e);
                }}
              />
              <label
                htmlFor="day3Game"
                className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Day 3 Games
              </label>
            </div>
            <Switch.Group as="div" className="flex items-center pt-4">
              <Switch
                checked={freeze}
                onChange={(e) => {
                  setFreeze(e);
                  updateFreeze();
                }}
                className={cn(
                  freeze ? "bg-purple-800" : "bg-gray-200",
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    freeze ? "translate-x-5" : "translate-x-0",
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  )}
                />
              </Switch>
              <Switch.Label as="span" className="ml-3 text-sm">
                <span className="font-medium text-gray-900">
                  Freeze Leaderboard
                </span>
              </Switch.Label>
            </Switch.Group>
          </div>
        </div>
        <Separator className="my-2" />
        <Button
          className="bg-purple-800 hover:bg-purple-900 flex items-center justify-center space-x-4 my-2"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          <h1>{showLeaderboard ? "Hide" : "Show"} Leaderboard</h1>
        </Button>
        {showLeaderboard && <Home oc_mode={true} />}
        <Separator className="my-2" />
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-xl">Add/Remove Points</h1>
          <Select
            onValueChange={(value) => {
              if (value) {
                setGroup(value);
              }
            }}
            value={group}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((e) => {
                return (
                  <SelectItem value={e.id} key={"Group" + e.id}>
                    {"Group " + e.id + ": " + e.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Input
            onChange={(e) => {
              let valueString = (e.target as HTMLInputElement).value;
              if (valueString.length == 0) {
                setValue("");
              }
              let value = Number(valueString);
              let valueValidation = checkValue(value);
              if (valueValidation) {
                setValue(value);
              }
            }}
            value={value == "" ? "" : value}
            type="number"
            id="number"
            placeholder="Points Awarded/Deducted"
          />
          <Textarea
            placeholder="Additional Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <Button
          className="mx-auto px-6 bg-purple-800 hover:bg-purple-900 transition-colors mt-2 w-full"
          onClick={() => {
            submitForm();
          }}
        >
          Submit
        </Button>
      </div>

      <Separator className="my-2" />

      {/* Tabs for different log types */}
      <Tabs defaultValue="points" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="points">Points Logs</TabsTrigger>
          <TabsTrigger value="race">Amazing Race Logs</TabsTrigger>
        </TabsList>
        
        {/* Points Logs Tab */}
        <TabsContent value="points">
          <div id="points-logs" className="pb-5 overflow-hidden h-[75dvh]">
            <h1 className="text-xl font-bold pb-2">
              Points Logs
              <span className="ml-4 text-sm italic text-red-600">
                **Score are for games not actual points
              </span>
            </h1>
            <div className="h-full space-y-2 overflow-scroll pb-5">
              {logs.map((e, idx) => {
                return (
                  <div className="flex flex-col min-h-16 bg-white border rounded-lg p-4" key={`log-${idx}`}>
                    <div
                      className="flex flex-col justify-center"
                    >
                      <div className="flex items-start justify-center space-x-4">
                        <div className="flex gap-x-1.5 flex-wrap text-sm w-full">
                          <span className="font-bold text-purple-800 uppercase">
                            {e.foc_user.name}
                          </span>
                          has
                          <span
                            className={cn([
                              e.point >= 0 ? "text-green-600" : "text-red-600",
                              "font-semibold",
                            ])}
                          >
                            {e.point >= 0 ? "awarded" : "penalised"}
                          </span>
                          <span className="font-bold">
                            {"Group " + e.foc_group.id + ": " + e.foc_group.name}
                          </span>
                          <span>for</span>
                          <span className="font-bold text-gray-500">
                            {e.foc_game.name}
                          </span>
                        </div>
                        <span
                          className={cn([
                            "font-bold",
                            e.point >= 0 ? "text-green-600" : "text-red-600",
                          ])}
                        >
                          {(e.point >= 0 ? "+" : "") + e.point}
                        </span>
                      </div>
                    </div>
                    {e.remarks && (
                      <div className="py-4">
                        <span className="text-xs font-bold">
                          Additional Remarks
                        </span>
                        <p className="italic text-xs bg-slate-100 p-2 break-words ">
                          {e.remarks}
                        </p>
                      </div>
                    )}

                    <div className="w-full flex justify-between items-center">
                      <span className="text-xs text-right">
                        {dayjs(e.created_at).format("DD MMM YYYY, hh:mm:ss a")}
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size={"sm"} variant={"ghost"}>
                            <Trash2 className="w-4 aspect-square text-red-600" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will permanently
                              delete the record and remove the data from our
                              servers.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="sm:justify-start">
                            <DialogClose asChild>
                              <Button type="button" variant="secondary">
                                Close
                              </Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button
                                className="bg-red-600 hover:bg-red-700"
                                type="button"
                                onClick={() => confirmDelete(e.id)}
                              >
                                Confirm
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        {/* Amazing Race Logs Tab */}
        <TabsContent value="race">
          <div id="race-logs" className="pb-5 overflow-hidden h-[75dvh]">
            <h1 className="text-xl font-bold pb-2">
              Amazing Race Logs
              <span className="ml-4 text-sm italic text-red-600">
                **Time records for race events
              </span>
            </h1>
            <div className="h-full space-y-2 overflow-scroll pb-5">
              {amazingRaceLogs.length > 0 ? (
                amazingRaceLogs.map((log, idx) => (
                  <div className="flex flex-col min-h-16 bg-white border rounded-lg p-4" key={`raceLog-${idx}`}>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-x-1.5 flex-wrap text-sm w-full">
                          <span className="font-bold">
                            {"Group " + log.foc_group.id + ": " + log.foc_group.name}
                          </span>
                          <span>completed</span>
                          <span className="font-bold text-purple-800">
                            {getGameName(log.table_name)}
                          </span>
                          <span>in</span>
                          <span className="font-bold text-blue-600">
                            {formatTime(log.minutes, log.seconds, log.milliseconds)}
                          </span>
                        </div>
                        <Clock className="w-5 h-5 text-blue-600 ml-2" />
                      </div>
                    </div>
                    
                    <div className="w-full flex justify-between items-center mt-2">
                      <span className="flex items-center gap-1 text-xs">
                        {log.foc_user ? (
                          <>
                            <UserIcon className="w-3 h-3 text-purple-800" />
                            <span className="font-medium text-purple-800">{log.foc_user.name}</span>
                          </>
                        ) : (
                          "Unknown user"
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dayjs(log.created_at).format("DD MMM YYYY, hh:mm:ss a")}
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size={"sm"} variant={"ghost"}>
                            <Trash2 className="w-4 aspect-square text-red-600" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will permanently
                              delete the time record and remove the data from our
                              servers.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="sm:justify-start">
                            <DialogClose asChild>
                              <Button type="button" variant="secondary">
                                Close
                              </Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button
                                className="bg-red-600 hover:bg-red-700"
                                type="button"
                                onClick={() => confirmDeleteRaceLog(log.table_name, log.id)}
                              >
                                Confirm
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 mt-4">No amazing race records available</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Race Results Table Section */}
      <Separator className="my-4" />
      <div>
        <h1 className="text-xl font-bold pb-2">
          Race Results Table
          <span className="ml-4 text-sm italic text-blue-600">
            **Best times for each group-station combination
          </span>
        </h1>
        <div className="overflow-auto max-h-[50dvh] border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Group #</TableHead>
                <TableHead>Group Name</TableHead>
                <TableHead>Balloon Relay</TableHead>
                <TableHead>Hula Hoop Pass</TableHead>
                <TableHead>Memory Chain</TableHead>
                <TableHead>Six Legged Pentathlon</TableHead>
                <TableHead>Glass Bridge</TableHead>
                <TableHead>Guess the Picture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length > 0 ? (
                groups.map((group) => (
                  <TableRow key={`group-${group.id}`}>
                    <TableCell className="font-medium">{group.id}</TableCell>
                    <TableCell>{group.name}</TableCell>
                    {['balloon_relay', 'hula_hoop_pass', 'memory_chain', 'six_legged_pentathlon', 'glass_bridge', 'guess_the_picture'].map((station) => {
                      const result = raceResults.find(r => r.group_id === group.id && r.table_name === station);
                      return (
                        <TableCell key={`${group.id}-${station}`}>
                          {result ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-blue-600 font-medium">
                                {formatTime(result.minutes, result.seconds, result.milliseconds)}
                              </span>
                              <div className="flex space-x-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const index = raceResults.findIndex(r => r.id === result.id);
                                    handleEditClick(index);
                                  }}
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Are you absolutely sure?</DialogTitle>
                                      <DialogDescription>
                                        This action cannot be undone. This will permanently
                                        delete this time record and remove the data from our
                                        servers.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="sm:justify-start">
                                      <DialogClose asChild>
                                        <Button type="button" variant="secondary">
                                          Close
                                        </Button>
                                      </DialogClose>
                                      <DialogClose asChild>
                                        <Button
                                          className="bg-red-600 hover:bg-red-700"
                                          type="button"
                                          onClick={() => confirmDeleteRaceLog(result.table_name, result.id)}
                                        >
                                          Confirm
                                        </Button>
                                      </DialogClose>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                    No race results available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Time Editor Dialog */}
        {isEditingRow !== null && (
          <Dialog open={isEditingRow !== null} onOpenChange={(open) => !open && setIsEditingRow(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Time Record</DialogTitle>
                <DialogDescription>
                  Update the time for this race event.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center gap-2 py-4">
                <Input
                  type="number"
                  name="minutes"
                  min="0"
                  max="59"
                  value={editFormData.minutes}
                  onChange={handleEditFormChange}
                  className="w-20 text-center"
                />
                <span>:</span>
                <Input
                  type="number"
                  name="seconds"
                  min="0"
                  max="59"
                  value={editFormData.seconds}
                  onChange={handleEditFormChange}
                  className="w-20 text-center"
                />
                <span>.</span>
                <Input
                  type="number"
                  name="milliseconds"
                  min="0"
                  max="99"
                  value={editFormData.milliseconds}
                  onChange={handleEditFormChange}
                  className="w-20 text-center"
                />
              </div>
              <DialogFooter className="sm:justify-start">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelClick}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleEditFormSubmit(isEditingRow)}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Calculate Race Scores Section */}
      <Separator className="my-4" />
      <CalculateRaceScores auth={auth} />
    </div>
  );
}

export default OC;
