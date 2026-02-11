import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "../store";
import { getMe } from "../services/user";

export default function UserSync() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const setUser = useUserStore((s) => s.setUser);
  const setPreferredUnitSystem = useUserStore((s) => s.setPreferredUnitSystem);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    if (user) {
      const firstName = user.firstName ?? "";
      const lastName = user.lastName ?? "";
      const imageUrl = user.hasImage ? user.imageUrl : null;
      setUser(firstName, lastName, imageUrl);

      // Fetch backend preferences
      getMe({ getToken })
        .then((res) => {
          if (!cancelled && res?.user?.preferredUnitSystem) {
            setPreferredUnitSystem(res.user.preferredUnitSystem);
          }
        })
        .catch((err) => {
          console.warn("UserSync: failed to fetch preferences", err?.message);
        });
    } else {
      clearUser();
    }

    return () => { cancelled = true; };
  }, [user, isLoaded]);

  return null;
}
