import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Logout from "@/components/Logout";

type Group = {
  id: number;
  name: string;
  created_at: string;
};

function GL() {
  const { auth, isLoading } = useAuth();
  const navigate = useNavigate();
  const [groupData, setGroupData] = useState<Group | null>(null);
  const [groupDataLoading, setGroupDataLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const fetchGroupData = async () => {
    setGroupDataLoading(true);
    try {
      // Check if auth and group_id exist
      if (!auth) {
        console.error("No auth found");
        setGroupDataLoading(false);
        return;
      }
      
      if (auth.type !== "GL") {
        console.error("User is not a GL");
        setGroupDataLoading(false);
        return;
      }
      
      if (!auth.group_id) {
        console.error("No group_id found for user:", auth);
        setGroupDataLoading(false);
        return;
      }

      console.log("Fetching group data for group_id:", auth.group_id);
      
      const { data, error } = await supabase
        .from("foc_group")
        .select("*")
        .eq("id", auth.group_id)
        .single();

      if (error) {
        console.error("Error fetching group data:", error);
        throw error;
      }

      if (!data) {
        console.error("No group data found for group_id:", auth.group_id);
        return;
      }

      console.log("Group data fetched:", data);
      setGroupData(data);
    } catch (e) {
      console.error("Error fetching group data:", e);
    } finally {
      setGroupDataLoading(false);
    }
  };

  const handleGroupNameChange = async (newName: string) => {
    try {
      if (!auth || !auth.group_id) {
        toast.error("Cannot update group name: No group ID found");
        return;
      }

      const { error } = await supabase
        .from("foc_group")
        .update({ name: newName })
        .eq("id", auth.group_id);

      if (error) {
        throw error;
      }

      setGroupData(prev => prev ? { ...prev, name: newName } : null);
      toast.success("Group name updated successfully");
    } catch (e) {
      console.error("Error updating group name:", e);
      toast.error("Failed to update group name");
    }
  };

  const handleNameChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (groupData?.name === newGroupName) {
      return toast.error(
        "New Group Name is the same as the current name, please enter a new name."
      );
    }

    if (newGroupName.length < 3) {
      return toast.error(
        "New Group Name must be at least 3 characters long, please enter a new name."
      );
    }
    
    handleGroupNameChange(newGroupName);
  };

  useEffect(() => {
    if (!auth && !isLoading) {
      return navigate("/login");
    }
    if (auth && !(auth.type == "GL" || auth.type == "OC")) {
      return navigate("/");
    }

    if (auth && !isLoading) {
      console.log("Auth loaded, fetching group data. Auth:", auth);
      fetchGroupData();
    }
  }, [auth, isLoading]);

  return (
    <div className="flex flex-col items-center justify-start py-8 w-full min-h-[100dvh] h-full bg-gray-100">
      <Logout />
      <h1 className="text-3xl font-semibold text-center max-w-sm w-full truncate px-8">
        Hi, <span className="text-purple-800">{auth?.name}!</span>
      </h1>

      <main className="max-w-sm w-full flex flex-col px-4">
        {groupDataLoading ? (
          <div className="border p-4 rounded-lg shadow-md mt-8 w-full text-xl bg-white text-center">
            <p>Loading group data...</p>
          </div>
        ) : groupData ? (
          <div className="border p-4 rounded-lg shadow-md mt-8 w-full text-xl bg-white">
            <h1 className="text-center">
              You are the GL of{" "}
              <span className="font-bold">Group {groupData.id}</span>
              🔥
            </h1>

            <form
              onSubmit={handleNameChange}
              className="pt-8 flex flex-col space-y-4"
            >
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="currentName">
                  <span className="font-bold">Current</span> Group Name
                </Label>
                <Input
                  type="text"
                  id="currentName"
                  value={groupData.name}
                  disabled
                />
                <Label className="text-xs text-gray-500 font-light">
                  Created on{" "}
                  {dayjs(groupData.created_at).format(
                    "DD MMM YYYY, hh:mm:ss a"
                  )}
                </Label>
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5 pb-4">
                <Label htmlFor="newGroupName">
                  <span className="font-bold">New</span> Group Name
                </Label>
                <Input
                  type="text"
                  id="newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter new group name"
                />
              </div>
              <Button
                className="bg-purple-800 hover:bg-purple-900"
                type="submit"
              >
                Change Group Name
              </Button>
            </form>
          </div>
        ) : (
          <div className="border p-4 rounded-lg shadow-md mt-8 w-full text-xl bg-white text-center">
            <p>No group data found. Please contact an OC.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default GL;
