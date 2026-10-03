"use client";

import { createContext, useContext, type ReactNode } from "react";

// Fuseau horaire du compte, pour que les graphiques affichent heures et dates comme le compte les vit.
const TimezoneContext = createContext("Europe/Paris");

export function TimezoneProvider({ timezone, children }: { timezone: string; children: ReactNode }) {
  return <TimezoneContext.Provider value={timezone}>{children}</TimezoneContext.Provider>;
}

export const useTimezone = () => useContext(TimezoneContext);
