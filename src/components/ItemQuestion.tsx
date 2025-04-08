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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

function ItemQuestion({
  groups,
  auth,
  activity_id,
  min = -100,
  max = 100,
}: {
  groups: any[];
  auth: User | null;
  activity_id: number;
  min?: number;
  max?: number;
}) {
  const [group, setGroup] = useState<string>();
  const [value, setValue] = useState<number | "">("");
  const [pointType, setPointType] = useState<"add" | "subtract">("add");
  const [remarks, setRemarks] = useState<string>("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch logs for the selected activity
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("foc_points")
        .select("*, foc_group(name), foc_user(name)")
        .eq("game_id", activity_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching logs:", error);
        toast.error("Failed to load activity logs");
        return;
      }

      setLogs(data || []);
    } catch (e) {
      console.error("Error fetching logs:", e);
      toast.error("Failed to load activity logs");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch logs when component mounts or activity_id changes
  useEffect(() => {
    fetchLogs();
    
    // Set up real-time subscription for the activity
    const channel = supabase
      .channel(`activity-${activity_id}-changes`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "foc_points",
          filter: `game_id=eq.${activity_id}`
        },
        (payload) => {
          console.log("Change received!", payload);
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activity_id]);

  function checkValue(value: number | ""): boolean {
    if (!value) {
      toast.warning(`Input value is invalid`);
      return false;
    }
    if (value < 0) {
      toast.warning(`Input value cannot be negative`);
      return false;
    }
    if (value > max) {
      toast.warning(`Input value is higher than ${max}`);
      return false;
    }
    if (!Number.isInteger(value)) {
      toast.warning(`Input value is not an integer`);
      return false;
    }
    return true;
  }

  function checkGroup(group: string | undefined): boolean {
    if (!group) {
      toast.warning(`No Group selected`);
      return false;
    }
    return true;
  }

  function checkRemarks(remarks: string): boolean {
    if (!remarks.trim()) {
      toast.warning(`Please provide a reason for the points`);
      return false;
    }
    return true;
  }

  async function submitForm() {
    let groupValidation = checkGroup(group);
    let valueValidation = checkValue(value);
    let remarksValidation = checkRemarks(remarks);
    
    if (!(groupValidation && valueValidation && remarksValidation && auth)) {
      return;
    }
    
    // Calculate the final point value based on whether we're adding or subtracting
    const finalPointValue = pointType === "add" ? value : -value;
    
    const { data, error } = await supabase
      .from("foc_points")
      .insert([
        {
          user_id: auth.admin,
          group_id: group,
          game_id: activity_id,
          point: finalPointValue,
          remarks: remarks,
        },
      ])
      .select();
      
    if (error || !data) {
      console.log(error);
      toast.error("Failed to add points");
      return;
    }
    
    if (data.length) {
      setValue("");
      setRemarks("");
      return toast.success(`Points ${pointType === "add" ? "added" : "subtracted"} successfully`);
    }
  }

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="flex flex-col space-y-4 w-full">
        <Tabs defaultValue="add" className="w-full" onValueChange={(value) => setPointType(value as "add" | "subtract")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add" className="bg-green-100 data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Add Points
            </TabsTrigger>
            <TabsTrigger value="subtract" className="bg-red-100 data-[state=active]:bg-red-500 data-[state=active]:text-white">
              Subtract Points
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="space-y-2">
          <Label htmlFor="group">Select Group</Label>
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
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="points">Number of Points</Label>
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
            id="points"
            placeholder="Enter number of points"
            min={0}
            max={max}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="remarks">Reason</Label>
          <Input
            onChange={(e) => setRemarks(e.target.value)}
            value={remarks}
            type="text"
            id="remarks"
            placeholder="Enter reason for points"
          />
        </div>
        
        <Button 
          className={`mx-auto px-6 w-full ${
            pointType === "add" 
              ? "bg-green-600 hover:bg-green-700" 
              : "bg-red-600 hover:bg-red-700"
          }`} 
          onClick={() => submitForm()}
        >
          {pointType === "add" ? "Add Points" : "Subtract Points"}
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Activity Logs</h3>
        {isLoadingLogs ? (
          <div className="text-center py-4">Loading logs...</div>
        ) : logs.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableCaption>Recent point transactions for this activity</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-xs">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      Group {log.group_id}: {log.foc_group?.name || "Unknown"}
                    </TableCell>
                    <TableCell className={log.point >= 0 ? "text-green-600" : "text-red-600"}>
                      {log.point >= 0 ? "+" : ""}{log.point}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={log.remarks}>
                      {log.remarks}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.foc_user?.name || "Unknown"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No logs found for this activity
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemQuestion;
