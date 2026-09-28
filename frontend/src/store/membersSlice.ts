import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@config/api';

export interface MemberProfile {
  membershipNumber: string;
  fullName?: string;
  status: string;
  category: string;
  antiquityYears: number;
  beneficiariesCount: number;
  horsesCount: number;
  vehiclesCount: number;
  reservationsThisMonth: number;
  debt: number;
  totalDebt?: number;
  lastEntry: string;
  nextQuotaDate: string;
}

export interface AccessLog {
  id: string;
  memberProfileId: string;
  memberName: string;
  membershipNumber: string;
  timestamp: string;
  status: 'GRANTED' | 'DENIED';
  reason: string | null;
}

interface MembersState {
  currentProfile: MemberProfile | null;
  accessLogs: AccessLog[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MembersState = {
  currentProfile: null,
  accessLogs: [],
  isLoading: false,
  error: null,
};

// Async Thunks
export const fetchCurrentProfile = createAsyncThunk(
  'members/fetchCurrentProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/members/me');
      return response.data.profile;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener el perfil de socio.');
    }
  }
);

export const fetchAccessLogs = createAsyncThunk(
  'members/fetchAccessLogs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/members/access/logs');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener registros de acceso.');
    }
  }
);

export const checkMemberAccess = createAsyncThunk(
  'members/checkMemberAccess',
  async (membershipNumber: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/members/access/check', { membershipNumber });
      return response.data.data; // Returns { allowed: boolean, member: MemberProfile, log: AccessLog }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al realizar verificación de acceso.');
    }
  }
);

const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {
    clearCurrentProfile(state) {
      state.currentProfile = null;
    },
    addLocalAccessLog(state, action: PayloadAction<AccessLog>) {
      state.accessLogs = [action.payload, ...state.accessLogs];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchCurrentProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentProfile.fulfilled, (state, action: PayloadAction<MemberProfile>) => {
        state.isLoading = false;
        state.currentProfile = action.payload;
      })
      .addCase(fetchCurrentProfile.rejected, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Access Logs
      .addCase(fetchAccessLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccessLogs.fulfilled, (state, action: PayloadAction<AccessLog[]>) => {
        state.isLoading = false;
        state.accessLogs = action.payload;
      })
      .addCase(fetchAccessLogs.rejected, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Add checkMemberAccess fulfilled to append log
      .addCase(checkMemberAccess.fulfilled, (state, action: PayloadAction<{ allowed: boolean, member: MemberProfile, log: AccessLog }>) => {
        // Prepend the newly created log to the history
        state.accessLogs = [action.payload.log, ...state.accessLogs];
      });
  },
});

export const { clearCurrentProfile, addLocalAccessLog } = membersSlice.actions;
export default membersSlice.reducer;
export type { MembersState };
