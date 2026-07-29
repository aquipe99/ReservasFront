import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ClientRequest } from '../../core/models/client-request';
import { ReservationCalendarItemResponse } from '../../core/models/reservation-calendar-item-response';
import { ReservationCalendarResponse } from '../../core/models/reservation-calendar-response';
import { ReservationCancellationRequest } from '../../core/models/reservation-cancellation-request';
import { ReservationOptionsResponse } from '../../core/models/reservation-options-response';
import { ReservationPaymentRequest } from '../../core/models/reservation-payment-request';
import { ReservationRequest } from '../../core/models/reservation-request';
import { ReservationResponse } from '../../core/models/reservation-response';
import { ReservationTicketResponse } from '../../core/models/reservation-ticket-response';
import { Auth } from '../../core/services/auth/auth';
import { Client as ClientService } from '../../core/services/client/client';
import { Reservation as ReservationService } from '../../core/services/reservation/reservation';

interface CalendarDay {
  date: string;
  dayName: string;
  dayNumber: string;
  monthName: string;
}

@Component({
  selector: 'app-reservation',
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    TextareaModule,
    ToolbarModule,
    TooltipModule
  ],
  templateUrl: './reservation.html',
  styleUrl: './reservation.scss'
})
export class ReservationComponent {
  private static readonly OPENING_MINUTES = 7 * 60;
  private static readonly CLOSING_MINUTES = 23 * 60 + 30;
  private static readonly SLOT_MINUTES = 30;
  readonly todayIso = this.peruIsoDate(new Date());

  breadcrumbHome = { icon: 'pi pi-home', to: '/' };
  breadcrumbItems = [
    { label: 'Dashboard' },
    { label: 'Reservas' }
  ];

  calendar = signal<ReservationCalendarResponse | null>(null);
  options = signal<ReservationOptionsResponse>({
    courts: [],
    paymentMethods: []
  });
  weekDays = signal<CalendarDay[]>([]);
  selectedReservation = signal<ReservationResponse | null>(null);
  selectedTicket = signal<ReservationTicketResponse | null>(null);
  clients = signal<ClientRequest[]>([]);

  selectedDate = new Date();
  timeSlots = this.buildTimeSlots();

  loading = false;
  saving = false;
  paymentSaving = false;
  cancellationSaving = false;
  clientSaving = false;

  reservationDialogVisible = false;
  detailDialogVisible = false;
  paymentDialogVisible = false;
  cancellationDialogVisible = false;
  clientDialogVisible = false;
  calendarPreviewVisible = false;
  ticketPreviewVisible = false;
  calendarPreviewUrl: string | null = null;
  private calendarPreviewBlob: Blob | null = null;
  ticketLoading = false;
  ticketEmitting = false;

  dialogMode: 'create' | 'edit' = 'create';
  editingReservationId: number | null = null;

  reservation: ReservationRequest = this.emptyReservation();
  payment: ReservationPaymentRequest = {
    paymentMethodId: 0,
    amount: 0
  };
  cancellation: ReservationCancellationRequest = {
    reason: ''
  };
  newClient: ClientRequest = this.emptyClient();

  submitted = false;
  paymentSubmitted = false;
  cancellationSubmitted = false;
  clientSubmitted = false;
  backendErrors: { [key: string]: string } = {};
  clientBackendErrors: { [key: string]: string } = {};

  canCreateSignal = signal(false);
  canUpdateSignal = signal(false);
  canDeleteSignal = signal(false);
  canCreateClientSignal = signal(false);

  paymentTypes = [
    { label: 'Pago completo', value: 'PAGO_COMPLETO' },
    { label: 'Pago parcial', value: 'PAGO_PARCIAL' },
    { label: 'Sin pago', value: 'SIN_PAGO' }
  ];

  documentTypes = [
    { label: 'DNI', value: 'DNI' },
    { label: 'RUC', value: 'RUC' },
    { label: 'Carné de Extranjería', value: 'CE' }
  ];

  constructor(
    private auth: Auth,
    private service: ReservationService,
    private clientService: ClientService,
    private messageService: MessageService
  ) {
    effect(() => {
      const user = this.auth.userSignal();
      const menu = user?.menus ? findMenuByLink(user.menus, '/Reserva') : null;
      const clientMenu = user?.menus ? findMenuByLink(user.menus, '/Cliente') : null;

      this.canCreateSignal.set(!!menu?.canCreate);
      this.canUpdateSignal.set(!!menu?.canUpdate);
      this.canDeleteSignal.set(!!menu?.canDelete);
      this.canCreateClientSignal.set(!!clientMenu?.canCreate);
    });
  }

  ngOnInit() {
    if (this.auth.isAuthenticated) {
      this.auth.refreshPermissions().subscribe({
        next: () => {
          this.loadOptions();
          this.loadClients();
          this.loadCalendar();
        },
        error: (err) => {
          this.toast(
            err.error?.message || 'Ocurrió un error al obtener los permisos',
            'error'
          );
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

  canCreateClient(): boolean {
    return this.canCreateClientSignal();
  }

  loadOptions() {
    this.service.getOptions().subscribe({
      next: (res) => {
        this.options.set(res.data);
      },
      error: (err) => {
        this.toast(
          err.error?.message || 'Ocurrió un error al obtener las opciones de reserva',
          'error'
        );
      }
    });
  }

  loadClients() {
    this.clientService.getForSelect().subscribe({
      next: (res) => {
        this.clients.set(
          res.data.content
            .filter((client) => client.status)
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        );
      },
      error: (err) => {
        this.toast(
          err.error?.message || 'Ocurrió un error al obtener los clientes',
          'error'
        );
      }
    });
  }

  loadCalendar(date: Date = this.selectedDate) {
    this.loading = true;

    this.service.getCalendar(this.toIsoDate(date)).subscribe({
      next: (res) => {
        this.calendar.set(res.data);
        this.weekDays.set(this.buildWeekDays(res.data.weekStart));
        this.loading = false;
      },
      error: (err) => {
        this.calendar.set(null);
        this.weekDays.set([]);
        this.loading = false;
        this.toast(
          err.error?.message || 'Ocurrió un error al obtener el calendario',
          'error'
        );
      }
    });
  }

  onDateChange(date: Date | null) {
    if (!date) return;

    this.selectedDate = date;
    this.loadCalendar();
  }

  navigateWeek(days: number) {
    const date = new Date(this.selectedDate);
    date.setDate(date.getDate() + days);
    this.selectedDate = date;
    this.loadCalendar();
  }

  goToCurrentWeek() {
    this.selectedDate = new Date();
    this.loadCalendar();
  }

  get weekTitle(): string {
    const data = this.calendar();
    if (!data) return '';

    const start = this.parseIsoDate(data.weekStart);
    const end = this.parseIsoDate(data.weekEnd);
    const formatter = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  getReservations(
    date: string,
    courtId: number
  ): ReservationCalendarItemResponse[] {
    return (this.calendar()?.reservations ?? []).filter(
      (reservation) =>
        reservation.reservationDate === date
        && reservation.courtId === courtId
    );
  }

  getReservationPosition(
    reservation: ReservationCalendarItemResponse
  ): { [key: string]: string } {
    const startMinutes = this.timeToMinutes(reservation.startTime);
    const endMinutes = this.timeToMinutes(reservation.endTime);
    const topSlots =
      (startMinutes - ReservationComponent.OPENING_MINUTES)
      / ReservationComponent.SLOT_MINUTES;
    const durationSlots =
      (endMinutes - startMinutes) / ReservationComponent.SLOT_MINUTES;

    return {
      top: `${topSlots * 42}px`,
      height: `${Math.max(durationSlots * 42, 42)}px`
    };
  }

  isSlotAvailable(date: string, courtId: number, startTime: string): boolean {
    const start = this.timeToMinutes(startTime);
    const end = Math.min(
      start + ReservationComponent.SLOT_MINUTES,
      ReservationComponent.CLOSING_MINUTES
    );

    return !this.getReservations(date, courtId).some((reservation) => {
      const reservationStart = this.timeToMinutes(reservation.startTime);
      const reservationEnd = this.timeToMinutes(reservation.endTime);
      return reservationStart < end && reservationEnd > start;
    });
  }

  isPastCalendarDate(date: string): boolean {
    return date < this.todayIso;
  }

  openNew(date?: string, startTime?: string, courtId?: number) {
    if (!this.canCreate()) return;

    const reservationDate = date ?? this.toIsoDate(this.selectedDate);
    if (this.isPastCalendarDate(reservationDate)) return;

    const selectedStartTime = startTime ?? '07:00';

    this.dialogMode = 'create';
    this.editingReservationId = null;
    this.reservation = {
      ...this.emptyReservation(),
      reservationDate,
      startTime: selectedStartTime,
      endTime: this.addMinutes(selectedStartTime, 60),
      courtId: courtId ?? this.options().courts[0]?.id ?? 0
    };
    this.submitted = false;
    this.backendErrors = {};
    this.reservationDialogVisible = true;
  }

  openDetail(item: ReservationCalendarItemResponse) {
    this.selectedTicket.set(null);
    this.service.getById(item.id).subscribe({
      next: (res) => {
        this.selectedReservation.set(res.data);
        this.detailDialogVisible = true;
        if (res.data.status === 'PAGADO') {
          this.loadTicket(res.data.id);
        }
      },
      error: (err) => {
        this.toast(
          err.error?.message || 'Ocurrió un error al obtener la reserva',
          'error'
        );
      }
    });
  }

  loadTicket(reservationId: number) {
    this.ticketLoading = true;
    this.service.getTicket(reservationId).subscribe({
      next: (res) => {
        this.ticketLoading = false;
        this.selectedTicket.set(res.data);
      },
      error: (err) => {
        this.ticketLoading = false;
        this.selectedTicket.set(null);
        if (err.status !== 404) {
          this.toast(
            err.error?.message || 'Ocurrió un error al obtener el ticket',
            'error'
          );
        }
      }
    });
  }

  openEdit() {
    const selected = this.selectedReservation();
    if (!selected || !this.canUpdate() || selected.status === 'ANULADA') return;

    this.dialogMode = 'edit';
    this.editingReservationId = selected.id;
    this.reservation = {
      clientId: selected.clientId,
      clientName: selected.clientName,
      clientDocumentType: selected.clientDocumentType,
      clientDocumentNumber: selected.clientDocumentNumber,
      clientDni: selected.clientDni,
      phone: selected.phone,
      reservationDate: selected.reservationDate,
      startTime: this.normalizeTime(selected.startTime),
      endTime: this.normalizeTime(selected.endTime),
      courtId: selected.courtId,
      paymentMethodId: selected.paymentMethodId,
      paymentType: selected.paymentType,
      totalAmount: selected.totalAmount,
      paidAmount: selected.paidAmount
    };
    this.submitted = false;
    this.backendErrors = {};
    this.detailDialogVisible = false;
    this.reservationDialogVisible = true;
  }

  isPaidEdit(): boolean {
    return this.dialogMode === 'edit'
      && this.selectedReservation()?.status === 'PAGADO';
  }

  onClientSelect() {
    const selected = this.clients().find(
      (client) => client.id === this.reservation.clientId
    );
    if (!selected) {
      this.reservation.clientName = '';
      this.reservation.clientDocumentType = 'DNI';
      this.reservation.clientDocumentNumber = '';
      this.reservation.clientDni = null;
      this.reservation.phone = null;
      return;
    }

    this.applyClientToReservation(selected);
  }

  openNewClient() {
    this.newClient = this.emptyClient();
    this.clientSubmitted = false;
    this.clientBackendErrors = {};
    this.clientDialogVisible = true;
  }

  saveNewClient() {
    this.clientSubmitted = true;
    this.clientBackendErrors = {};

    if (!this.isNewClientValid()) {
      return;
    }

    const payload: ClientRequest = {
      ...this.newClient,
      documentNumber: this.newClient.documentNumber.trim().toUpperCase(),
      name: this.newClient.name.trim(),
      phone: this.newClient.phone?.trim() || null,
      email: this.newClient.email?.trim() || null,
      address: this.newClient.address?.trim() || null,
      status: true
    };

    this.clientSaving = true;
    this.clientService.create(payload).subscribe({
      next: (res) => {
        this.clientSaving = false;
        this.clientDialogVisible = false;
        this.clients.update((clients) =>
          [...clients, res.data].sort((a, b) => a.name.localeCompare(b.name, 'es'))
        );
        this.applyClientToReservation(res.data);
        this.toast(res.message || 'Cliente creado correctamente', 'success');
      },
      error: (err) => {
        this.clientSaving = false;
        this.clientBackendErrors = this.mapBackendErrors(err.error?.errors);
        this.toast(
          err.error?.message || 'Ocurrió un error al registrar el cliente',
          err.status === 409 ? 'warn' : 'error'
        );
      }
    });
  }

  onPaymentTypeChange() {
    if (this.reservation.paymentType === 'SIN_PAGO') {
      this.reservation.paymentMethodId = null;
      this.reservation.paidAmount = 0;
      return;
    }

    if (this.reservation.paymentType === 'PAGO_COMPLETO') {
      this.reservation.paidAmount = this.reservation.totalAmount || 0;
      return;
    }

    if (this.reservation.paidAmount >= this.reservation.totalAmount) {
      this.reservation.paidAmount = 0;
    }
  }

  onTotalAmountChange() {
    if (this.reservation.paymentType === 'PAGO_COMPLETO') {
      this.reservation.paidAmount = this.reservation.totalAmount || 0;
    }
  }

  saveReservation() {
    this.submitted = true;
    this.backendErrors = {};

    if (!this.isReservationValid()) return;

    const payload: ReservationRequest = {
      ...this.reservation,
      clientName: this.reservation.clientName.trim(),
      clientDocumentNumber: this.reservation.clientDocumentNumber.trim().toUpperCase(),
      clientDni:
        this.reservation.clientDocumentType === 'DNI'
          ? this.reservation.clientDocumentNumber.trim()
          : null,
      phone: this.reservation.phone?.trim() || null
    };

    const request$ =
      this.dialogMode === 'create'
        ? this.service.create(payload)
        : this.service.update(this.editingReservationId!, payload);

    this.saving = true;
    request$.subscribe({
      next: (res) => {
        this.saving = false;
        this.reservationDialogVisible = false;
        this.selectedReservation.set(res.data);
        this.loadCalendar(this.parseIsoDate(res.data.reservationDate));
        this.toast(
          res.message
            || (this.dialogMode === 'create'
              ? 'Reserva creada correctamente'
              : 'Reserva actualizada correctamente'),
          'success'
        );
      },
      error: (err) => {
        this.saving = false;
        this.backendErrors = this.mapBackendErrors(err.error?.errors);
        this.toast(
          err.error?.message || 'Ocurrió un error al guardar la reserva',
          err.status === 409 ? 'warn' : 'error'
        );
      }
    });
  }

  openPayment() {
    const selected = this.selectedReservation();
    if (!selected || !this.canUpdate() || selected.balanceAmount <= 0) return;

    this.payment = {
      paymentMethodId: this.options().paymentMethods[0]?.id ?? 0,
      amount: selected.balanceAmount
    };
    this.paymentSubmitted = false;
    this.backendErrors = {};
    this.paymentDialogVisible = true;
  }

  addPayment() {
    const selected = this.selectedReservation();
    this.paymentSubmitted = true;
    this.backendErrors = {};

    if (
      !selected
      || !this.payment.paymentMethodId
      || this.payment.amount <= 0
      || this.payment.amount > selected.balanceAmount
    ) {
      return;
    }

    this.paymentSaving = true;
    this.service.addPayment(selected.id, this.payment).subscribe({
      next: (res) => {
        this.paymentSaving = false;
        this.paymentDialogVisible = false;
        this.selectedReservation.set(res.data);
        this.loadCalendar(this.parseIsoDate(res.data.reservationDate));
        this.toast(res.message || 'Pago registrado correctamente', 'success');
      },
      error: (err) => {
        this.paymentSaving = false;
        this.backendErrors = this.mapBackendErrors(err.error?.errors);
        this.toast(
          err.error?.message || 'Ocurrió un error al registrar el pago',
          'error'
        );
      }
    });
  }

  openCancellation() {
    const selected = this.selectedReservation();
    if (
      !selected
      || !this.canDelete()
      || selected.status === 'PAGADO'
      || selected.status === 'ANULADA'
    ) {
      return;
    }

    this.cancellation = { reason: '' };
    this.cancellationSubmitted = false;
    this.backendErrors = {};
    this.cancellationDialogVisible = true;
  }

  cancelReservation() {
    const selected = this.selectedReservation();
    this.cancellationSubmitted = true;
    this.backendErrors = {};

    if (!selected || !this.cancellation.reason.trim()) return;

    const payload = { reason: this.cancellation.reason.trim() };
    this.cancellationSaving = true;

    this.service.cancel(selected.id, payload).subscribe({
      next: (res) => {
        this.cancellationSaving = false;
        this.cancellationDialogVisible = false;
        this.detailDialogVisible = false;
        this.selectedReservation.set(res.data);
        this.loadCalendar(this.parseIsoDate(res.data.reservationDate));
        this.toast(res.message || 'Reserva anulada correctamente', 'success');
      },
      error: (err) => {
        this.cancellationSaving = false;
        this.backendErrors = this.mapBackendErrors(err.error?.errors);
        this.toast(
          err.error?.message || 'Ocurrió un error al anular la reserva',
          'error'
        );
      }
    });
  }

  emitTicket() {
    const reservation = this.selectedReservation();
    if (
      !reservation
      || reservation.status !== 'PAGADO'
      || !this.canCreate()
    ) {
      return;
    }

    this.ticketEmitting = true;
    this.service.emitTicket(reservation.id).subscribe({
      next: (res) => {
        this.ticketEmitting = false;
        this.selectedTicket.set(res.data);
        this.ticketPreviewVisible = true;
        this.toast(res.message || 'Ticket emitido correctamente', 'success');
      },
      error: (err) => {
        this.ticketEmitting = false;
        this.toast(
          err.error?.message || 'Ocurrió un error al emitir el ticket',
          err.status === 409 ? 'warn' : 'error'
        );
      }
    });
  }

  openTicketPreview() {
    if (this.selectedTicket()) {
      this.ticketPreviewVisible = true;
    }
  }

  printTicket() {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) {
      this.toast('El navegador bloqueó la ventana de impresión', 'warn');
      return;
    }

    const paymentMethods = ticket.payments
      .map((payment) => payment.paymentMethodName)
      .filter((name, index, values) => values.indexOf(name) === index)
      .join(', ');

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${this.escapeHtml(ticket.fullNumber)}</title>
          <style>
            body { font-family: monospace; width: 72mm; margin: 0 auto; padding: 8mm 4mm; }
            h1, .center { text-align: center; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            hr { border: 0; border-top: 1px dashed #000; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; }
            .value { text-align: right; font-weight: bold; }
            @media print { body { width: auto; padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${this.escapeHtml(ticket.companyTradeName)}</h1>
          <div class="center">${this.escapeHtml(ticket.companyLegalName)}</div>
          <div class="center">RUC: ${this.escapeHtml(ticket.companyRuc)}</div>
          <div class="center">${this.escapeHtml(ticket.companyFiscalAddress)}</div>
          <hr>
          <div class="center"><strong>${this.escapeHtml(ticket.fullNumber)}</strong></div>
          <div class="center">Constancia interna de reserva</div>
          <hr>
          <div class="row"><span>Emisión:</span><span class="value">${this.escapeHtml(this.formatDateTime(ticket.issuedAt))}</span></div>
          <div class="row"><span>Cliente:</span><span class="value">${this.escapeHtml(ticket.clientName)}</span></div>
          <div class="row"><span>${this.escapeHtml(ticket.clientDocumentType)}:</span><span class="value">${this.escapeHtml(ticket.clientDocumentNumber)}</span></div>
          <div class="row"><span>Cancha:</span><span class="value">${this.escapeHtml(ticket.courtName)}</span></div>
          <div class="row"><span>Fecha:</span><span class="value">${this.escapeHtml(this.formatDate(ticket.reservationDate))}</span></div>
          <div class="row"><span>Horario:</span><span class="value">${this.escapeHtml(this.formatTimeRange(ticket.startTime, ticket.endTime))}</span></div>
          <hr>
          <div class="row"><span>Forma de pago:</span><span class="value">${this.escapeHtml(paymentMethods || '-')}</span></div>
          <div class="row"><span>Total pagado:</span><span class="value">${this.escapeHtml(this.formatCurrency(ticket.totalPaid))}</span></div>
          <hr>
          <div class="center">No es un comprobante tributario</div>
          ${ticket.companyAdditionalInfo
            ? `<div class="center">${this.escapeHtml(ticket.companyAdditionalInfo)}</div>`
            : ''}
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  printCalendar() {
    window.print();
  }

  async captureCalendar(share = false) {
    try {
      const image = await this.createCalendarImage();

      if (share) {
        await this.shareCalendarImage(image);
        return;
      }

      this.showCalendarPreview(image);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      console.error('No se pudo generar la captura del calendario', error);
      this.toast('No se pudo generar la captura del calendario', 'error');
    }
  }

  async shareCalendarPreview() {
    if (!this.calendarPreviewBlob) return;

    try {
      await this.shareCalendarImage(this.calendarPreviewBlob);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      console.error('No se pudo compartir el calendario', error);
      this.toast('No se pudo compartir el calendario', 'error');
    }
  }

  closeCalendarPreview() {
    this.calendarPreviewVisible = false;
  }

  releaseCalendarPreview() {
    if (this.calendarPreviewUrl) {
      URL.revokeObjectURL(this.calendarPreviewUrl);
    }

    this.calendarPreviewUrl = null;
    this.calendarPreviewBlob = null;
  }

  ngOnDestroy() {
    this.releaseCalendarPreview();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PAGADO':
        return 'Pagado';
      case 'PAGO_PARCIAL':
        return 'Pago parcial';
      case 'SEPARADO':
        return 'Separado';
      case 'ANULADA':
        return 'Anulada';
      default:
        return status;
    }
  }

  statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'PAGADO':
        return 'success';
      case 'PAGO_PARCIAL':
        return 'warn';
      case 'SEPARADO':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(this.parseIsoDate(value));
  }

  formatDateTime(value: string | null): string {
    if (!value) return '-';

    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  formatTimeRange(startTime: string, endTime: string): string {
    return `${this.normalizeTime(startTime)} - ${this.normalizeTime(endTime)}`;
  }

  isReservationDateInPast(): boolean {
    return !!this.reservation.reservationDate
      && this.reservation.reservationDate < this.todayIso;
  }

  private emptyReservation(): ReservationRequest {
    return {
      clientId: null,
      clientName: '',
      clientDocumentType: 'DNI',
      clientDocumentNumber: '',
      clientDni: null,
      phone: null,
      reservationDate: this.todayIso,
      startTime: '07:00',
      endTime: '08:00',
      courtId: 0,
      paymentMethodId: null,
      paymentType: 'SIN_PAGO',
      totalAmount: 0,
      paidAmount: 0
    };
  }

  private isReservationValid(): boolean {
    const request = this.reservation;
    const phone = request.phone?.trim() ?? '';
    const start = this.timeToMinutes(request.startTime);
    const end = this.timeToMinutes(request.endTime);
    const validBase =
      !!request.clientId
      && !!request.clientName.trim()
      && this.isValidDocument(
        request.clientDocumentType,
        request.clientDocumentNumber
      )
      && (!phone || /^[0-9]{9,10}$/.test(phone))
      && !!request.reservationDate
      && !this.isReservationDateInPast()
      && request.courtId > 0
      && request.totalAmount > 0
      && start >= ReservationComponent.OPENING_MINUTES
      && end <= ReservationComponent.CLOSING_MINUTES
      && start < end;

    if (!validBase) return false;

    if (request.paymentType === 'SIN_PAGO') {
      return request.paidAmount === 0;
    }

    if (!request.paymentMethodId) return false;

    if (request.paymentType === 'PAGO_COMPLETO') {
      return request.paidAmount === request.totalAmount;
    }

    return request.paymentType === 'PAGO_PARCIAL'
      && request.paidAmount > 0
      && request.paidAmount < request.totalAmount;
  }

  private emptyClient(): ClientRequest {
    return {
      documentType: 'DNI',
      documentNumber: '',
      name: '',
      phone: null,
      email: null,
      address: null,
      status: true
    };
  }

  private peruIsoDate(value: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(value);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  private applyClientToReservation(client: ClientRequest) {
    this.reservation.clientId = client.id ?? null;
    this.reservation.clientName = client.name;
    this.reservation.clientDocumentType = client.documentType;
    this.reservation.clientDocumentNumber = client.documentNumber;
    this.reservation.clientDni =
      client.documentType === 'DNI' ? client.documentNumber : null;
    this.reservation.phone = client.phone ?? null;
  }

  private isNewClientValid(): boolean {
    const client = this.newClient;
    const phone = client.phone?.trim() ?? '';
    const email = client.email?.trim() ?? '';
    const address = client.address?.trim() ?? '';

    return !!client.name.trim()
      && client.name.trim().length <= 100
      && this.isValidDocument(client.documentType, client.documentNumber)
      && (!phone || /^[0-9]{9,10}$/.test(phone))
      && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      && email.length <= 100
      && address.length <= 200;
  }

  isValidDocument(
    documentType: 'DNI' | 'RUC' | 'CE',
    documentNumber: string
  ): boolean {
    const number = documentNumber.trim();
    if (documentType === 'RUC') {
      return /^[0-9]{11}$/.test(number);
    }
    if (documentType === 'CE') {
      return /^[a-zA-Z0-9]{6,12}$/.test(number);
    }
    return /^[0-9]{8}$/.test(number);
  }

  documentHint(documentType: 'DNI' | 'RUC' | 'CE'): string {
    if (documentType === 'RUC') {
      return 'El RUC debe contener 11 dígitos.';
    }
    if (documentType === 'CE') {
      return 'El carné debe contener entre 6 y 12 caracteres.';
    }
    return 'El DNI debe contener 8 dígitos.';
  }

  private buildTimeSlots(): string[] {
    const slots: string[] = [];

    for (
      let minutes = ReservationComponent.OPENING_MINUTES;
      minutes < ReservationComponent.CLOSING_MINUTES;
      minutes += ReservationComponent.SLOT_MINUTES
    ) {
      slots.push(this.minutesToTime(minutes));
    }

    return slots;
  }

  private buildWeekDays(weekStart: string): CalendarDay[] {
    const start = this.parseIsoDate(weekStart);
    const days: CalendarDay[] = [];

    for (let index = 0; index < 7; index++) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      days.push({
        date: this.toIsoDate(date),
        dayName: new Intl.DateTimeFormat('es-PE', { weekday: 'short' })
          .format(date)
          .replace('.', ''),
        dayNumber: new Intl.DateTimeFormat('es-PE', { day: '2-digit' })
          .format(date),
        monthName: new Intl.DateTimeFormat('es-PE', { month: 'short' })
          .format(date)
          .replace('.', '')
      });
    }

    return days;
  }

  private addMinutes(time: string, minutesToAdd: number): string {
    const minutes = Math.min(
      this.timeToMinutes(time) + minutesToAdd,
      ReservationComponent.CLOSING_MINUTES
    );
    return this.minutesToTime(minutes);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = this.normalizeTime(time)
      .split(':')
      .map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  private normalizeTime(time: string): string {
    return time.slice(0, 5);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private mapBackendErrors(
    errors: any[] | null
  ): { [key: string]: string } {
    const result: { [key: string]: string } = {};

    if (!errors) return result;

    for (const error of errors) {
      result[error.field] = error.message;
    }

    return result;
  }

  private toast(
    detail: string,
    severity: 'success' | 'error' | 'warn' = 'success'
  ) {
    this.messageService.add({
      severity,
      summary:
        severity === 'success'
          ? 'OK'
          : severity === 'warn'
            ? 'Advertencia'
            : 'Error',
      detail,
      life: 3000
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private showCalendarPreview(image: Blob) {
    this.releaseCalendarPreview();
    this.calendarPreviewBlob = image;
    this.calendarPreviewUrl = URL.createObjectURL(image);
    this.calendarPreviewVisible = true;
  }

  private async shareCalendarImage(image: Blob) {
    const fileName = `calendario-${this.calendar()?.weekStart ?? 'reservas'}.png`;
    const file = new File([image], fileName, { type: 'image/png' });

    if (
      !navigator.share
      || !navigator.canShare?.({ files: [file] })
    ) {
      this.showCalendarPreview(image);
      this.toast(
        'La función compartir no está disponible en este dispositivo',
        'warn'
      );
      return;
    }

    await navigator.share({
      title: 'Calendario semanal de reservas',
      files: [file]
    });
  }

  private async createCalendarImage(): Promise<Blob> {
    const calendarData = this.calendar();
    const days = this.weekDays();
    if (!calendarData || calendarData.courts.length === 0 || days.length === 0) {
      throw new Error('Calendar data not available');
    }

    const timeColumnWidth = 80;
    const courtWidth = 170;
    const titleHeight = 64;
    const dayHeaderHeight = 38;
    const courtHeaderHeight = 44;
    const headerHeight = dayHeaderHeight + courtHeaderHeight;
    const rowHeight = 42;
    const legendHeight = 52;
    const columns = days.length * calendarData.courts.length;
    const width = timeColumnWidth + columns * courtWidth;
    const bodyHeight = this.timeSlots.length * rowHeight;
    const bodyTop = titleHeight + headerHeight;
    const height = bodyTop + bodyHeight + legendHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context not available');
    }

    const fitText = (text: string, maxWidth: number): string => {
      if (context.measureText(text).width <= maxWidth) return text;

      let result = text;
      while (
        result.length > 1
        && context.measureText(`${result}…`).width > maxWidth
      ) {
        result = result.slice(0, -1);
      }
      return `${result}…`;
    };

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.textBaseline = 'middle';

    context.fillStyle = '#111827';
    context.font = '700 22px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('Calendario semanal de reservas', width / 2, 23);
    context.fillStyle = '#4b5563';
    context.font = '14px Arial, sans-serif';
    context.fillText(this.weekTitle, width / 2, 47);

    context.fillStyle = '#f8fafc';
    context.fillRect(0, titleHeight, width, headerHeight);
    context.strokeStyle = '#d1d5db';
    context.lineWidth = 1;
    context.strokeRect(0.5, titleHeight + 0.5, width - 1, headerHeight - 1);

    context.fillStyle = '#4b5563';
    context.font = '700 12px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(
      'Hora',
      timeColumnWidth / 2,
      titleHeight + headerHeight / 2
    );

    days.forEach((day, dayIndex) => {
      const dayX =
        timeColumnWidth
        + dayIndex * calendarData.courts.length * courtWidth;
      const dayWidth = calendarData.courts.length * courtWidth;

      context.fillStyle = '#eff6ff';
      context.fillRect(dayX, titleHeight, dayWidth, dayHeaderHeight);
      context.strokeStyle = '#d1d5db';
      context.strokeRect(
        dayX + 0.5,
        titleHeight + 0.5,
        dayWidth - 1,
        dayHeaderHeight - 1
      );
      context.fillStyle = '#2563eb';
      context.font = '700 13px Arial, sans-serif';
      context.fillText(
        `${day.dayName} ${day.dayNumber} ${day.monthName}`,
        dayX + dayWidth / 2,
        titleHeight + dayHeaderHeight / 2
      );

      calendarData.courts.forEach((court, courtIndex) => {
        const courtX = dayX + courtIndex * courtWidth;
        context.fillStyle = '#f8fafc';
        context.fillRect(
          courtX,
          titleHeight + dayHeaderHeight,
          courtWidth,
          courtHeaderHeight
        );
        context.strokeStyle = '#d1d5db';
        context.strokeRect(
          courtX + 0.5,
          titleHeight + dayHeaderHeight + 0.5,
          courtWidth - 1,
          courtHeaderHeight - 1
        );
        context.fillStyle = '#1f2937';
        context.font = '600 12px Arial, sans-serif';
        context.fillText(
          fitText(court.name, courtWidth - 12),
          courtX + courtWidth / 2,
          titleHeight + dayHeaderHeight + courtHeaderHeight / 2
        );
      });
    });

    this.timeSlots.forEach((time, rowIndex) => {
      const y = bodyTop + rowIndex * rowHeight;
      context.fillStyle = '#ffffff';
      context.fillRect(0, y, width, rowHeight);
      context.strokeStyle = '#e5e7eb';
      context.beginPath();
      context.moveTo(0, y + rowHeight + 0.5);
      context.lineTo(width, y + rowHeight + 0.5);
      context.stroke();

      context.fillStyle = '#4b5563';
      context.font = '11px Arial, sans-serif';
      context.textAlign = 'center';
      context.fillText(time, timeColumnWidth / 2, y + 12);
    });

    for (let columnIndex = 0; columnIndex <= columns; columnIndex++) {
      const x = timeColumnWidth + columnIndex * courtWidth;
      context.strokeStyle = '#d1d5db';
      context.beginPath();
      context.moveTo(x + 0.5, bodyTop);
      context.lineTo(x + 0.5, bodyTop + bodyHeight);
      context.stroke();
    }

    context.strokeStyle = '#d1d5db';
    context.beginPath();
    context.moveTo(timeColumnWidth + 0.5, bodyTop);
    context.lineTo(timeColumnWidth + 0.5, bodyTop + bodyHeight);
    context.stroke();
    context.fillStyle = '#4b5563';
    context.font = '11px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(
      '23:30',
      timeColumnWidth / 2,
      bodyTop + bodyHeight - 5
    );

    const statusColors: Record<
      string,
      { background: string; border: string; text: string }
    > = {
      PAGADO: {
        background: '#dcfce7',
        border: '#22c55e',
        text: '#166534'
      },
      PAGO_PARCIAL: {
        background: '#fef3c7',
        border: '#f59e0b',
        text: '#92400e'
      },
      SEPARADO: {
        background: '#fee2e2',
        border: '#ef4444',
        text: '#991b1b'
      }
    };

    calendarData.reservations.forEach((reservationItem) => {
      const dayIndex = days.findIndex(
        (day) => day.date === reservationItem.reservationDate
      );
      const courtIndex = calendarData.courts.findIndex(
        (court) => court.id === reservationItem.courtId
      );
      if (dayIndex < 0 || courtIndex < 0) return;

      const startMinutes = this.timeToMinutes(reservationItem.startTime);
      const endMinutes = this.timeToMinutes(reservationItem.endTime);
      const startOffset =
        (startMinutes - ReservationComponent.OPENING_MINUTES)
        / ReservationComponent.SLOT_MINUTES;
      const duration =
        (endMinutes - startMinutes) / ReservationComponent.SLOT_MINUTES;
      const columnIndex =
        dayIndex * calendarData.courts.length + courtIndex;
      const x = timeColumnWidth + columnIndex * courtWidth + 3;
      const y = bodyTop + startOffset * rowHeight + 3;
      const blockWidth = courtWidth - 6;
      const blockHeight = Math.max(36, duration * rowHeight - 6);
      const colors = statusColors[reservationItem.status]
        ?? {
          background: '#f3f4f6',
          border: '#6b7280',
          text: '#374151'
        };

      context.fillStyle = colors.background;
      context.fillRect(x, y, blockWidth, blockHeight);
      context.fillStyle = colors.border;
      context.fillRect(x, y, 4, blockHeight);

      context.save();
      context.beginPath();
      context.rect(x + 7, y + 2, blockWidth - 10, blockHeight - 4);
      context.clip();
      context.textAlign = 'left';
      context.fillStyle = colors.text;
      context.font = '700 11px Arial, sans-serif';
      context.fillText(
        fitText(reservationItem.clientName, blockWidth - 18),
        x + 9,
        y + 12
      );
      context.font = '10px Arial, sans-serif';
      context.fillText(
        this.formatTimeRange(
          reservationItem.startTime,
          reservationItem.endTime
        ),
        x + 9,
        y + 27
      );

      if (blockHeight >= 54 && reservationItem.status !== 'PAGADO') {
        const balanceLabel = reservationItem.status === 'PAGO_PARCIAL'
          ? 'Pendiente'
          : 'Debe';
        context.fillText(
          `${balanceLabel}: ${this.formatCurrency(reservationItem.balanceAmount)}`,
          x + 9,
          y + 42
        );
      }
      context.restore();
    });

    const legendY = bodyTop + bodyHeight + legendHeight / 2;
    const legendItems = [
      { label: 'Pagado', color: statusColors['PAGADO'].border },
      { label: 'Pago parcial', color: statusColors['PAGO_PARCIAL'].border },
      { label: 'Separado', color: statusColors['SEPARADO'].border }
    ];
    const legendItemWidth = 140;
    const legendStartX =
      (width - legendItems.length * legendItemWidth) / 2;
    context.font = '12px Arial, sans-serif';
    context.textAlign = 'left';

    legendItems.forEach((item, index) => {
      const x = legendStartX + index * legendItemWidth;
      context.fillStyle = item.color;
      context.beginPath();
      context.arc(x + 6, legendY, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#4b5563';
      context.fillText(item.label, x + 18, legendY);
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Image generation failed')),
        'image/png'
      );
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
