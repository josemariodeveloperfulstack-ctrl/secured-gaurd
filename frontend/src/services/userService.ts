import api from '@/lib/axios';
import { withConnectionRetry } from '@/utils/requestRetry';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  active: boolean;
  roles: string[];
  isOnline?: boolean;
}

export interface CreateUserRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  whatsapp?: string;
  roles?: string[]; // Backend DTO espera List<String>
  active?: boolean;
}

export interface UserPageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  onlineCount: number;
}

export interface UpdateUserRequest {
  name?: string;
  username?: string;
  email?: string;
  whatsapp?: string;
  password?: string;
  active?: boolean;
  roles?: string[]; // Backend DTO espera List<String>
  avatar?: string;
  department?: string;
  position?: string;
  employeeCode?: string;
  phone?: string;
  address?: string;
}

export interface UserSelect {
  id: string;
  name: string;
  username: string;
}

// Usa paths relativos - o axios já tem baseURL configurado (getApiUrl)
export const userService = {
  async getUsersForSelect(): Promise<UserSelect[]> {
    return withConnectionRetry(async () => {
      const mapToSelect = (data: Array<{ id: string; name?: string; username: string }>): UserSelect[] =>
        data.map((u) => ({ id: u.id, name: u.name || u.username, username: u.username }));

      try {
        const response = await api.get('/users', { params: { selectOnly: true } });
        const items = response.data as Array<{ id: string; name?: string; username: string; roles?: unknown }>;
        if (Array.isArray(items) && items.length > 0 && !('roles' in items[0])) {
          return mapToSelect(items);
        }
        if (Array.isArray(items) && items.length > 0) {
          return mapToSelect(items);
        }
      } catch {
        // tenta endpoint dedicado
      }

      try {
        const response = await api.get('/users/select');
        return mapToSelect(response.data);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 400 && status !== 404) throw error;
      }

      const response = await api.get('/users');
      return mapToSelect(response.data);
    }, 2, 1500);
  },

  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async getUsersPaged(params: {
    page?: number;
    size?: number;
    search?: string;
    role?: string;
    onlineOnly?: boolean;
  }): Promise<UserPageResponse> {
    const response = await api.get('/users/paged', {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 50,
        search: params.search?.trim() || undefined,
        role: params.role && params.role !== 'all' ? params.role : undefined,
        onlineOnly: params.onlineOnly ? true : undefined,
      },
    });
    return response.data;
  },

  async searchUsers(query?: string): Promise<User[]> {
    const params = query ? { query } : {};
    const response = await api.get('/users/search', { params });
    return response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await api.post('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async toggleUserStatus(id: string, active: boolean): Promise<User> {
    return this.updateUser(id, { active });
  },

  async addUserPermissions(userId: string, permissionIds: string[]): Promise<any[]> {
    const response = await api.post(`/users/${userId}/permissions`, permissionIds);
    return response.data;
  },

  async removeUserPermissions(userId: string, permissionIds: string[]): Promise<any[]> {
    // Axios delete with body requires 'data' property
    const response = await api.delete(`/users/${userId}/permissions`, {
      data: permissionIds
    });
    return response.data;
  }
};

export default userService;