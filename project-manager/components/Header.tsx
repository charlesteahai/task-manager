"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Settings, CheckSquare } from "lucide-react";
import Link from "next/link";
import NotificationDropdown from "./NotificationDropdown";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile();

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <Link href="/dashboard">
        <h1 className="text-xl font-bold">Project Manager</h1>
      </Link>
      
      {user && (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:flex items-center gap-2 hover:bg-gray-100"
          >
            <Link href="/my-tasks">
              <CheckSquare className="h-4 w-4" />
              My Tasks
            </Link>
          </Button>
          
          <NotificationDropdown />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage src={userProfile?.photoURL || user.photoURL || undefined} />
                <AvatarFallback>
                  {userProfile?.displayName ? userProfile.displayName.charAt(0) : 
                   user.displayName ? user.displayName.charAt(0) : 
                   user.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {userProfile?.displayName || user.displayName || user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/dashboard">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
              </Link>
              <Link href="/my-tasks">
                <DropdownMenuItem>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  My Tasks
                </DropdownMenuItem>
              </Link>
              <Link href="/profile">
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} className="text-red-600 focus:text-red-600">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}; 