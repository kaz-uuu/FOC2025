import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { format } from "date-fns";
// import useAuth from "@/hooks/useAuth";
// import { useNavigate } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

type Leaderboard = {
  group_id?: number;
  group_name: string;
  total_points: number;
};

function Home({ oc_mode = false }: { oc_mode?: boolean }) {
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [freeze, setFreeze] = useState(false);
  const [freezeDate, setFreezeDate] = useState<Date | null>(null);

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
    const isFrozen = data[0].state === "true";
    setFreeze(isFrozen);
    if (isFrozen && data[0].created_at) {
      setFreezeDate(new Date(data[0].created_at));
    }
    return {
      freeze: isFrozen,
      freezeDate: data[0].created_at ? new Date(data[0].created_at) : null,
    };
  }

//   async function getGroups(): Promise<any[]> {
//     const { data, error } = await supabase
//       .from("foc_group")
//       .select()
//       .order("id", { ascending: true });
//     if (error) {
//       console.log(error);
//     }
//     if (!data) {
//       return [];
//     }
//     return data;
//   }

//   const activityMapper: { [key: number]: "rank" | "rank2" | "add" | "short" } =
//     {
//       1: "rank",
//       2: "short",
//       3: "rank",
//       4: "rank",
//       5: "rank",
//       6: "rank",
//       7: "rank",
//       8: "rank",
//       9: "rank",
//       10: "add",
//       11: "add",
//       12: "add",
//       13: "rank2",
//       14: "rank2",
//       15: "rank2",
//       16: "add",
//     };

  async function getLeaderboard() {
    setIsLoading(true);
    try {
      // Get the freeze state
      const { data: freezeData, error: freezeError } = await supabase
        .from("foc_state")
        .select("*")
        .eq("name", "freeze")
        .single();

      console.log("Freeze state data:", freezeData);
      console.log("Freeze state error:", freezeError);

      if (freezeError) {
        console.error("Error fetching freeze state:", freezeError);
        return;
      }

      const isFrozen = freezeData?.state === "true";
      console.log("Is frozen:", isFrozen);
      setFreeze(isFrozen);

      if (isFrozen) {
        // If frozen, get the frozen game points
        const { data: gamePointsData, error: gamePointsError } = await supabase
          .from("foc_state")
          .select("*")
          .eq("name", "game")
          .single();

        console.log("Game points data:", gamePointsData);
        console.log("Game points error:", gamePointsError);

        if (gamePointsError) {
          console.error("Error fetching frozen game points:", gamePointsError);
          return;
        }

        // Parse the frozen points
        const frozenPoints = JSON.parse(gamePointsData?.state || "{}");
        console.log("Parsed frozen points:", frozenPoints);

        // Get all groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("foc_group")
          .select("*");

        console.log("Groups data:", groupsData);
        console.log("Groups error:", groupsError);

        if (groupsError) {
          console.error("Error fetching groups:", groupsError);
          return;
        }

        // Create leaderboard entries with frozen points
        const leaderboardEntries = groupsData.map((group) => ({
          group_id: group.id,
          group_name: group.name,
          total_points: frozenPoints[group.id] || 0,
        }));

        console.log("Leaderboard entries (frozen):", leaderboardEntries);

        // Sort by total points in descending order
        leaderboardEntries.sort((a, b) => b.total_points - a.total_points);

        setLeaderboard(leaderboardEntries);
        return;
      }

      // If not frozen, proceed with normal leaderboard calculation
      const { data: pointsData, error: pointsError } = await supabase
        .from("foc_points")
        .select("*");

      console.log("Points data:", pointsData);
      console.log("Points error:", pointsError);

      if (pointsError) {
        console.error("Error fetching points data:", pointsError);
        return;
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from("foc_group")
        .select("*");

      console.log("Groups data (unfrozen):", groupsData);
      console.log("Groups error (unfrozen):", groupsError);

      if (groupsError) {
        console.error("Error fetching groups:", groupsError);
        return;
      }

      // Calculate total points for each group
      const groupPoints: { [key: string]: number } = {};

      // Initialize all groups with 0 points
      groupsData.forEach((group) => {
        groupPoints[group.id] = 0;
      });

      // Add points from foc_points table
      pointsData.forEach((point) => {
        groupPoints[point.group_id] = (groupPoints[point.group_id] || 0) + point.point;
      });

      console.log("Calculated group points:", groupPoints);

      // Create leaderboard entries
      const leaderboardEntries = groupsData.map((group) => ({
        group_id: group.id,
        group_name: group.name,
        total_points: groupPoints[group.id] || 0,
      }));

      console.log("Leaderboard entries (unfrozen):", leaderboardEntries);

      // Sort by total points in descending order
      leaderboardEntries.sort((a, b) => b.total_points - a.total_points);

      setLeaderboard(leaderboardEntries);
    } catch (error) {
      console.error("Error in getLeaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "foc_state" },
        (payload) => {
          console.log("Change received!", payload);
          getFreeze();
          getLeaderboard();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "foc_group" },
        (payload) => {
          console.log("Change received!", payload);
          getLeaderboard();
          return;
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foc_points" },
        (payload) => {
          console.log("Change received!", payload);
          getLeaderboard();
          return;
        }
      )
      .subscribe();

    // Initial data fetching
    getFreeze();
    getLeaderboard();
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-[100dvh] bg-white flex flex-col space-y-6 items-center justify-around w-full max-w-sm mx-auto">
      <div className="flex flex-col pt-12">
        <h1 className="text-2xl text-center font-light">SOC FOC 25'</h1>
        <h1 className="text-3xl text-center text-[#7d040b] tracking-wide font-bold">
          THE HUNGER GAMES
        </h1>
      </div>

      <img
        src="/leaderboard/logo.jpeg"
        alt="machine"
        className="max-w-sm w-full animate-float px-12"
      />

      {freeze && (
        <div className="w-full px-4">
          <Alert className="w-full">
            <Info className="h-4 w-4 stroke-red-600" />
            <AlertTitle>Attention</AlertTitle>
            <AlertDescription className="flex flex-col">
              The leaderboard is currently frozen.
              {freezeDate && (
                <div className="text-xs text-gray-500">
                  Frozen on: {freezeDate.toLocaleString()}
                </div>
              )}
              {oc_mode && <div className="font-bold">[OC Mode Not Frozen]</div>}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-col w-full items-center space-y-8">
        {/* <div className="flex items-end justify-center max-w-sm w-full px-2"> */}
        {/* <div className="flex flex-col items-center flex-1">
            <h1
              className={cn([
                "w-24 h-12 overflow-auto text-center font-bold text-xl",
                !isLoading && "animate-appear-2",
              ])}
            >
              {isLoading ? "Loading..." : leaderboard[1].group_name ?? "NA"}
            </h1>
            <div className="border-black border-b-0 bg-purple-600 pb-10 w-full relative">
              <div className="px-2 py-5 bg-slate-100 rounded-full m-8">
                <Trophy className="w-full stroke-gray-400" />
              </div>

              <div className="bg-purple-700 w-full h-2 absolute -top-1"></div>
            </div>

            <div className="bg-purple-600 w-full flex items-center justify-center pb-6">
              <h1 className="px-6 py-1 bg-slate-100 text-sm text-gray-400">
                {isLoading ? "Loading..." : leaderboard[1].total_points ?? "NA"}{" "}
                Pts
              </h1>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1">
            <h1
              className={cn([
                "w-24 h-12 overflow-auto text-center font-bold text-2xl",
                !isLoading && "animate-appear-3",
              ])}
            >
              {isLoading ? "Loading..." : leaderboard[0].group_name ?? "NA"}
            </h1>
            <div className="border-black border-b-0 bg-purple-700 pb-24 w-full relative">
              <div className="px-2 py-5 bg-yellow-100 rounded-full m-8">
                <Trophy className="w-full stroke-yellow-500" />
              </div>

              <div className="bg-purple-800 w-full h-2 absolute -top-1"></div>
            </div>

            <div className="bg-purple-700 w-full flex items-center justify-center pb-8">
              <h1 className="px-6 py-1 bg-yellow-100 text-sm text-yellow-500">
                {isLoading ? "Loading..." : leaderboard[0].total_points ?? "NA"} Pts
              </h1>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1">
            <h1
              className={cn([
                "w-24 h-12 overflow-auto text-center font-bold text-lg",
                !isLoading && "animate-appear-1",
              ])}
            >
              {isLoading ? "Loading..." : leaderboard[2].group_name ?? "NA"}
            </h1>
            <div className="border-black border-b-0 bg-purple-500 w-full relative">
              <div className="px-2 py-5 bg-[#B08D57] bg-opacity-75 rounded-full m-8">
                <Trophy className="w-full stroke-[#FFD700]" />
              </div>

              <div className="bg-purple-600 w-full h-2 absolute -top-1"></div>
            </div>

            <div className="bg-purple-500 w-full flex items-center justify-center pb-4">
              <h1 className="px-6 py-1 bg-[#B08D57] text-sm text-[#FFD700]">
                {isLoading ? "Loading..." : leaderboard[2].total_points ?? "NA"}{" "}
                Pts
              </h1>
            </div>
          </div> */}
        {/* </div> */}

        <div className="flex items-center justify-center w-full max-w-sm pb-12 px-4">
          <Table className="w-full">
            <TableCaption>
              {isLoading
                ? "Loading Leaderboard..."
                : "Current standing for SOC FOC 25'"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[24px] text-black">Rank</TableHead>
                <TableHead className="text-black px-1">Group Name</TableHead>
                <TableHead className="text-center text-black">
                  Total Points
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading &&
                (leaderboard ?? []).map((leader, index) => (
                  <LeaderboardRow key={index} {...leader} index={index} />
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}

const LeaderboardRow = ({
  group_id,
  group_name,
  total_points,
  index,
}: Leaderboard & { index: number }) => {
  // const rank = total_points === 0 ? "NA" : index + 1;
  const rank = index + 1;
  return (
    <TableRow>
      <TableCell className="text-center">
        <h1
          className={cn([
            "h-8 w-8 grid place-items-center font-bold rounded-full",
            rank === 1
              ? "bg-[#FFD700] text-yellow-800"
              : rank === 2
              ? "bg-[#C0C0C0] text-gray-700"
              : rank === 3
              ? "bg-[#B8860B] text-yellow-200"
              : // : rank === "NA"
                // ? "italic"
                "bg-purple-100 text-purple-800",
          ])}
        >
          {rank}
        </h1>
      </TableCell>
      <TableCell
        className={cn([
          "px-1",
          rank === 1 && "text-[#FFD700] font-bold",
          rank === 2 && "text-[#C0C0C0] font-bold",
          rank === 3 && "text-[#B8860B] font-bold",
        ])}
      >
        <span className="font-bold">{"Group " + group_id + ": "}</span>
        {group_name}
      </TableCell>
      <TableCell
        className={cn([
          "text-center",
          rank === 1 && "text-[#FFD700] font-bold",
          rank === 2 && "text-[#C0C0C0] font-bold",
          rank === 3 && "text-[#B8860B] font-bold",
        ])}
      >
        {total_points}
      </TableCell>
    </TableRow>
  );
};
export default Home;
