"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User as UserIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BoardMember } from "@/types";
import { cn } from "@/lib/utils";

interface TaskAssignDropdownProps {
  selectedMemberId?: string;
  boardMembers: BoardMember[];
  onSelect: (memberId: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TaskAssignDropdown({
  selectedMemberId,
  boardMembers,
  onSelect,
  placeholder = "Assign to member",
  disabled = false,
}: TaskAssignDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const selectedMember = boardMembers.find((member) => member.uid === selectedMemberId);

  const getDisplayName = (member: BoardMember): string => {
    return member.displayName || member.email || 'Unknown User';
  };

  const getAvatarFallback = (member: BoardMember): string => {
    const displayName = member.displayName || member.email || 'U';
    return displayName[0]?.toUpperCase() || 'U';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between backdrop-blur-sm bg-white/80 border-white/20 hover:bg-white/90 hover:border-gray-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-200"
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedMember.photoURL ?? undefined} />
                <AvatarFallback>{getAvatarFallback(selectedMember)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{getDisplayName(selectedMember)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <UserIcon className="h-4 w-4" />
              {placeholder}
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 backdrop-blur-sm bg-white/95 border-white/20 z-50">
        <div className="p-2">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search members..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={() => {
                // Simple search functionality could be added here if needed
              }}
            />
          </div>
          <div className="space-y-1">
            <div
              className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Unassigned
            </div>
            {boardMembers.map((member) => (
              <div
                key={member.uid}
                className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => {
                  onSelect(member.uid);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedMemberId === member.uid ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.photoURL ?? undefined} />
                    <AvatarFallback>{getAvatarFallback(member)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{getDisplayName(member)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 