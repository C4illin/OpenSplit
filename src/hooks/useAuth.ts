// src/hooks/useAuth.ts
import { useCallback, useEffect, useState } from "react";
import { pb } from "../lib/pocketbase";

export const useAuth = () => {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const authData = await pb
      .collection("users")
      .authWithOAuth2({ provider: "google" });
    return authData;
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
  }, []);

  return {
    user,
    isAuthenticated: pb.authStore.isValid,
    loginWithGoogle,
    logout,
  };
};
