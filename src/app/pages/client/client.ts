import { CommonModule } from '@angular/common';
import { Component, effect, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ClientRequest } from '../../core/models/client-request';
import { Auth } from '../../core/services/auth/auth';
import { Client } from '../../core/services/client/client';

@Component({
  selector: 'app-client',
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
    SelectModule,
    TextareaModule
  ],
  templateUrl: './client.html',
  styleUrl: './client.scss',
  providers: [ConfirmationService]
})
export class ClientComponent {
  @ViewChild('dt') dt!: Table;

  breadcrumbHome = { icon: 'pi pi-home', to: '/' };
  breadcrumbItems = [{ label: 'Dashboard' }, { label: 'Clientes' }];

  documentTypes = [
    { label: 'DNI', value: 'DNI' },
    { label: 'RUC', value: 'RUC' },
    { label: 'Carné de Extranjería', value: 'CE' }
  ];

  clients = signal<ClientRequest[]>([]);
  totalRecords = 0;
  loading = false;
  globalFilter = '';

  dialogVisible = false;
  submitted = false;
  dialogMode: 'create' | 'edit' = 'create';
  selectedClientId: number | null = null;

  clientForm: FormGroup;
  backendErrors: { [key: string]: string } = {};

  canCreateSignal = signal(false);
  canUpdateSignal = signal(false);
  canDeleteSignal = signal(false);

  constructor(
    private auth: Auth,
    private service: Client,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.clientForm = this.fb.group({
      documentType: ['DNI', [Validators.required]],
      documentNumber: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      phone: ['', [Validators.pattern('^[0-9]{9,10}$')]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      address: ['', [Validators.maxLength(200)]],
      status: [true, [Validators.required]]
    });

    this.clientForm.get('documentType')?.valueChanges.subscribe(() => {
      this.applyDocumentValidators();
    });

    effect(() => {
      const user = this.auth.userSignal();
      const menu = user?.menus ? this.findMenuByLink(user.menus, '/Cliente') : null;
      this.canCreateSignal.set(!!menu?.canCreate);
      this.canUpdateSignal.set(!!menu?.canUpdate);
      this.canDeleteSignal.set(!!menu?.canDelete);
    });
  }

  ngOnInit() {
    if (this.auth.isAuthenticated) {
      this.auth.refreshPermissions().subscribe({
        next: () => {
          if (this.dt) {
            this.dt.reset();
          }
        },
        error: () => {
          this.toast('Ocurrió un error al obtener los permisos', 'error');
        }
      });
    }
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

  load(event: TableLazyLoadEvent) {
    this.loading = true;
    const page = (event.first ?? 0) / (event.rows ?? 10);
    const size = event.rows ?? 10;
    const sortFieldRaw = event.sortField ?? 'id';
    const sortField = Array.isArray(sortFieldRaw) ? sortFieldRaw[0] : sortFieldRaw;
    const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';

    this.service
      .getAll(page, size, sortField, sortOrder, this.globalFilter)
      .subscribe({
        next: (response) => {
          this.clients.set(response.data.content);
          this.totalRecords = response.data.totalElements;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.toast(error.error?.message || 'Ocurrió un error al listar clientes', 'error');
        }
      });
  }

  onSearch(event: Event) {
    this.globalFilter = (event.target as HTMLInputElement).value;
    this.dt.reset();
  }

  openNew() {
    this.dialogMode = 'create';
    this.selectedClientId = null;
    this.submitted = false;
    this.backendErrors = {};
    this.clientForm.reset({
      documentType: 'DNI',
      documentNumber: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      status: true
    });
    this.applyDocumentValidators();
    this.dialogVisible = true;
  }

  edit(client: ClientRequest) {
    this.dialogMode = 'edit';
    this.selectedClientId = client.id ?? null;
    this.submitted = false;
    this.backendErrors = {};
    this.clientForm.reset({
      documentType: client.documentType,
      documentNumber: client.documentNumber,
      name: client.name,
      phone: client.phone ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
      status: client.status
    });
    this.applyDocumentValidators();
    this.dialogVisible = true;
  }

  save() {
    this.submitted = true;
    this.backendErrors = {};

    if (this.clientForm.invalid) {
      return;
    }

    const value = this.clientForm.getRawValue();
    const payload: ClientRequest = {
      documentType: value.documentType,
      documentNumber: value.documentNumber.trim().toUpperCase(),
      name: value.name.trim(),
      phone: value.phone?.trim() || null,
      email: value.email?.trim() || null,
      address: value.address?.trim() || null,
      status: value.status
    };

    const request =
      this.dialogMode === 'create'
        ? this.service.create(payload)
        : this.service.update(this.selectedClientId!, payload);

    request.subscribe({
      next: (response) => {
        this.dialogVisible = false;
        this.dt.reset();
        this.toast(
          response.message ||
            (this.dialogMode === 'create'
              ? 'Cliente creado correctamente'
              : 'Cliente actualizado correctamente'),
          'success'
        );
      },
      error: (error) => this.handleError(error)
    });
  }

  remove(client: ClientRequest) {
    this.confirmationService.confirm({
      message: `¿Eliminar al cliente "${client.name}"?`,
      accept: () => {
        this.service.delete(client.id!).subscribe({
          next: (response) => {
            this.dt.reset();
            this.toast(response.message || 'Cliente eliminado correctamente', 'success');
          },
          error: (error) => {
            if (error.status === 403) {
              this.toast('No tienes permisos para eliminar este cliente', 'error');
            } else if (error.status === 404) {
              this.toast('Cliente no encontrado', 'warn');
            } else {
              this.toast(
                error.error?.message || 'Ocurrió un error al eliminar el cliente',
                'error'
              );
            }
          }
        });
      }
    });
  }

  get documentNumberLabel(): string {
    const type = this.clientForm.get('documentType')?.value;
    return type === 'RUC' ? 'RUC' : type === 'CE' ? 'Carné de Extranjería' : 'DNI';
  }

  get documentNumberHint(): string {
    const type = this.clientForm.get('documentType')?.value;
    if (type === 'RUC') {
      return 'El RUC debe contener 11 dígitos.';
    }
    if (type === 'CE') {
      return 'El carné debe contener entre 6 y 12 caracteres.';
    }
    return 'El DNI debe contener 8 dígitos.';
  }

  private applyDocumentValidators() {
    const type = this.clientForm.get('documentType')?.value;
    const pattern =
      type === 'RUC'
        ? '^[0-9]{11}$'
        : type === 'CE'
          ? '^[a-zA-Z0-9]{6,12}$'
          : '^[0-9]{8}$';
    this.clientForm
      .get('documentNumber')
      ?.setValidators([Validators.required, Validators.pattern(pattern)]);
    this.clientForm.get('documentNumber')?.updateValueAndValidity();
  }

  private handleError(error: any) {
    if (error.status === 400) {
      this.backendErrors = this.mapBackendErrors(error.error?.errors);
      if (!error.error?.errors) {
        this.toast(error.error?.message || 'Ocurrió un error de validación', 'error');
      }
    } else if (error.status === 409) {
      this.toast(error.error?.message || 'El documento ya se encuentra registrado', 'error');
    } else if (error.status === 403) {
      this.toast(error.error?.message || 'No autorizado', 'error');
    } else {
      this.toast(error.error?.message || 'Ocurrió un error inesperado', 'error');
    }
  }

  private mapBackendErrors(errors: any[] | null): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    if (!errors) {
      return result;
    }
    for (const error of errors) {
      result[error.field] = error.message;
    }
    return result;
  }

  private findMenuByLink(menus: any[], link: string): any | null {
    for (const menu of menus) {
      if (menu.link?.toLowerCase() === link.toLowerCase()) {
        return menu;
      }
      if (menu.items?.length) {
        const found = this.findMenuByLink(menu.items, link);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private toast(detail: string, severity: 'success' | 'error' | 'warn') {
    this.messageService.add({
      severity,
      summary: severity === 'success' ? 'OK' : severity === 'warn' ? 'Aviso' : 'Error',
      detail,
      life: 3000
    });
  }
}
