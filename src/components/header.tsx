import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type HeaderProps = {
  children: ReactNode;
  className?: string;
};

export const Header = ({ children, className }: HeaderProps) => {
  return (
    <header className={cn(`
      mx-2 mt-2 mb-4 flex w-full items-center gap-2 rounded-2xl bg-card p-4
    `, className)}>
      <Link to="/overview">
        <ChevronLeft className="shrink-0" />
      </Link>
      <div className="flex flex-1 items-center justify-between">
        {children}
      </div>
    </header>
  )
}