import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@config/api';
import { RouteSheetItem, CorrespondenceStats, CorrespondenceWorkflow } from '../modules/correspondence/types/correspondence.types';

interface CorrespondenceState {
  items: RouteSheetItem[];
  total: number;
  selectedItem: RouteSheetItem | null;
  stats: CorrespondenceStats | null;
  workflow: CorrespondenceWorkflow | null;
  settings: any | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  activeFilter: string;
  activeMailbox: 'INBOX' | 'OUTBOX' | 'COPIES' | 'PERSONAL_ARCHIVE' | 'ARCHIVED' | 'ALL';
  selectedGestion: number | 'ALL';
  searchQuery: string;
}

const currentYear = new Date().getFullYear();

const initialState: CorrespondenceState = {
  items: [],
  total: 0,
  selectedItem: null,
  stats: null,
  workflow: null,
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,
  activeFilter: 'ALL',
  activeMailbox: 'INBOX',
  selectedGestion: currentYear,
  searchQuery: '',
};

// Async Thunks
export const fetchRouteSheets = createAsyncThunk(
  'correspondence/fetchRouteSheets',
  async (
    params: {
      status?: string;
      priority?: string;
      area?: string;
      search?: string;
      senderType?: string;
      mailbox?: string;
      userArea?: string;
      year?: number | string;
    } | void,
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get('/correspondence/route-sheets', { params });
      return {
        items: response.data.data,
        total: response.data.total,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al cargar Hojas de Ruta');
    }
  }
);

export const archiveRouteSheet = createAsyncThunk(
  'correspondence/archive',
  async (
    {
      routeSheetId,
      data,
    }: {
      routeSheetId: string;
      data: { archiveLocation: string; archiveBox?: string; archiveNotes?: string; archiveType?: 'PERSONAL' | 'CENTRAL' };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/correspondence/route-sheets/${routeSheetId}/archive`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al archivar Hoja de Ruta');
    }
  }
);

export const unarchiveRouteSheet = createAsyncThunk(
  'correspondence/unarchive',
  async (
    {
      routeSheetId,
      data,
    }: {
      routeSheetId: string;
      data: { unarchiveReason: string; targetArea?: string };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/correspondence/route-sheets/${routeSheetId}/unarchive`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al desarchivar Hoja de Ruta');
    }
  }
);

export const fetchRouteSheetById = createAsyncThunk(
  'correspondence/fetchRouteSheetById',
  async (idOrCode: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/correspondence/route-sheets/${idOrCode}`);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener la Hoja de Ruta');
    }
  }
);

export const fetchCorrespondenceStats = createAsyncThunk(
  'correspondence/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/correspondence/stats');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al cargar estadísticas');
    }
  }
);

export const createRouteSheet = createAsyncThunk(
  'correspondence/create',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/correspondence/route-sheets', data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al crear Hoja de Ruta');
    }
  }
);

export const addMovement = createAsyncThunk(
  'correspondence/addMovement',
  async ({ routeSheetId, data }: { routeSheetId: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/correspondence/route-sheets/${routeSheetId}/movements`, data);
      return response.data.data?.routeSheet || response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al registrar instrucción');
    }
  }
);

export const updateRouteSheetStatus = createAsyncThunk(
  'correspondence/updateStatus',
  async ({ routeSheetId, data }: { routeSheetId: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/correspondence/route-sheets/${routeSheetId}/status`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al actualizar estado');
    }
  }
);

export const mergeRouteSheets = createAsyncThunk(
  'correspondence/mergeRouteSheets',
  async (
    data: { targetRouteSheetId: string; sourceRouteSheetIds: string[]; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post('/correspondence/route-sheets/merge', data);
      return response.data.data; // Consolidate target route sheet
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al fusionar Hojas de Ruta');
    }
  }
);

export const analyzeTextWithAi = createAsyncThunk(
  'correspondence/analyzeWithAi',
  async (text: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/correspondence/ai-assist', { text });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error en análisis asistivo');
    }
  }
);

export const uploadRouteSheetDocuments = createAsyncThunk(
  'correspondence/uploadDocuments',
  async (
    {
      routeSheetId,
      files,
      isDerivation,
      movementId,
      attachedPages,
    }: { routeSheetId: string; files: File[]; isDerivation?: boolean; movementId?: string; attachedPages?: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('documents', file);
      });
      if (isDerivation) {
        formData.append('isDerivation', 'true');
      }
      if (movementId) {
        formData.append('movementId', movementId);
      }
      if (attachedPages !== undefined && attachedPages > 0) {
        formData.append('attachedPages', attachedPages.toString());
      }

      const queryParams = new URLSearchParams();
      if (isDerivation) queryParams.append('isDerivation', 'true');
      if (movementId) queryParams.append('movementId', movementId);
      if (attachedPages !== undefined && attachedPages > 0) {
        queryParams.append('attachedPages', attachedPages.toString());
      }
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const response = await api.post(
        `/correspondence/route-sheets/${routeSheetId}/documents${queryString}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Refresh item to include new documents
      dispatch(fetchRouteSheetById(routeSheetId));
      dispatch(fetchRouteSheets());

      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al digitalizar documentos');
    }
  }
);

export const notifySlaAlert = createAsyncThunk(
  'correspondence/notifySlaAlert',
  async (
    {
      routeSheetId,
      channel,
      note,
      customPhone,
      customEmail,
    }: {
      routeSheetId: string;
      channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
      note?: string;
      customPhone?: string;
      customEmail?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/correspondence/route-sheets/${routeSheetId}/notify-sla`, {
        channel,
        note,
        customPhone,
        customEmail,
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al emitir alerta SLA');
    }
  }
);

export const fetchWorkflowSettings = createAsyncThunk(
  'correspondence/fetchWorkflowSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/correspondence/settings');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener organigrama y flujos');
    }
  }
);

export const saveWorkflowSettings = createAsyncThunk(
  'correspondence/saveWorkflowSettings',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/correspondence/settings', payload);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al guardar organigrama');
    }
  }
);

export const fetchSlaSummary = createAsyncThunk(
  'correspondence/fetchSlaSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/correspondence/sla-summary');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener resumen SLA');
    }
  }
);

export const correspondenceSlice = createSlice({
  name: 'correspondence',
  initialState,
  reducers: {
    setActiveFilter: (state, action: PayloadAction<string>) => {
      state.activeFilter = action.payload;
    },
    setActiveMailbox: (state, action: PayloadAction<'INBOX' | 'OUTBOX' | 'COPIES' | 'PERSONAL_ARCHIVE' | 'ARCHIVED' | 'ALL'>) => {
      state.activeMailbox = action.payload;
    },
    setSelectedGestion: (state, action: PayloadAction<number | 'ALL'>) => {
      state.selectedGestion = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedItem: (state, action: PayloadAction<RouteSheetItem | null>) => {
      state.selectedItem = action.payload;
    },
    // Realtime Socket Handlers
    handleRealtimeCreated: (state, action: PayloadAction<RouteSheetItem>) => {
      const exists = state.items.some((i) => i.id === action.payload.id);
      if (!exists) {
        state.items.unshift(action.payload);
        state.total += 1;
      }
    },
    handleRealtimeUpdated: (state, action: PayloadAction<{ id: string; status: any; currentArea?: string }>) => {
      const index = state.items.findIndex((i) => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index].status = action.payload.status;
        if (action.payload.currentArea) {
          state.items[index].currentArea = action.payload.currentArea;
        }
      }
      if (state.selectedItem && state.selectedItem.id === action.payload.id) {
        state.selectedItem.status = action.payload.status;
        if (action.payload.currentArea) {
          state.selectedItem.currentArea = action.payload.currentArea;
        }
      }
    },
    updateWorkflowLocal: (state, action: PayloadAction<CorrespondenceWorkflow>) => {
      state.workflow = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchWorkflowSettings
    builder
      .addCase(fetchWorkflowSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        if (action.payload?.workflow) {
          state.workflow = action.payload.workflow;
        }
      });

    // saveWorkflowSettings
    builder
      .addCase(saveWorkflowSettings.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveWorkflowSettings.fulfilled, (state, action) => {
        state.isSaving = false;
        state.settings = action.payload;
        if (action.payload?.workflow) {
          state.workflow = action.payload.workflow;
        }
      })
      .addCase(saveWorkflowSettings.rejected, (state) => {
        state.isSaving = false;
      });

    // fetchRouteSheets
    builder
      .addCase(fetchRouteSheets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRouteSheets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(fetchRouteSheets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchRouteSheetById
    builder
      .addCase(fetchRouteSheetById.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
      });

    // fetchCorrespondenceStats
    builder
      .addCase(fetchCorrespondenceStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // createRouteSheet
    builder
      .addCase(createRouteSheet.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(createRouteSheet.fulfilled, (state, action) => {
        state.isSaving = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createRouteSheet.rejected, (state) => {
        state.isSaving = false;
      });

    // addMovement
    builder
      .addCase(addMovement.fulfilled, (state, action) => {
        const hr = (action.payload as any)?.routeSheet || action.payload;
        state.selectedItem = hr;
        const index = state.items.findIndex((i) => i.id === hr?.id);
        if (index !== -1 && hr) {
          state.items[index] = hr;
        }
      });

    // updateRouteSheetStatus
    builder
      .addCase(updateRouteSheetStatus.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // mergeRouteSheets
    builder
      .addCase(mergeRouteSheets.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // archiveRouteSheet
    builder
      .addCase(archiveRouteSheet.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // unarchiveRouteSheet
    builder
      .addCase(unarchiveRouteSheet.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export const {
  setActiveFilter,
  setActiveMailbox,
  setSelectedGestion,
  setSearchQuery,
  setSelectedItem,
  handleRealtimeCreated,
  handleRealtimeUpdated,
  updateWorkflowLocal,
} = correspondenceSlice.actions;

export default correspondenceSlice.reducer;
