import { api } from "./axios";

export interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isBlocked?: boolean;
}

export interface PaginatedUsersResponse {
  users: UserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateUserInput {
  name?: string;
  email: string;
  password?: string;
  role: string;
}

export interface CreateUserResponseData {
  user: UserItem;
  generatedPassword?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
}

export class UserService {
  static async listUsers(params: ListUsersParams = {}): Promise<PaginatedUsersResponse> {
    const response = await api.get<{ success: boolean; data: PaginatedUsersResponse }>(
      "/admin/users",
      { params }
    );
    return response.data.data;
  }

  static async getUserById(id: string | number): Promise<UserItem> {
    const response = await api.get<{ success: boolean; data: { user: UserItem } }>(
      `/admin/users/${id}`
    );
    return response.data.data.user;
  }

  static async createUser(data: CreateUserInput): Promise<CreateUserResponseData> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: CreateUserResponseData;
    }>("/admin/users", data);
    return response.data.data;
  }

  static async updateUser(id: string | number, data: UpdateUserInput): Promise<UserItem> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: { user: UserItem };
    }>(`/admin/users/${id}`, data);
    return response.data.data.user;
  }

  static async blockUser(id: string | number): Promise<UserItem> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: { user: UserItem };
    }>(`/admin/users/${id}/block`);
    return response.data.data.user;
  }

  static async unblockUser(id: string | number): Promise<UserItem> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: { user: UserItem };
    }>(`/admin/users/${id}/unblock`);
    return response.data.data.user;
  }

  static async deleteUser(id: string | number): Promise<{ id: string | number; email: string }> {
    const response = await api.delete<{
      success: boolean;
      message: string;
      data: { user: { id: string | number; email: string } };
    }>(`/admin/users/${id}`);
    return response.data.data.user;
  }
}
