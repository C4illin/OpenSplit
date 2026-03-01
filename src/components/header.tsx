import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type HeaderProps = {
  children: ReactNode;
  className?: string;
};

export const Header = ({ children, className }: HeaderProps) => {
  return (
    <header className={cn("rounded-2xl bg-card p-4 mx-2 mt-2 mb-4", className)
    }>
      <ChevronLeft />
      <div className="flex items-center justify-between">
        {children}
      </div>
    </header>
  )
}