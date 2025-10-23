/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// TDZ-safe prisma mock wiring for all db imports used by routes
jest.mock('@/lib/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { prismaMock } = require('@/lib/__mocks__/prisma');
  return { prisma: prismaMock };
});
jest.mock('@/lib/db/index', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { prismaMock } = require('@/lib/__mocks__/prisma');
  return { prisma: prismaMock };
});

// Mock next-auth getServerSession for both import styles used in codebase
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock guard helpers used in provider/prescriptions GET
jest.mock('@/lib/api/guard', () => ({
  requirePermission: jest.fn(),
  ensureProviderPatientLink: jest.fn(),
  parseJson: jest.fn(),
}));

// Mock PrescriptionController so we can assert on pagination/clamping
jest.mock('@/lib/controllers/prescription.controller', () => ({
  PrescriptionController: {
    handleGetPrescriptions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}));

// Route handlers under test
import { GET as TestGET } from '../test/route';
import { GET as ReportsGET } from '../reports/[filename]/route';
import { GET as ProviderPrescriptionsGET } from '../provider/prescriptions/route';
import { GET as PatientIntakeGET } from '../patient/intake-form/route';

// Mocks and helpers
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prismaMock } = require('@/lib/__mocks__/prisma');
const { getServerSession: getServerSessionNext } = require('next-auth/next');
const { getServerSession: getServerSession } = require('next-auth');
const { PrescriptionController } = require('@/lib/controllers/prescription.controller');
const { requirePermission } = require('@/lib/api/guard');

describe('API security hardening tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin-only debug test endpoint', () => {
    it('returns 403 for non-admin user', async () => {
      (getServerSessionNext as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', isAdmin: false },
      });

      const req = new NextRequest('http://localhost:3000/api/test');
      const res = await TestGET(req);

      expect(res.status).toBe(403);
    });

    it('returns aggregate data for admin and excludes PII', async () => {
      (getServerSessionNext as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', isAdmin: true },
      });

      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.doctorPatientConnection.count.mockResolvedValue(2);

      const req = new NextRequest('http://localhost:3000/api/test');
      const res = await TestGET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.database.userCount).toBe(1);
      expect(data.database.connectionCount).toBe(2);
      expect(data.session).toBeUndefined();
    });
  });

  describe('Reports download traversal prevention', () => {
    it('rejects invalid filename patterns with 400', async () => {
      (getServerSessionNext as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', isAdmin: true },
      });

      const req = new NextRequest('http://localhost:3000/api/reports/../secrets.pdf');
      const res = await ReportsGET(req, { params: { filename: '../secrets.pdf' } });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toMatch(/invalid filename/i);
    });
  });

  describe('Provider prescriptions pagination clamping', () => {
    it('clamps negative page to 0 and large pageSize to max 100', async () => {
      (getServerSessionNext as jest.Mock).mockResolvedValue({
        user: { id: 'prov-1', isProvider: true },
      });
      (requirePermission as jest.Mock).mockImplementation(() => {});

      (PrescriptionController.handleGetPrescriptions as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      const req = new NextRequest('http://localhost:3000/api/provider/prescriptions?page=-5&pageSize=1000');
      const res = await ProviderPrescriptionsGET(req);

      expect(res.status).toBe(200);
      expect(PrescriptionController.handleGetPrescriptions).toHaveBeenCalled();

      // args: (request, session, providerId, 'PROVIDER', filters)
      const call = (PrescriptionController.handleGetPrescriptions as jest.Mock).mock.calls[0];
      const filters = call[4];
      expect(filters.limit).toBe(100);
      expect(filters.offset).toBe(0);
    });
  });

  describe('Patient intake form RBAC', () => {
    it('denies providers (401) on patient intake GET', async () => {
      // This route imports getServerSession from "next-auth"
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'provider-1', isProvider: true },
      });

      const req = new NextRequest('http://localhost:3000/api/patient/intake-form?appointmentId=appt-1');
      const res = await PatientIntakeGET(req);

      expect(res.status).toBe(401);
    });

    it('denies unauthenticated (401) on patient intake GET', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/patient/intake-form?appointmentId=appt-1');
      const res = await PatientIntakeGET(req);

      expect(res.status).toBe(401);
    });
  });
});