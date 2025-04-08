import { supabase } from "@/utils/supabase";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export enum UserType {
  GL = "GL",
  GP = "GP",
  OC = "OC",
}

export type User = {
  admin: string;
  name: string;
  type: UserType;
  password: string;
  created_at: string;
  group_id?: number;
};

type AuthContextType = {
  auth: User | null;
  setAuth: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  login: (user: User) => void;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  auth: null,
  setAuth: () => null,
  logout: () => null,
  login: () => null,
  isLoading: true,
});

export const AuthProvider = ({ children }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<User | null>(null);
  const navigate = useNavigate();

  const logout = () => {
    setAuth(null);
    localStorage.removeItem("user");
    navigate("/login");
    return;
  };

  const login = (user: User) => {
    setAuth(user);
    localStorage.setItem("user", JSON.stringify(user));
    return;
  };

  useEffect(() => {
    async function getAuth() {
      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          const userData = JSON.parse(storedUser);

          const { data, error } = await supabase
            .from("foc_user")
            .select("*")
            .eq("admin", userData.admin)
            .eq("name", userData.name)
            .eq("type", userData.type)
            .eq("password", userData.password)
            .single();

          if (error || !data) {
            throw new Error("User not found");
          }

          // Update the user data with the latest from the database, including group_id
          const updatedUserData = {
            ...userData,
            group_id: data.group_id
          };
          
          setAuth(updatedUserData);
          localStorage.setItem("user", JSON.stringify(updatedUserData));
        }
      } catch (e) {
        console.error("Auth error:", e);
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    getAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout, login, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
