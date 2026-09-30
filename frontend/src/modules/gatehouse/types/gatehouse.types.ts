/**
 * Types and DTO contracts for Gatehouse / Access Control frontend module.
 */

export interface AreaLoanItem {
  id: string;
  area: string;
  entryTime: Date | string;
  lockerKey: string | null;
  towelNumber: string | null;
  towelQty: number;
  towelSize: string | null;
  observations?: string | null;
}

export interface AccessVehicle {
  plate: string;
  brand: string | null;
  model: string | null;
}

export interface AccessSearchResult {
  personId: string;
  fullName: string;
  documentId: string;
  photoUrl: string | null;
  membershipNumber: string;
  membershipType: string;
  status: 'GRANTED' | 'DENIED';
  reason: string | null;
  totalDebt: number;
  lastPaymentDate: Date | string | null;
  vehicles: AccessVehicle[];
  currentLocation: 'INSIDE' | 'OUTSIDE';
  lastVehiclePlate?: string | null;
  personType: string;
  pendingAreaLoans?: AreaLoanItem[];
}
