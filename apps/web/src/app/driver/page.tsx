import type { Metadata } from "next";

import { DriverHomeScreen } from "@/features/driver/driver-home-screen";

export const metadata: Metadata = { title: "Today's trips" };

export default function DriverHomePage() {
  return <DriverHomeScreen />;
}
