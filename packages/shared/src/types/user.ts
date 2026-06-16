import { RoleType } from '../enums/index.js';

export interface User {
  id: string;
  tenantId: string;
  username: string;
  mobile?: string;
  email?: string;
  realName: string;
  roleType: RoleType;
  /** 律师执业证号(仅律师) */
  licenseNo?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  tenantId: string;
  username: string;
  password: string;
  realName: string;
  roleType: RoleType;
  mobile?: string;
  email?: string;
  licenseNo?: string;
}

/** JWT payload */
export interface JwtPayload {
  sub: string; // user id
  tid: string; // tenant id
  role: RoleType;
  iat?: number;
  exp?: number;
}
