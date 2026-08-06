import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  /** Small pill rendered next to the title (e.g. unread counter). */
  badge?: ReactNode;
  /** Right-aligned controls. */
  actions?: ReactNode;
  className?: string;
}

/** Shared header for the authenticated app sections. */
const PageHeader = ({ icon: Icon, title, subtitle, badge, actions, className }: PageHeaderProps) => (
  <header
    className={cn(
      "sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl",
      className,
    )}
  >
    <div className="bg-mesh">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-4 md:px-6 md:py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 truncate text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <span className="text-gradient">{title}</span>
            {badge}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </div>
  </header>
);

export default PageHeader;
