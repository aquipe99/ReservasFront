import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { CompanyRequest } from '../../core/models/company-request';
import { Auth } from '../../core/services/auth/auth';
import { Company } from '../../core/services/company/company';

@Component({
  selector: 'app-company',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BreadcrumbModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    TextareaModule,
    ToolbarModule
  ],
  templateUrl: './company.html',
  styleUrl: './company.scss'
})
export class CompanyComponent {
  breadcrumbHome = { icon: 'pi pi-home', to: '/' };
  breadcrumbItems = [{ label: 'Dashboard' }, { label: 'Empresa' }];

  companyForm: FormGroup;
  companyId: number | null = null;
  loading = false;
  saving = false;
  submitted = false;
  backendErrors: { [key: string]: string } = {};

  canCreateSignal = signal(false);
  canUpdateSignal = signal(false);

  constructor(
    private auth: Auth,
    private service: Company,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    this.companyForm = this.fb.group({
      legalName: ['', [Validators.required, Validators.maxLength(150)]],
      tradeName: ['', [Validators.required, Validators.maxLength(150)]],
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      fiscalAddress: ['', [Validators.required, Validators.maxLength(250)]],
      phone: ['', [Validators.pattern('^[0-9]{9,10}$')]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      additionalInfo: ['', [Validators.maxLength(500)]],
      status: [true, [Validators.required]]
    });

    effect(() => {
      const user = this.auth.userSignal();
      const menu = user?.menus ? this.findMenuByLink(user.menus, '/Empresa') : null;
      this.canCreateSignal.set(!!menu?.canCreate);
      this.canUpdateSignal.set(!!menu?.canUpdate);
    });
  }

  ngOnInit() {
    if (this.auth.isAuthenticated) {
      this.auth.refreshPermissions().subscribe({
        next: () => this.loadCompany(),
        error: (error) => {
          this.toast(
            error.error?.message || 'Ocurrió un error al obtener los permisos',
            'error'
          );
        }
      });
    }
  }

  canSave(): boolean {
    return this.companyId === null
      ? this.canCreateSignal()
      : this.canUpdateSignal();
  }

  loadCompany() {
    this.loading = true;
    this.service.getCurrent().subscribe({
      next: (response) => {
        this.loading = false;
        this.companyId = response.data.id ?? null;
        this.companyForm.reset({
          legalName: response.data.legalName,
          tradeName: response.data.tradeName,
          ruc: response.data.ruc,
          fiscalAddress: response.data.fiscalAddress,
          phone: response.data.phone ?? '',
          email: response.data.email ?? '',
          additionalInfo: response.data.additionalInfo ?? '',
          status: response.data.status
        });
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 404) {
          this.companyId = null;
          this.companyForm.reset({
            legalName: '',
            tradeName: '',
            ruc: '',
            fiscalAddress: '',
            phone: '',
            email: '',
            additionalInfo: '',
            status: true
          });
          return;
        }
        this.toast(
          error.error?.message || 'Ocurrió un error al obtener la empresa',
          'error'
        );
      }
    });
  }

  save() {
    this.submitted = true;
    this.backendErrors = {};

    if (this.companyForm.invalid || !this.canSave()) {
      return;
    }

    const value = this.companyForm.getRawValue();
    const payload: CompanyRequest = {
      legalName: value.legalName.trim(),
      tradeName: value.tradeName.trim(),
      ruc: value.ruc.trim(),
      fiscalAddress: value.fiscalAddress.trim(),
      phone: value.phone?.trim() || null,
      email: value.email?.trim() || null,
      additionalInfo: value.additionalInfo?.trim() || null,
      status: value.status
    };

    const request = this.companyId === null
      ? this.service.create(payload)
      : this.service.update(this.companyId, payload);

    this.saving = true;
    request.subscribe({
      next: (response) => {
        this.saving = false;
        this.companyId = response.data.id ?? this.companyId;
        this.toast(response.message || 'Empresa guardada correctamente', 'success');
      },
      error: (error) => {
        this.saving = false;
        this.backendErrors = this.mapBackendErrors(error.error?.errors);
        this.toast(
          error.error?.message || 'Ocurrió un error al guardar la empresa',
          error.status === 409 ? 'warn' : 'error'
        );
      }
    });
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
