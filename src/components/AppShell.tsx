import { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";

const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <AppSidebar />
      <div className="md:pl-60">{children}</div>
    </>
  );
};

export default AppShell;
