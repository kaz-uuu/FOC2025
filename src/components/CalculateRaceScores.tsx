import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";
import { User } from "@/hooks/AuthContext";
import { Loader2 } from "lucide-react";

// Define the ranked activities
const RANKED_ACTIVITIES = [1, 2, 3, 4, 5, 6, 17];

// Define the points for each rank
const RANK_POINTS = {
  1: 150, // 1st place
  2: 120, // 2nd place
  3: 110, // 3rd place
  4: 100, // 4th place
  5: 90,  // 5th place
  6: 80,  // 6th place
  7: 70,  // 7th place
  8: 60,  // 8th place
  9: 50,  // 9th place
  10: 40, // 10th place
  11: 30, // 11th place
  12: 20, // 12th place
};

// Helper function to get table name from activity ID
function getTableName(activityId: number): string {
  switch (activityId) {
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
      return "";
  }
}

// Helper function to get game name from activity ID
function getGameName(activityId: number): string {
  switch (activityId) {
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
      return "";
  }
}

function CalculateRaceScores({ auth }: { auth: User | null }) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);

  // Function to check if all 12 groups have completed an activity
  const checkAllGroupsCompleted = async (activityId: number): Promise<boolean> => {
    const tableName = getTableName(activityId);
    if (!tableName) return false;

    try {
      // Get all groups
      const { data: groups, error: groupsError } = await supabase
        .from("foc_group")
        .select("id")
        .order("id", { ascending: true });

      if (groupsError || !groups) {
        console.error("Error fetching groups:", groupsError);
        return false;
      }

      // Get all logs for this activity
      const { data: logs, error: logsError } = await supabase
        .from(tableName)
        .select("group_id")
        .order("created_at", { ascending: false });

      if (logsError || !logs) {
        console.error("Error fetching logs:", logsError);
        return false;
      }

      // Get unique group IDs from logs
      const completedGroupIds = [...new Set(logs.map(log => log.group_id))];
      
      // Check if all groups have completed the activity
      return completedGroupIds.length === groups.length;
    } catch (error) {
      console.error("Error checking completion:", error);
      return false;
    }
  };

  // Function to calculate and award points based on rankings
  const calculateAndAwardPoints = async (activityId: number) => {
    const tableName = getTableName(activityId);
    if (!tableName) {
      toast.error("Invalid activity selected");
      return;
    }

    try {
      // Get all logs for this activity with group information
      const { data: logs, error: logsError } = await supabase
        .from(tableName)
        .select("*, foc_group(id, name)")
        .order("created_at", { ascending: false });

      if (logsError || !logs) {
        console.error("Error fetching logs:", logsError);
        toast.error("Failed to fetch activity logs");
        return;
      }

      // Create a map to track the best time for each group
      const bestTimesMap = new Map();
      
      logs.forEach(log => {
        const groupId = log.group_id;
        const timeInSeconds = (log.minutes * 60) + log.seconds + (log.milliseconds / 100);
        
        if (!bestTimesMap.has(groupId) || timeInSeconds < bestTimesMap.get(groupId).time) {
          bestTimesMap.set(groupId, {
            groupId,
            groupName: log.foc_group?.name || `Group ${groupId}`,
            time: timeInSeconds,
            minutes: log.minutes,
            seconds: log.seconds,
            milliseconds: log.milliseconds,
            logId: log.id
          });
        }
      });

      // Convert map to array and sort by time (ascending)
      const sortedGroups = Array.from(bestTimesMap.values())
        .sort((a, b) => a.time - b.time);

      // Check if we have all 12 groups
      if (sortedGroups.length < 12) {
        toast.error(`Only ${sortedGroups.length} groups have completed this activity. All 12 groups must complete it before calculating scores.`);
        return;
      }

      // Award points based on ranking
      const gameName = getGameName(activityId);
      const pointsToAdd = [];

      for (let i = 0; i < sortedGroups.length; i++) {
        const rank = i + 1;
        const points = RANK_POINTS[rank as keyof typeof RANK_POINTS];
        const group = sortedGroups[i];

        pointsToAdd.push({
          user_id: auth?.admin,
          group_id: group.groupId,
          game_id: activityId,
          point: points,
          remarks: `${gameName} - Rank ${rank} (${group.minutes}:${group.seconds.toString().padStart(2, '0')}.${group.milliseconds.toString().padStart(2, '0')})`
        });
      }

      // Insert points into the database
      const { error: insertError } = await supabase
        .from("foc_points")
        .insert(pointsToAdd);

      if (insertError) {
        console.error("Error inserting points:", insertError);
        toast.error("Failed to award points");
        return;
      }

      toast.success(`Successfully awarded points for ${gameName}`);
    } catch (error) {
      console.error("Error calculating points:", error);
      toast.error("An error occurred while calculating points");
    }
  };

  // Function to handle the calculation process
  const handleCalculate = async () => {
    if (!selectedActivity) {
      toast.error("Please select an activity");
      return;
    }

    setIsCalculating(true);
    
    try {
      // Check if all groups have completed the activity
      const allCompleted = await checkAllGroupsCompleted(selectedActivity);
      
      if (!allCompleted) {
        toast.error("Not all groups have completed this activity yet");
        setIsCalculating(false);
        return;
      }
      
      // Calculate and award points
      await calculateAndAwardPoints(selectedActivity);
    } catch (error) {
      console.error("Error in calculation process:", error);
      toast.error("An error occurred during calculation");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <h3 className="text-lg font-semibold">Calculate Race Scores</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {RANKED_ACTIVITIES.map((activityId) => (
          <Button
            key={activityId}
            variant={selectedActivity === activityId ? "default" : "outline"}
            className={`${
              selectedActivity === activityId 
                ? "bg-purple-800 hover:bg-purple-900" 
                : "hover:bg-purple-100"
            }`}
            onClick={() => setSelectedActivity(activityId)}
          >
            {getGameName(activityId)}
          </Button>
        ))}
      </div>
      
      <Button
        className="bg-purple-800 hover:bg-purple-900 w-full"
        onClick={handleCalculate}
        disabled={isCalculating || !selectedActivity}
      >
        {isCalculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          "Calculate Scores"
        )}
      </Button>
      
      <div className="text-sm text-gray-500 mt-2">
        <p>This will check if all 12 groups have completed the selected activity.</p>
        <p>If they have, points will be awarded based on their completion times:</p>
        <ul className="list-disc pl-5 mt-1">
          <li>1st place: 150 points</li>
          <li>2nd place: 120 points</li>
          <li>3rd place: 110 points</li>
          <li>4th place: 100 points</li>
          <li>5th place: 90 points</li>
          <li>6th place: 80 points</li>
          <li>7th place: 70 points</li>
          <li>8th place: 60 points</li>
          <li>9th place: 50 points</li>
          <li>10th place: 40 points</li>
          <li>11th place: 30 points</li>
          <li>12th place: 20 points</li>
        </ul>
      </div>
    </div>
  );
}

export default CalculateRaceScores; 