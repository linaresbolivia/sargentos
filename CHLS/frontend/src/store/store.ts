import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import membersReducer from './membersSlice';
import correspondenceReducer from './correspondenceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    members: membersReducer,
    correspondence: correspondenceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
