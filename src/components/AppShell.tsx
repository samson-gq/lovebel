import { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";

const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <AppSidebar />
      <div className="md:pl-60">
        <main className="min-h-dvh pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </>
  );
};

export default AppShell;
