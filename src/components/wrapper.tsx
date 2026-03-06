import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export const Wrapper = ({ children, className }: Props) => {
  return (
    <div className={cn("mx-auto w-full max-w-xl", className)}>
      {children}
    </div>
  );
}