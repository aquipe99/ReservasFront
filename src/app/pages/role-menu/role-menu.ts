import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, TreeNode } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TreeTableModule } from 'primeng/treetable';
import { RoleMenuPermissionRequest } from '../../core/models/role-menu-permission-request';
import { RoleMenuResponse } from '../../core/models/role-menu-response';
import { RoleRequest } from '../../core/models/role-request';
import { Auth } from '../../core/services/auth/auth';
import { RoleMenu } from '../../core/services/role-menu/role-menu';
import { Role } from '../../core/services/role/role';

@Component({
  selector: 'app-role-menu',
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbModule,
    ButtonModule,
    CheckboxModule,
    SelectModule,
    ToolbarModule,
    TreeTableModule
  ],
  templateUrl: './role-menu.html',
  styleUrl: './role-menu.scss'
})
export class RoleMenuComponent {
  breadcrumbHome = { icon: 'pi pi-home', to: '/' };
  breadcrumbItems = [
    { label: 'Dashboard' },
    { label: 'Gestión de Permisos por Rol' }
  ];

  roles = signal<RoleRequest[]>([]);
  permissions = signal<RoleMenuResponse[]>([]);
  treeNodes = signal<TreeNode<RoleMenuResponse>[]>([]);

  selectedRoleId: number | null = null;
  loading = false;
  saving = false;

  canUpdateSignal = signal(false);

  constructor(
    private auth: Auth,
    private roleService: Role,
    private roleMenuService: RoleMenu,
    private messageService: MessageService
  ) {
    effect(() => {
      const user = this.auth.userSignal();
      const menu = user?.menus ? findMenuByLink(user.menus, '/Permiso') : null;
      this.canUpdateSignal.set(!!menu?.canUpdate);
    });
  }

  ngOnInit() {
    if (this.auth.isAuthenticated) {
      this.auth.refreshPermissions().subscribe({
        next: () => {
          this.loadRoles();
        },
        error: () => {
          this.toast('Ocurrió un error al obtener los permisos', 'error');
        }
      });
    }
  }

  canUpdate(): boolean {
    return this.canUpdateSignal();
  }

  loadRoles() {
    this.roleService.getForSelect().subscribe({
      next: (res) => {
        this.roles.set(res.data.content);

        if (this.selectedRoleId === null && res.data.content.length > 0) {
          this.selectedRoleId = res.data.content[0].id ?? null;
        }

        if (this.selectedRoleId !== null) {
          this.loadPermissions();
        }
      },
      error: (err) => {
        this.toast(err.error?.message || 'Ocurrió un error al obtener los roles', 'error');
      }
    });
  }

  onRoleChange() {
    if (this.selectedRoleId === null) {
      this.permissions.set([]);
      this.treeNodes.set([]);
      return;
    }

    this.loadPermissions();
  }

  loadPermissions() {
    if (this.selectedRoleId === null) return;

    this.loading = true;
    this.roleMenuService.getByRoleId(this.selectedRoleId).subscribe({
      next: (res) => {
        this.permissions.set(res.data);
        this.treeNodes.set(this.buildTree(res.data));
        this.loading = false;
      },
      error: (err) => {
        this.permissions.set([]);
        this.treeNodes.set([]);
        this.loading = false;
        this.toast(err.error?.message || 'Ocurrió un error al obtener los permisos del rol', 'error');
      }
    });
  }

  save() {
    if (this.selectedRoleId === null || !this.canUpdate()) return;

    const payload: RoleMenuPermissionRequest[] = this.permissions().map((permission) => {
      const isGroup = this.isGroupMenu(permission);

      return {
        menuId: permission.menuId,
        canCreate: isGroup ? false : permission.canCreate,
        canRead: isGroup ? false : permission.canRead,
        canUpdate: isGroup ? false : permission.canUpdate,
        canDelete: isGroup ? false : permission.canDelete
      };
    });

    this.saving = true;
    this.roleMenuService.updateByRole(this.selectedRoleId, payload).subscribe({
      next: (res) => {
        this.permissions.set(res.data);
        this.treeNodes.set(this.buildTree(res.data));
        this.saving = false;
        this.toast(res.message || 'Permisos actualizados correctamente', 'success');
        this.auth.refreshPermissions().subscribe({
          error: () => {}
        });
      },
      error: (err) => {
        this.saving = false;
        this.toast(err.error?.message || 'Ocurrió un error al guardar los permisos', 'error');
      }
    });
  }

  isGroupMenu(permission: RoleMenuResponse): boolean {
    return permission.menuLink === null
      && this.permissions().some((item) => item.parentMenu === permission.menuId);
  }

  private buildTree(permissions: RoleMenuResponse[]): TreeNode<RoleMenuResponse>[] {
    const nodes = new Map<number, TreeNode<RoleMenuResponse>>();

    for (const permission of permissions) {
      nodes.set(permission.menuId, {
        key: permission.menuId.toString(),
        data: permission,
        children: [],
        expanded: true
      });
    }

    const roots: TreeNode<RoleMenuResponse>[] = [];

    for (const permission of permissions) {
      const node = nodes.get(permission.menuId)!;
      const parent = permission.parentMenu !== null ? nodes.get(permission.parentMenu) : null;

      if (parent) {
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    this.sortNodes(roots);
    return roots;
  }

  private sortNodes(nodes: TreeNode<RoleMenuResponse>[]) {
    nodes.sort((first, second) =>
      (first.data?.menuOrder ?? 0) - (second.data?.menuOrder ?? 0)
    );

    for (const node of nodes) {
      if (node.children?.length) {
        this.sortNodes(node.children);
      }
    }
  }

  private toast(detail: string, severity: 'success' | 'error' | 'warn') {
    this.messageService.add({
      severity,
      summary: severity === 'success' ? 'OK' : 'Error',
      detail,
      life: 3000
    });
  }
}

function findMenuByLink(menus: any[], link: string): any | null {
  for (const menu of menus) {
    if (menu.link?.toLowerCase() === link.toLowerCase()) {
      return menu;
    }

    if (menu.items?.length) {
      const found = findMenuByLink(menu.items, link);
      if (found) return found;
    }
  }

  return null;
}
