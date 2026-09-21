import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

describe('Authentication Vulnerabilities & Security Fixes (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configService: ConfigService;

  const testPass = 'CustomSecretPassword2026!';
  let hashedTestPass: string;

  beforeAll(async () => {
    hashedTestPass = await bcrypt.hash(testPass, 10);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    configService = app.get<ConfigService>(ConfigService);

    // Clean up any test users from prior runs
    await prisma.employees.deleteMany({
      where: { email: { contains: 'authtest_' } },
    });
    await prisma.customers.deleteMany({
      where: { email: { contains: 'authtest_' } },
    });
  });

  afterAll(async () => {
    await prisma.employees.deleteMany({
      where: { email: { contains: 'authtest_' } },
    });
    await prisma.customers.deleteMany({
      where: { email: { contains: 'authtest_' } },
    });
    await app.close();
  });

  describe('BUG 1 — Universal password backdoor & Null password bypass', () => {
    it('should reject wrong passwords AND backdoor password123 for SYSTEM_ADMIN', async () => {
      const admin = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'AuthTest',
          last_name: 'Admin',
          email: 'authtest_admin@test.com',
          password: hashedTestPass,
          role: Role.SYSTEM_ADMIN,
        },
      });

      // Wrong password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password: 'randomwrongpassword' })
        .expect(401);

      // Backdoor password123
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password: 'password123' })
        .expect(401);

      // Correct password
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password: testPass })
        .expect(201);

      expect(res.body.user.email).toBe(admin.email);
      expect(res.body.user.role).toBe(Role.SYSTEM_ADMIN);
    });

    it('should reject wrong passwords AND backdoor password123 for BRANCH_MANAGER', async () => {
      const manager = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'AuthTest',
          last_name: 'Manager',
          email: 'authtest_mgr@test.com',
          password: hashedTestPass,
          role: Role.BRANCH_MANAGER,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: manager.email, password: 'password123' })
        .expect(401);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: manager.email, password: testPass })
        .expect(201);

      expect(res.body.user.role).toBe(Role.BRANCH_MANAGER);
    });

    it('should reject wrong passwords AND backdoor password123 for SALES_EXECUTIVE', async () => {
      const sales = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'AuthTest',
          last_name: 'Sales',
          email: 'authtest_sales@test.com',
          password: hashedTestPass,
          role: Role.SALES_EXECUTIVE,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: sales.email, password: 'password123' })
        .expect(401);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: sales.email, password: testPass })
        .expect(201);

      expect(res.body.user.role).toBe(Role.SALES_EXECUTIVE);
    });

    it('should reject wrong passwords AND backdoor password123 for CUSTOMER', async () => {
      const customer = await prisma.customers.create({
        data: {
          first_name: 'AuthTest',
          last_name: 'Customer',
          email: 'authtest_cust@test.com',
          password: hashedTestPass,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: customer.email, password: 'password123' })
        .expect(401);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: customer.email, password: testPass })
        .expect(201);

      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('should reject login for employee whose password column is null', async () => {
      const nullEmp = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'AuthTest',
          last_name: 'NullPwEmp',
          email: 'authtest_nullemp@test.com',
          password: null,
          role: Role.SALES_EXECUTIVE,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: nullEmp.email, password: '' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: nullEmp.email, password: 'password123' })
        .expect(401);
    });

    it('should reject login for customer whose password column is null', async () => {
      const nullCust = await prisma.customers.create({
        data: {
          first_name: 'AuthTest',
          last_name: 'NullPwCust',
          email: 'authtest_nullcust@test.com',
          password: null,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: nullCust.email, password: '' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: nullCust.email, password: 'password123' })
        .expect(401);
    });
  });

  describe('BUG 2 — Token refresh drops branch scoping', () => {
    it('should preserve branch_id in tokens returned by POST /auth/refresh', async () => {
      const branchManager = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'Scoped',
          last_name: 'Manager',
          email: 'authtest_scopedmgr@test.com',
          password: hashedTestPass,
          role: Role.BRANCH_MANAGER,
        },
      });

      // 1. Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: branchManager.email, password: testPass })
        .expect(201);

      const loginAccessToken = loginRes.body.accessToken;
      const loginRefreshToken = loginRes.body.refreshToken;

      const decodedLoginToken: any = jwt.decode(loginAccessToken);
      expect(decodedLoginToken.branch_id).toBe(1);
      expect(decodedLoginToken.role).toBe(Role.BRANCH_MANAGER);

      // 2. Refresh
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRefreshToken })
        .expect(201);

      const refreshedAccessToken = refreshRes.body.accessToken;
      const decodedRefreshedToken: any = jwt.decode(refreshedAccessToken);

      // Must have the exact same branch_id
      expect(decodedRefreshedToken.branch_id).toBe(1);
      expect(decodedRefreshedToken.role).toBe(Role.BRANCH_MANAGER);
    });

    it('should maintain branch scoping on /analytics/overview before and after refresh', async () => {
      const branchManager = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'Branch1',
          last_name: 'Manager',
          email: 'authtest_branch1mgr@test.com',
          password: hashedTestPass,
          role: Role.BRANCH_MANAGER,
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: branchManager.email, password: testPass })
        .expect(201);

      const originalToken = loginRes.body.accessToken;
      const refreshToken = loginRes.body.refreshToken;

      // Call overview with ?branchId=2 using original token
      const resBefore = await request(app.getHttpServer())
        .get('/analytics/overview?branchId=2')
        .set('Authorization', `Bearer ${originalToken}`)
        .expect(200);

      // Refresh token
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      const refreshedToken = refreshRes.body.accessToken;

      // Call overview with ?branchId=2 using refreshed token
      const resAfter = await request(app.getHttpServer())
        .get('/analytics/overview?branchId=2')
        .set('Authorization', `Bearer ${refreshedToken}`)
        .expect(200);

      // Both should yield identical scoped data (branch 1)
      expect(resBefore.body).toEqual(resAfter.body);
    });
  });

  describe('BUG 3 — Roles derived from enum rather than free-text job titles', () => {
    it('should NOT elevate an employee with job_title "Assistant Manager" or "Admin Assistant" to BRANCH_MANAGER', async () => {
      const assistant = await prisma.employees.create({
        data: {
          branch_id: 1,
          first_name: 'Assistant',
          last_name: 'Manager',
          email: 'authtest_asstmgr@test.com',
          password: hashedTestPass,
          role: Role.SALES_EXECUTIVE,
          job_title: 'Assistant Manager',
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: assistant.email, password: testPass })
        .expect(201);

      // Role must be SALES_EXECUTIVE, not BRANCH_MANAGER
      expect(res.body.user.role).toBe(Role.SALES_EXECUTIVE);
      expect(res.body.user.job_title).toBe('Assistant Manager');
    });
  });
});
