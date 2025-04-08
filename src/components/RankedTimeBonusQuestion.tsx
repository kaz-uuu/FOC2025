import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "@/hooks/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

function RankedTimeBonusQuestion({
  groups,
  auth,
  activity_id,
}: {
  groups: any[];
  auth: User | null;
  activity_id: number;
}) {
  const [group, setGroup] = useState<string>();
  const [timeInput, setTimeInput] = useState<string>("");
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [milliseconds, setMilliseconds] = useState<number>(0);
  const [isValidTime, setIsValidTime] = useState<boolean>(false);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [bonusPoints, setBonusPoints] = useState<number | "">("");

  function checkGroup(group: string | undefined): boolean {
    if (!group) {
      toast.warning(`No Group selected`);
      return false;
    }
    return true;
  }

  function validateTime(min: number, sec: number, ms: number): boolean {
    if (isNaN(min) || isNaN(sec) || isNaN(ms)) {
      return false;
    }
    
    if (!Number.isInteger(min) || !Number.isInteger(sec) || !Number.isInteger(ms)) {
      return false;
    }
    
    if (min < 0 || min > 59) {
      return false;
    }
    if (sec < 0 || sec > 59) {
      return false;
    }
    if (ms < 0 || ms > 99) {
      return false;
    }
    return true;
  }

  function validateBonusPoints(points: number | ""): boolean {
    if (points === "") {
      return false;
    }
    
    if (!Number.isInteger(points)) {
      return false;
    }
    
    return true;
  }

  function handleTimeInput(value: string) {
    setTimeInput(value);
    
    // Validate the time format: minutes:seconds.hundredths
    const timeRegex = /^(\d{1,2}):(\d{2})\.(\d{2})$/;
    const match = value.match(timeRegex);
    
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      
      const isValid = validateTime(min, sec, ms);
      setIsValidTime(isValid);
      
      if (isValid) {
        setMinutes(min);
        setSeconds(sec);
        setMilliseconds(ms);
      }
    } else {
      setIsValidTime(false);
    }
  }

  function handleBonusPointsInput(value: string) {
    if (value === "") {
      setBonusPoints("");
      return;
    }
    
    const numValue = parseInt(value, 10);
    
    if (!isNaN(numValue) && Number.isInteger(numValue)) {
      setBonusPoints(numValue);
    }
  }

  function formatTime(min: number, sec: number, ms: number): string {
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  async function getTimeLogs() {
    const tableName = getTableName(activity_id);
    const { data, error } = await supabase
      .from(tableName)
      .select("*, foc_group(*), foc_user(*)")
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log(error);
      return;
    }
    
    if (data) {
      setTimeLogs(data);
    }
  }

  async function submitForm() {
    let groupValidation = checkGroup(group);
    
    if (!(groupValidation && isValidTime && auth)) {
      if (!isValidTime) {
        toast.error("Invalid time format. Please use MM:SS.HH format (e.g., 01:23.45)");
      }
      return;
    }
    
    const tableName = getTableName(activity_id);
    
    // Check if a record already exists for this group-user combination
    const { data: existingData, error: existingError } = await supabase
      .from(tableName)
      .select("group_id, user_id")
      .eq("group_id", group)
      .eq("user_id", auth.admin)
      .limit(1);
      
    if (existingError) {
      console.log(existingError);
      toast.error("Error checking existing records");
      return;
    }
    
    let operation;
    if (existingData && existingData.length > 0) {
      // Update existing record
      operation = supabase
        .from(tableName)
        .update({
          minutes: minutes,
          seconds: seconds,
          milliseconds: milliseconds,
        })
        .eq("group_id", group)
        .eq("user_id", auth.admin);
    } else {
      // Insert new record
      operation = supabase
        .from(tableName)
        .insert([
          {
            group_id: group,
            user_id: auth.admin,
            minutes: minutes,
            seconds: seconds,
            milliseconds: milliseconds,
          },
        ]);
    }
    
    const { data, error } = await operation.select();
    
    if (error) {
      console.log(error);
      toast.error("Internal Server Error");
      return;
    }
    
    // Add bonus points if provided
    if (validateBonusPoints(bonusPoints) && auth) {
      const { data: pointsData, error: pointsError } = await supabase
        .from("foc_points")
        .insert([
          {
            user_id: auth.admin,
            group_id: group,
            game_id: activity_id,
            point: bonusPoints,
            remarks: `Bonus points for ${getGameName(activity_id)}`,
          },
        ])
        .select();
        
      if (pointsError) {
        console.log(pointsError);
        toast.error("Failed to add bonus points");
      } else if (pointsData && pointsData.length) {
        toast.success("Bonus points added successfully");
      }
    }
    
    if (data && data.length) {
      setTimeInput("");
      setMinutes(0);
      setSeconds(0);
      setMilliseconds(0);
      setIsValidTime(false);
      setBonusPoints("");
      getTimeLogs(); // Refresh logs after submission
      return toast.success("Time Recorded");
    }
  }

  function getTableName(activity_id: number): string {
    switch (activity_id) {
      case 1:
        return "balloon_relay";
      case 2:
        return "hula_hoop_pass";
      case 3:
        return "memory_chain";
      case 4:
        return "six_legged_pentathlon";
      case 5:
        return "glass_bridge";
      case 6:
        return "guess_the_picture";
      case 17:
        return "bingo";
      default:
        throw new Error("Invalid activity ID");
    }
  }

  function getGameName(activity_id: number): string {
    switch (activity_id) {
      case 1:
        return "Balloon Relay";
      case 2:
        return "Hula Hoop Pass";
      case 3:
        return "Memory Chain";
      case 4:
        return "Six Legged Pentathlon";
      case 5:
        return "Glass Bridge";
      case 6:
        return "Guess the Picture";
      case 17:
        return "Bingo";
      default:
        return "Unknown Game";
    }
  }

  useEffect(() => {
    // Set up real-time subscription to the table
    const tableName = getTableName(activity_id);
    
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          console.log('Change received:', payload);
          getTimeLogs();
        }
      )
      .subscribe();
    
    // Initial fetch
    getTimeLogs();
    
    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [activity_id]);

  return (
    <>
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
      
      <div className="space-y-2">
        <label htmlFor="time-input" className="block text-sm font-medium text-gray-700">
          Time (Format: MM:SS.HH - Minutes:Seconds.Hundredths)
        </label>
        <Input
          id="time-input"
          type="text"
          placeholder="MM:SS.HH (e.g., 01:23.45)"
          value={timeInput}
          onChange={(e) => handleTimeInput(e.target.value)}
          className={!isValidTime && timeInput ? "border-red-500" : ""}
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="bonus-points" className="block text-sm font-medium text-gray-700">
          Bonus Points (Optional)
        </label>
        <Input
          id="bonus-points"
          type="number"
          placeholder="Enter bonus points"
          value={bonusPoints === "" ? "" : bonusPoints}
          onChange={(e) => handleBonusPointsInput(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Enter an integer value to award bonus points to this group
        </p>
      </div>
      
      <Button className="mx-auto px-6 bg-purple-800 hover:bg-purple-900 w-full" onClick={submitForm}>
        Submit Time & Bonus
      </Button>

      {/* Amazing Race Logs */}
      <div id="time-logs" className="pb-5 overflow-hidden mt-6 h-[200px]">
        <h1 className="text-xl font-bold pb-2">
          {getGameName(activity_id)} Time Records
        </h1>
        <div className="h-full space-y-0.5 overflow-scroll pb-5">
          {timeLogs.length > 0 ? (
            timeLogs.map((log, idx) => (
              <div className="flex flex-col min-h-16 bg-white border rounded-lg p-4" key={`timeLog-${idx}`}>
                <div className="flex flex-col justify-center">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-x-1.5 flex-wrap text-sm">
                      <span className="font-bold">
                        {"Group " + log.foc_group.id + ": " + log.foc_group.name}
                      </span>
                      <span>completed in</span>
                      <span className="font-bold text-purple-800">
                        {formatTime(log.minutes, log.seconds, log.milliseconds)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full flex justify-between text-xs text-gray-500 mt-1">
                  <span>
                    {log.foc_user ? (
                      <span className="font-medium text-purple-800">{log.foc_user.name}</span>
                    ) : (
                      "Unknown user"
                    )}
                  </span>
                  <span>
                    {dayjs(log.created_at).format("DD MMM YYYY, hh:mm:ss a")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 mt-4">No time records available</div>
          )}
        </div>
      </div>
    </>
  );
}

export default RankedTimeBonusQuestion; 