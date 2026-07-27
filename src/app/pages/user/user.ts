import { Component, effect, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth } from '../../core/services/auth/auth';
import { UserService } from '../../core/services/user.service';
import { Role } from '../../core/services/role/role';
import { UserRequest } from '../../core/models/user-request';
import { UserResponse } from '../../core/models/user-response';
import { RoleRequest } from '../../core/models/role-request';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-user-crud',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ToastModule,
    BreadcrumbModule,
    ButtonModule,
    ToolbarModule,
    InputIconModule,
    InputTextModule,
    DialogModule,
    ConfirmDialogModule,
    TagModule,
    IconFieldModule,
    RadioButtonModule,
    SelectModule
  ],
  templateUrl: './user.html',
  styleUrl: './user.scss',
  providers: [ConfirmationService]
})
export class UserComponent {
  @ViewChild('dt') dt!: Table;

  breadcrumbHome = { icon: 'pi pi-home', to: '/' };
  breadcrumbItems = [
    { label: 'Dashboard' },
    { label: 'Usuarios' }
  ];

  users = signal<UserResponse[]>([]);
  roles = signal<RoleRequest[]>([]);
  
  totalRecords = 0;
  loading = false;
  globalFilter = '';
  
  dialogVisible = false;
  submitted = false;
  dialogMode: 'create' | 'edit' = 'create';
  selectedUserId: number | null = null;

  userForm!: FormGroup;
  backendErrors: { [key: string]: string } = {};

  canCreateSignal = signal(false);
  canUpdateSignal = signal(false);
  canDeleteSignal = signal(false);

  constructor(
    private auth: Auth,
    private userService: UserService,
    private roleService: Role,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.initForm();
    effect(() => {
      const user = this.auth.userSignal();
      if (!user?.menus) {
        this.canCreateSignal.set(false);
        this.canUpdateSignal.set(false);
        this.canDeleteSignal.set(false);
        return;
      }
      const menuConfig = this.findMenuByLink(user.menus, '/Usuario');
      this.canCreateSignal.set(!!menuConfig?.canCreate);
      this.canUpdateSignal.set(!!menuConfig?.canUpdate);
      this.canDeleteSignal.set(!!menuConfig?.canDelete);
    });
  }

  ngOnInit() {
    if (this.auth.token) {
      this.auth.refreshPermissions().subscribe({
        next: () => {
          if (this.dt) {
            this.dt.reset();
          }
          this.loadRoles();
        },
        error: () => {
          this.toast('Ocurrió un error al obtener los permisos', 'error');
        }
      });
    }
  }

  private initForm() {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(20)]],
      phone: ['', [Validators.maxLength(10)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(256)]],
      roleId: [null, [Validators.required]],
      active: [true, [Validators.required]]
    });
  }

  canCreate(): boolean {
    return this.canCreateSignal();
  }

  canUpdate(): boolean {
    return this.canUpdateSignal();
  }

  canDelete(): boolean {
    return this.canDeleteSignal();
  }

  loadRoles() {
    this.roleService.getForSelect().subscribe({
      next: (res) => {
        this.roles.set(res.data.content);
      }
    });
  }

  load(event: TableLazyLoadEvent) {
    this.loading = true;
    const page = (event.first ?? 0) / (event.rows ?? 10);
    const size = event.rows ?? 10;
    const sortFieldRaw = event.sortField ?? 'id';
    const sortField = Array.isArray(sortFieldRaw) ? sortFieldRaw[0] : sortFieldRaw;
    const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
    const globalFilter = this.globalFilter;

    this.userService.getAll(page, size, sortField, sortOrder, globalFilter).subscribe({
      next: (res) => {
        this.users.set(res.data.content);
        this.totalRecords = res.data.totalElements;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(event: Event) {
    this.globalFilter = (event.target as HTMLInputElement).value;
    this.dt.reset();
  }

  openNew() {
    this.dialogMode = 'create';
    this.selectedUserId = null;
    this.submitted = false;
    this.backendErrors = {};
    
    this.userForm.reset({
      name: '',
      phone: '',
      email: '',
      password: '',
      roleId: null,
      active: true
    });
    
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(256)]);
    this.userForm.get('password')?.updateValueAndValidity();

    this.dialogVisible = true;
  }

  edit(item: UserResponse) {
    this.dialogMode = 'edit';
    this.selectedUserId = item.id;
    this.submitted = false;
    this.backendErrors = {};

    this.userForm.reset({
      name: item.name,
      phone: item.phone || '',
      email: item.email,
      password: '',
      roleId: item.roleId,
      active: item.active
    });

    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(256)]);
    this.userForm.get('password')?.updateValueAndValidity();

    this.dialogVisible = true;
  }

  save() {
    this.submitted = true;
    this.backendErrors = {};

    if (this.userForm.invalid) {
      return;
    }

    const payload: UserRequest = this.userForm.value;

    if (this.dialogMode === 'create') {
      this.userService.create(payload).subscribe({
        next: (res) => {
          this.dialogVisible = false;
          this.dt.reset();
          this.toast(res.message || 'Usuario creado correctamente', 'success');
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    } else {
      if (this.selectedUserId !== null) {
        this.userService.update(this.selectedUserId, payload).subscribe({
          next: (res) => {
            this.dialogVisible = false;
            this.dt.reset();
            this.toast(res.message || 'Usuario actualizado correctamente', 'success');
          },
          error: (err) => {
            this.handleError(err);
          }
        });
      }
    }
  }

  remove(item: UserResponse) {
    this.confirmationService.confirm({
      message: `¿Eliminar al usuario "${item.name}"?`,
      accept: () => {
        this.userService.delete(item.id).subscribe({
          next: (res) => {
            this.dt.reset();
            this.toast(res.message || 'Usuario eliminado correctamente', 'success');
          },
          error: (err) => {
            if (err.status === 403) {
              this.toast('No tienes permisos para eliminar este usuario', 'error');
            } else if (err.status === 404) {
              this.toast('Registro no encontrado', 'warn');
            } else {
              this.toast(err.error?.message || 'Ocurrió un error al eliminar', 'error');
            }
          }
        });
      }
    });
  }

  private handleError(err: any) {
    if (err.status === 400) {
      this.backendErrors = this.mapBackendErrors(err.error?.errors);
      if (!err.error?.errors) {
        this.toast(err.error?.message || 'Ocurrió un error de validación', 'error');
      }
    } else if (err.status === 403) {
      this.toast(err.error?.message || 'No autorizado', 'error');
    } else {
      this.toast(err.error?.message || 'Ocurrió un error inesperado', 'error');
    }
  }

  private mapBackendErrors(errors: any[] | null): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    if (!errors) return result;
    for (const error of errors) {
      result[error.field] = error.message;
    }
    return result;
  }

  toast(detail: string, severity: 'success' | 'error' | 'warn' = 'success') {
    this.messageService.add({
      severity,
      summary: severity === 'success' ? 'OK' : 'Error',
      detail,
      life: 3000
    });
  }

  private findMenuByLink(menus: any[], link: string): any | null {
    for (const menu of menus) {
      if (menu.link?.toLowerCase() === link.toLowerCase()) {
        return menu;
      }
      if (menu.items?.length) {
        const found = this.findMenuByLink(menu.items, link);
        if (found) return found;
      }
    }
    return null;
  }
}
