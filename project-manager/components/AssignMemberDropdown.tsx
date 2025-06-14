"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User as UserIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types";
import { getFirebaseServices } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface AssignMemberDropdownProps {
  subtask: { id: string; boardId: string; assignedTo?: string };
  boardMembers: User[];
  onAssign: (memberId: string | undefined) => void;
}

const { db } = getFirebaseServices();

export function AssignMemberDropdown({
  subtask,
  boardMembers,
  onAssign,
}: AssignMemberDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const selectedMember = boardMembers.find((member) => member.uid === subtask.assignedTo);

  const getDisplayName = (member: User): string => {
    return member.displayName || member.email || 'Unknown User';
  };

  const getAvatarFallback = (member: User): string => {
    const displayName = member.displayName || member.email || 'U';
    return displayName[0]?.toUpperCase() || 'U';
  };

  const handleAssign = async (memberId: string | undefined) => {
    const taskPath = subtask.id.split('_task_')[0];
    const subtaskIdOnly = subtask.id.split('_task_')[1];
    if (!taskPath || !subtaskIdOnly) {
      console.error("Invalid subtask ID format:", subtask.id);
      return;
    }

    const subtaskRef = doc(
      db,
      `boards/${subtask.boardId}/tasks/${taskPath}/subtasks/${subtaskIdOnly}`
    );
    await updateDoc(subtaskRef, { assignedTo: memberId });
    onAssign(memberId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedMember.photoURL ?? undefined} />
                <AvatarFallback>{getAvatarFallback(selectedMember)}</AvatarFallback>
              </Avatar>
              {getDisplayName(selectedMember)}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Assign a member
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  handleAssign(undefined);
                  setOpen(false);
                }}
              >
                <div className="flex items-center">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Unassigned
                </div>
              </CommandItem>
              {boardMembers.map((member) => (
                <CommandItem
                  key={member.uid}
                  value={getDisplayName(member)}
                  onSelect={() => {
                    handleAssign(member.uid);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      subtask.assignedTo === member.uid ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.photoURL ?? undefined} />
                      <AvatarFallback>{getAvatarFallback(member)}</AvatarFallback>
                    </Avatar>
                    {getDisplayName(member)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 