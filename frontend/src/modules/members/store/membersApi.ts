import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@store/store';
import { getApiBaseUrl } from '@config/api';

export interface MemberProfile {
  id: string;
  userId: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  category: string;
  photoUrl: string | null;
  totalDebt: number;
  hasDebt: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface AccessLog {
  id: string;
  memberProfileId: string;
  timestamp: string;
  status: 'GRANTED' | 'DENIED';
  reason: string | null;
  memberFullName?: string;
  membershipNumber?: string;
}

export const membersApi = createApi({
  reducerPath: 'membersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${getApiBaseUrl()}/members`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Member', 'AccessLog'],
  endpoints: (builder) => ({
    getMemberProfile: builder.query<MemberProfile, void>({
      query: () => '/profile',
      providesTags: ['Member'],
    }),
    getAccessLogs: builder.query<AccessLog[], { limit?: number }>({
      query: (params) => ({
        url: '/access-logs',
        params,
      }),
      providesTags: ['AccessLog'],
    }),
    recordAccessAttempt: builder.mutation<{ success: boolean; data: any; message?: string }, { membershipNumber: string }>({
      query: (body) => ({
        url: '/access',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AccessLog'],
    }),
  }),
});

export const {
  useGetMemberProfileQuery,
  useGetAccessLogsQuery,
  useRecordAccessAttemptMutation,
} = membersApi;
