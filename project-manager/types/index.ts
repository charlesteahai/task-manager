import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  owner: string; // User UID
  members: string[]; // Array of User UIDs
  customStatuses?: BoardStatus[];
  createdAt: Timestamp;
}

export interface BoardStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export type TaskStatus = string; // Made dynamic to support custom statuses

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Timestamp;
  owner: string;
  assignedTo?: string;
  remark?: string;
  createdAt: Timestamp;
}

export interface Subtask {
  id: string;
  title: string;
  status: string; // Made dynamic to support custom statuses
  createdAt: Timestamp;
  assignedTo?: string;
  dueDate?: Timestamp;
  remark?: string;
}

export interface BoardMember {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
} 