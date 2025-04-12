// TickTick API Types

// Authentication
export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  userCode: string;
  username: string;
  teamPro: boolean;
  proStartDate: string;
  proEndDate: string;
  needSubscribe: boolean;
  inboxId: string;
  teamUser: boolean;
  activeTeamUser: boolean;
  freeTrial: boolean;
  pro: boolean;
  ds: boolean;
}

export interface ErrorResponse {
  errorId: string;
  errorCode: string;
  errorMessage: string;
  data?: {
    remainderTimes?: number;
  };
}

// Project Types
export interface Project {
  id: string;
  name: string;
  isOwner: boolean;
  color: string | null;
  inAll: boolean;
  sortOrder: number;
  sortType: string;
  userCount: number;
  etag: string;
  modifiedTime: string;
  closed: boolean | null;
  muted: boolean;
  kind: string;
  permission: string;
}

export interface CreateProjectRequest {
  name: string;
  color?: string;
}

export interface UpdateProjectRequest {
  id: string;
  name?: string;
  color?: string;
}

// Task Types
export enum TaskPriority {
  NONE = 0,
  LOW = 1,
  MEDIUM = 3,
  HIGH = 5
}

export enum TaskStatus {
  TODO = 0,
  COMPLETED = 2
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  startDate?: string;
  items?: TaskItem[];
  tags?: string[];
  timeZone?: string;
  isAllDay?: boolean;
  reminder?: string;
  repeatFlag?: string;
  sortOrder?: number;
  columnId?: string;
  modifiedTime?: string;
  createdTime?: string;
  completedTime?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  sortOrder: number;
}

export interface CreateTaskRequest {
  title: string;
  content?: string;
  priority?: TaskPriority;
  projectId?: string;
  dueDate?: string;
  startDate?: string;
  tags?: string[];
}

export interface UpdateTaskRequest {
  id: string;
  title?: string;
  content?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  startDate?: string;
  tags?: string[];
}

export interface BatchTaskRequest {
  add?: Task[];
  update?: Task[];
  delete?: string[];
  addAttachments?: any[];
  updateAttachments?: any[];
  deleteAttachments?: any[];
}

export interface BatchTaskResponse {
  id2etag: Record<string, string>;
  id2error: Record<string, string>;
}

// Tag Types
export interface Tag {
  name: string;
  label?: string;
  color?: string;
}

// Batch Check Response
export interface BatchCheckResponse {
  checkPoint: number;
  syncTaskBean: {
    update: Task[];
    delete: string[];
    add: Task[];
    empty: boolean;
  };
  projectProfiles: Project[];
  tags: Tag[];
  inboxId: string;
}
