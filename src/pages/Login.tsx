import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { User } from "@/hooks/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const adminRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (auth) {
      navigate("/");
    }
  }, []);

  async function checkCredentials() {
    if (!(adminRef.current && passwordRef.current)) {
      return toast.error("Input Ref Failed");
    }
    if (!(adminRef.current.value.trim() && passwordRef.current.value.trim())) {
      return toast.warning("Admin No and Password cannot be empty");
    }

    const adminNo = adminRef.current.value.trim();
    const password = passwordRef.current.value.trim();

    const { data, error } = await supabase
      .from("foc_user")
      .select()
      .eq("admin", adminNo)
      .eq("password", password);
    if (error) {
      console.log(error);
      return toast.error(JSON.stringify(error));
    }

    if (data.length == 0) {
      return toast.error("Admin No and Password not found");
    } else {
      const user: User = data[0];
      login(user);
      navigate(`/${user.type}`);

      return toast.success("Login successful");
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex items-center justify-center max-w-sm w-full px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center font-light">SOC FOC 25'</CardTitle>
            <CardTitle className="text-3xl text-center text-purple-900 tracking-wide font-bold">
              THE HUNGER GAMES
            </CardTitle>
            {/* <CardDescription>
            Enter your  below to login to your account.
          </CardDescription> */}
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="admin">Admin No.</Label>
              <Input
                id="admin"
                type="text"
                placeholder="2100775"
                required
                ref={adminRef}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Password" required ref={passwordRef} />
              <Button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"} Password
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-purple-900 hover:bg-purple-950 transition-colors" onClick={() => checkCredentials()}>
              Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
