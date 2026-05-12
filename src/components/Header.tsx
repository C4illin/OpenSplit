import { cn } from "@/lib/utils";
import { type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LinkArrow } from "./LinkArrow";

type Props = {
  children: ReactNode;
  className?: string;
  link?: LinkProps["to"];
};

export const Header = ({ children, className, link }: Props) => {
  return (
    <header className={cn(`
      mx-auto mt-2 mb-4 flex w-full max-w-xl items-center gap-2 rounded-2xl
      bg-card p-4
    `, className)}>
      {link && (
        <LinkArrow link={link} />
      )}
      <div className="flex flex-1 items-center justify-between">
        {children}
      </div>
    </header>
  )
}