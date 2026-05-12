import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const LinkArrow = ({ link }: { link: LinkProps["to"] }) => (
  <Link to={link}>
    <ChevronLeft className="shrink-0" />
  </Link>
)