import { cn } from "@/lib/utils";
import { type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LinkArrow } from "./LinkArrow";
import { Wrapper } from "./Wrapper";

type Props = {
  children: ReactNode;
  className?: string;
  link?: LinkProps["to"];
};

export const Header = ({ children, className, link }: Props) => {
  return (
    <Wrapper>
      <header
        className={cn(`mx-2 mt-2 mb-4 flex items-center gap-2 rounded-2xl bg-card p-4`, className)}
      >
        {link && <LinkArrow link={link} />}
        <div className="flex flex-1 items-center justify-between">{children}</div>
      </header>
    </Wrapper>
  );
};
