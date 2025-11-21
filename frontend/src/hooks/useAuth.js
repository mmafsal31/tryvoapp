// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import { getUser } from "../utils/auth";

export default function useAuth() {
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    const updateUser = () => setUser(getUser());
    window.addEventListener("userChanged", updateUser);
    return () => window.removeEventListener("userChanged", updateUser);
  }, []);

  return user;
}
