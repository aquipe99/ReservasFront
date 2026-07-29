import { CommonModule } from '@angular/common';
import { Component, effect, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ReceiptSeriesRequest } from '../../core/models/receipt-series-request';
import { Auth } from '../../core/services/auth/auth';
import { ReceiptSeries } from '../../core/services/receipt-series/receipt-series';

@Component({
  selector: 'app-receipt-series',
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    RadioButtonModule,
    TableModule,
    TagModule,
    ToolbarModule
  ],
  templateUrl: './receipt-series.html',
  styleUrl: './receipt-series.scss',
  providers: [ConfirmationService]
})
export class ReceiptSeriesComponent {
  @ViewChild('dt') dt!: Table;

  breadcrumbHome = { icon: 'pi pi-home', to: '/' };
  breadcrumbItems = [{ label: 'Dashboard' }, { label: 'Series' }];

  series = signal<ReceiptSeriesRequest[]>([]);
  selectedSeries: ReceiptSeriesRequest = this.emptySeries();

  totalRecords = 0;
  loading = false;
  saving = false;
  globalFilter = '';
  dialogVisible = false;
  submitted = false;
  backendErrors: { [key: string]: string } = {};

  canCreateSignal = signal(false);
  canUpdateSignal = signal(false);
  canDeleteSignal = signal(false);

  constructor(
    private auth: Auth,
    private service: ReceiptSeries,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    effect(() => {
      const user = this.auth.userSignal();
      const menu = user?.menus ? this.findMenuByLink(user.menus, '/Serie') : null;
      this.canCreateSignal.set(!!menu?.canCreate);
      this.canUpdateSignal.set(!!menu?.canUpdate);
      this.canDeleteSignal.set(!!menu?.canDelete);
    });
  }

  ngOnInit() {
    if (this.auth.isAuthenticated) {
      this.auth.refreshPermissions().subscribe({
        next: () => this.dt?.reset(),
        error: (error) => {
          this.toast(
            error.error?.message || 'Ocurrió un error al obtener los permisos',
            'error'
          );
        }
      });
    }
  }

  load(event: TableLazyLoadEvent) {
    this.loading = true;
    const page = (event.first ?? 0) / (event.rows ?? 10);
    const size = event.rows ?? 10;
    const rawSortField = event.sortField ?? 'id';
    const sortField = Array.isArray(rawSortField)
      ? rawSortField[0]
      : rawSortField;
    const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';

    this.service
      .getAll(page, size, sortField, sortOrder, this.globalFilter)
      .subscribe({
        next: (response) => {
          this.series.set(response.data.content);
          this.totalRecords = response.data.totalElements;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.toast(
            error.error?.message || 'Ocurrió un error al obtener las series',
            'error'
          );
        }
      });
  }

  onSearch(event: Event) {
    this.globalFilter = (event.target as HTMLInputElement).value;
    this.dt.reset();
  }

  openNew() {
    this.selectedSeries = this.emptySeries();
    this.submitted = false;
    this.backendErrors = {};
    this.dialogVisible = true;
  }

  edit(item: ReceiptSeriesRequest) {
    this.selectedSeries = { ...item };
    this.submitted = false;
    this.backendErrors = {};
    this.dialogVisible = true;
  }

  isSeriesCodeInvalid(): boolean {
    return !/^T[0-9]{3}$/.test(
      this.selectedSeries.seriesCode.trim().toUpperCase()
    );
  }

  save() {
    this.submitted = true;
    this.backendErrors = {};

    if (
      this.isSeriesCodeInvalid()
      || this.selectedSeries.nextNumber < 1
    ) {
      return;
    }

    const payload: ReceiptSeriesRequest = {
      documentType: 'TICKET',
      seriesCode: this.selectedSeries.seriesCode.trim().toUpperCase(),
      nextNumber: this.selectedSeries.nextNumber,
      status: this.selectedSeries.status
    };

    const request = this.selectedSeries.id
      ? this.service.update(this.selectedSeries.id, payload)
      : this.service.create(payload);

    this.saving = true;
    request.subscribe({
      next: (response) => {
        this.saving = false;
        this.dialogVisible = false;
        this.dt.reset();
        this.toast(response.message || 'Serie guardada correctamente', 'success');
      },
      error: (error) => {
        this.saving = false;
        this.backendErrors = this.mapBackendErrors(error.error?.errors);
        this.toast(
          error.error?.message || 'Ocurrió un error al guardar la serie',
          error.status === 409 ? 'warn' : 'error'
        );
      }
    });
  }

  remove(item: ReceiptSeriesRequest) {
    this.confirmationService.confirm({
      message: `¿Eliminar la serie "${item.seriesCode}"?`,
      accept: () => {
        this.service.delete(item.id!).subscribe({
          next: (response) => {
            this.dt.reset();
            this.toast(
              response.message || 'Serie eliminada correctamente',
              'success'
            );
          },
          error: (error) => {
            this.toast(
              error.error?.message || 'Ocurrió un error al eliminar la serie',
              error.status === 404 ? 'warn' : 'error'
            );
          }
        });
      }
    });
  }

  private emptySeries(): ReceiptSeriesRequest {
    return {
      documentType: 'TICKET',
      seriesCode: 'T001',
      nextNumber: 1,
      status: true
    };
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
