import api from '@/lib/axios';

// --- Interfaces ---

// Representa um funcionário simplificado, para uso dentro da Schedule
export interface ScheduleEmployee {
  id: string;
  name: string;
}

// Representa uma localização simplificada
export interface ScheduleLocation {
  id: string;
  name: string;
}

// Enum para os turnos (Shift)
export type Shift = 'DAY' | 'NIGHT' | 'MIXED';

// Enum para o status da escala (ScheduleStatus)
export type ScheduleStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

// Interface principal para a Escala de Trabalho
export interface Schedule {
  id: string;
  employee: ScheduleEmployee;
  scheduleDate: string; // Formato YYYY-MM-DD
  shift: Shift;
  location: ScheduleLocation;
  status: ScheduleStatus;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

// DTO para criar uma nova escala
export interface CreateScheduleDTO {
  employeeId: string;
  locationId: string;
  scheduleDate: string; // Formato YYYY-MM-DD
  shift: Shift;
  status: ScheduleStatus;
  observations?: string;
}

// DTO para atualizar uma escala (todos os campos são opcionais)
export type UpdateScheduleDTO = Partial<CreateScheduleDTO>;

// --- Service ---

export const scheduleService = {
  /**
   * Busca todas as escalas de trabalho.
   */
  async findAll(): Promise<Schedule[]> {
    const response = await api.get('/api/schedules');
    return response.data;
  },

  /**
   * Busca uma escala de trabalho pelo seu ID.
   * @param id - O UUID da escala.
   */
  async findById(id: string): Promise<Schedule> {
    const response = await api.get(`/api/schedules/${id}`);
    return response.data;
  },

  /**
   * Busca todas as escalas de um funcionário específico.
   * @param employeeId - O UUID do funcionário.
   */
  async findByEmployeeId(employeeId: string): Promise<Schedule[]> {
    const response = await api.get(`/api/schedules/employee/${employeeId}`);
    return response.data;
  },

  /**
   * Busca escalas de trabalho por uma data específica.
   * @param date - A data no formato 'YYYY-MM-DD'.
   */
  async findByDate(date: string): Promise<Schedule[]> {
    const response = await api.get('/api/schedules/date', { params: { date } });
    return response.data;
  },

  /**
   * Cria uma nova escala de trabalho.
   * @param data - Os dados da nova escala.
   */
  async create(data: CreateScheduleDTO): Promise<Schedule> {
    const response = await api.post('/api/schedules', data);
    return response.data;
  },

  /**
   * Atualiza uma escala de trabalho existente.
   * @param id - O UUID da escala a ser atualizada.
   * @param data - Os dados a serem atualizados.
   */
  async update(id: string, data: UpdateScheduleDTO): Promise<Schedule> {
    const response = await api.put(`/api/schedules/${id}`, data);
    return response.data;
  },

  /**
   * Exclui uma escala de trabalho.
   * @param id - O UUID da escala a ser excluída.
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/schedules/${id}`);
  },

  /**
   * Busca todas as escalas de trabalho.
   */
  async getSchedules(): Promise<Schedule[]> {
    const response = await api.get('/api/schedules');
    return response.data;
  },

  /**
   * Busca escalas de trabalho por uma data específica.
   * @param date - A data no formato 'YYYY-MM-DD'.
   */
  async getSchedulesByDate(date: string): Promise<Schedule[]> {
    const response = await api.get('/api/schedules/date', { params: { date } });
    return response.data;
  },
}; 