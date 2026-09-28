"use client";

import type { SessionUser } from "@excelcabs/types";
import { Avatar, AvatarFallback } from "@excelcabs/ui/components/avatar";
import { Button } from "@excelcabs/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@excelcabs/ui/components/dropdown-menu";
import { getInitials } from "@excelcabs/ui/lib/initials";
import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";

import type { NavItem } from "@/config/navigation";

interface AccountMenuProps {
  user: SessionUser;
  /** Links shown above "Sign out". */
  items?: readonly NavItem[];
  onSignOut: () => void;
  signingOut?: boolean;
}

/** Avatar + name trigger opening the account dropdown (name / email, links, sign out). */
export function AccountMenu({ user, items = [], onSignOut, signingOut = false }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={`Account menu for ${user.name}`}>
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm sm:inline">{user.name}</span>
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-semibold text-foreground">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        {items.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {items.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <item.icon />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
