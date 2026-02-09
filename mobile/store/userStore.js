import { create } from "zustand";

export const useUserStore = create((set) => ({
  firstName: "",
  lastName: "",
  setUser: (firstName, lastName) => set({ firstName, lastName }),
  clearUser: () => set({ firstName: "", lastName: "" }),
}));
