"use client";

import { useState } from "react";
import { Bell, Calendar, Clock, AlertTriangle, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { format, isToday, isTomorrow } from "date-fns";
import Link from "next/link";

const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
  };

  const formatDueDate = (date: Date) => {
    if (isToday(date)) {
      return "Today";
    } else if (isTomorrow(date)) {
      return "Tomorrow";
    } else {
      return format(date, "MMM d");
    }
  };

  const getNotificationIcon = (type: Notification['type'], dueDate?: Date) => {
    if (dueDate && dueDate < new Date()) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    switch (type) {
      case 'task_due':
      case 'subtask_due':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case 'task_assigned':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const sortedNotifications = notifications.sort((a, b) => {
    // Sort by unread first, then by due date (most urgent first)
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 w-10 rounded-full hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-6 px-2"
            >
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {sortedNotifications.map((notification) => (
              <div key={notification.id} className="relative">
                <Link href={`/boards/${notification.boardId}`}>
                  <DropdownMenuItem
                    className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type, notification.dueDate)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{notification.boardName}</span>
                          {notification.dueDate && (
                            <span className={`${
                              notification.dueDate < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'
                            }`}>
                              {formatDueDate(notification.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                </Link>
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="p-2">
          <Link href="/my-tasks">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => setIsOpen(false)}
            >
              My Tasks
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown; 