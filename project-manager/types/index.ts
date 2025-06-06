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
  createdAt: Timestamp;
}

export type TaskStatus = "pending" | "in-progress" | "done" | "todo";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Timestamp;
  owner: string;
  createdAt: Timestamp;
}

export interface Subtask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'pending';
  createdAt: Timestamp;
  assignedTo?: string;
}

export interface BoardMember {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
} 