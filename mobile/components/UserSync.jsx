import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useUserStore } from "../store";

export default function UserSync() {
  const { user, isLoaded } = useUser();
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      const firstName = user.firstName ?? "";
      const lastName = user.lastName ?? "";
      setUser(firstName, lastName);
    } else {
      clearUser();
    }
  }, [user, isLoaded, setUser, clearUser]);

  return null;
}
