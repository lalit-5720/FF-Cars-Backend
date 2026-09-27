import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { RoleDefinition, RolePermissions } from './roles.types';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'SYSTEM_ADMIN',
    name: 'System Administrator (Founder)',
    description: 'Full unconstrained multi-branch access, staff compensation management, and system governance.',
    isSystemDefault: true,
    permissions: {
      canAccessOverview: true,
      canAccessInventory: true,
      canManageInventory: true,
      canAccessSales: true,
      canManageSales: true,
      canAccessDeliveries: true,
      canManageDeliveries: true,
      canAccessLeads: true,
      canManageLeads: true,
      canAccessTestDrives: true,
      canManageTestDrives: true,
      canAccessReviews: true,
      canAccessReports: true,
      canAccessEmployees: true,
      canManageEmployees: true,
      canAccessSettings: true,
      canSelectBranch: true,
    },
  },
  {
    id: 'BRANCH_MANAGER',
    name: 'Showroom Branch Manager',
    description: 'Oversees showroom inventory, leads distribution, sales pipeline, and vehicle handovers for their branch.',
    isSystemDefault: true,
    permissions: {
      canAccessOverview: true,
      canAccessInventory: true,
      canManageInventory: true,
      canAccessSales: true,
      canManageSales: true,
      canAccessDeliveries: true,
      canManageDeliveries: true,
      canAccessLeads: true,
      canManageLeads: true,
      canAccessTestDrives: true,
      canManageTestDrives: true,
      canAccessReviews: true,
      canAccessReports: true,
      canAccessEmployees: true,
      canManageEmployees: false,
      canAccessSettings: false,
      canSelectBranch: false,
    },
  },
  {
    id: 'SALES_EXECUTIVE',
    name: 'Sales & Concierge Executive',
    description: 'Client outreach, scheduling and conducting test-drives, logging feedback, and customer vehicle handovers.',
    isSystemDefault: true,
    permissions: {
      canAccessOverview: true,
      canAccessInventory: false,
      canManageInventory: false,
      canAccessSales: false,
      canManageSales: false,
      canAccessDeliveries: true,
      canManageDeliveries: true,
      canAccessLeads: true,
      canManageLeads: true,
      canAccessTestDrives: true,
      canManageTestDrives: true,
      canAccessReviews: false,
      canAccessReports: false,
      canAccessEmployees: false,
      canManageEmployees: false,
      canAccessSettings: false,
      canSelectBranch: false,
    },
  },
  {
    id: 'FINANCE_EXECUTIVE',
    name: 'Finance & Loan Desk Officer',
    description: 'Specialist managing token settlements, partner bank loan submissions, 2% dealer commission payouts, and reports.',
    isSystemDefault: true,
    permissions: {
      canAccessOverview: true,
      canAccessInventory: false,
      canManageInventory: false,
      canAccessSales: true,
      canManageSales: true,
      canAccessDeliveries: false,
      canManageDeliveries: false,
      canAccessLeads: false,
      canManageLeads: false,
      canAccessTestDrives: false,
      canManageTestDrives: false,
      canAccessReviews: false,
      canAccessReports: true,
      canAccessEmployees: false,
      canManageEmployees: false,
      canAccessSettings: false,
      canSelectBranch: false,
    },
  },
  {
    id: 'INVENTORY_AUDITOR',
    name: 'Vehicle Quality & Inventory Auditor',
    description: 'Performs 150-point PDI checklists, manages stock condition, inter-branch reallocation, and dynamic repricing.',
    isSystemDefault: true,
    permissions: {
      canAccessOverview: true,
      canAccessInventory: true,
      canManageInventory: true,
      canAccessSales: false,
      canManageSales: false,
      canAccessDeliveries: true,
      canManageDeliveries: false,
      canAccessLeads: false,
      canManageLeads: false,
      canAccessTestDrives: true,
      canManageTestDrives: false,
      canAccessReviews: true,
      canAccessReports: true,
      canAccessEmployees: false,
      canManageEmployees: false,
      canAccessSettings: false,
      canSelectBranch: true,
    },
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  private roles: Map<string, RoleDefinition> = new Map();
  private storageFilePath: string = path.join(process.cwd(), 'data', 'custom-roles.json');

  onModuleInit() {
    this.loadRoles();
  }

  private loadRoles() {
    // 1. Seed defaults
    for (const r of DEFAULT_ROLES) {
      this.roles.set(r.id, { ...r });
    }

    // 2. Load custom persistent roles
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const customList: RoleDefinition[] = JSON.parse(raw);
        for (const item of customList) {
          if (item && item.id) {
            this.roles.set(item.id, item);
          }
        }
      }
    } catch (err) {
      console.warn('Could not read custom-roles.json, using defaults:', err);
    }
  }

  private saveRoles() {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Filter only custom non-system roles to save
      const customRoles = Array.from(this.roles.values()).filter((r) => !r.isSystemDefault);
      fs.writeFileSync(this.storageFilePath, JSON.stringify(customRoles, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving custom roles to file:', err);
    }
  }

  findAll(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  findById(id: string): RoleDefinition {
    const role = this.roles.get(id.toUpperCase());
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" was not found.`);
    }
    return role;
  }

  create(dto: { name: string; description?: string; permissions: Partial<RolePermissions> }): RoleDefinition {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Role name is required.');
    }

    const cleanName = dto.name.trim();
    const id = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    if (this.roles.has(id)) {
      throw new BadRequestException(`A role with ID "${id}" or name "${cleanName}" already exists.`);
    }

    const defaultPermissions: RolePermissions = {
      canAccessOverview: true,
      canAccessInventory: false,
      canManageInventory: false,
      canAccessSales: false,
      canManageSales: false,
      canAccessDeliveries: false,
      canManageDeliveries: false,
      canAccessLeads: false,
      canManageLeads: false,
      canAccessTestDrives: false,
      canManageTestDrives: false,
      canAccessReviews: false,
      canAccessReports: false,
      canAccessEmployees: false,
      canManageEmployees: false,
      canAccessSettings: false,
      canSelectBranch: false,
    };

    const newRole: RoleDefinition = {
      id,
      name: cleanName,
      description: dto.description?.trim() || 'Custom dealership role defined by System Admin.',
      isSystemDefault: false,
      permissions: {
        ...defaultPermissions,
        ...(dto.permissions || {}),
      },
      created_at: new Date().toISOString(),
    };

    this.roles.set(id, newRole);
    this.saveRoles();
    return newRole;
  }

  update(id: string, dto: { name?: string; description?: string; permissions?: Partial<RolePermissions> }): RoleDefinition {
    const existing = this.findById(id);

    if (existing.isSystemDefault) {
      throw new BadRequestException('System default roles cannot be modified.');
    }

    if (dto.name && dto.name.trim()) {
      existing.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      existing.description = dto.description.trim();
    }
    if (dto.permissions) {
      existing.permissions = {
        ...existing.permissions,
        ...dto.permissions,
      };
    }

    this.roles.set(id.toUpperCase(), existing);
    this.saveRoles();
    return existing;
  }

  remove(id: string): { success: boolean; message: string } {
    const existing = this.findById(id);
    if (existing.isSystemDefault) {
      throw new BadRequestException('System default roles cannot be deleted.');
    }

    this.roles.delete(id.toUpperCase());
    this.saveRoles();
    return { success: true, message: `Role "${existing.name}" has been deleted.` };
  }
}
