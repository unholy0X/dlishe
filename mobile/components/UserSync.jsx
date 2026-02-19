import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "../store";
import { getMe } from "../services/user";
import { useDemoStore } from "../store/demoStore";

export default function UserSync() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const setUser = useUserStore((s) => s.setUser);
  const setPreferredUnitSystem = useUserStore((s) => s.setPreferredUnitSystem);
  const clearUser = useUserStore((s) => s.clearUser);
  const isDemoMode = useDemoStore((s) => s.isDemoMode);

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
    } else if (isDemoMode) {
      // Demo account has no Clerk user — show a placeholder name
      setUser("Demo", "User", null);
    } else {
      clearUser();
    }

    return () => { cancelled = true; };
  }, [user, isLoaded, isDemoMode]);

  return null;
}
