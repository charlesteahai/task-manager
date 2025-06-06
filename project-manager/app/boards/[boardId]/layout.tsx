"use client";

import { RealtimeDataProvider } from "@/app/contexts/RealtimeDataContext";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeDataProvider>
      {children}
    </RealtimeDataProvider>
  );
} 