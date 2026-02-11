import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Clerk OAuth callbacks (e.g. dlishe://oauth-native-callback) land here
    // on Android. Silently redirect to root — AuthGate handles the rest.
    router.replace("/");
  }, []);

  return null;
}
