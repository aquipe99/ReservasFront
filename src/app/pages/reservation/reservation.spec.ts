import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { ReservationCalendarResponse } from '../../core/models/reservation-calendar-response';
import { Auth } from '../../core/services/auth/auth';
import { Client as ClientService } from '../../core/services/client/client';
import { Reservation as ReservationService } from '../../core/services/reservation/reservation';
import { ReservationComponent } from './reservation';

class AuthStub {
  userSignal = signal({
    menus: [
      {
        link: '/Reserva',
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        items: []
      },
      {
        link: '/Cliente',
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
        items: []
      }
    ]
  });

  isAuthenticated = false;

  refreshPermissions() {
    return of(null);
  }
}

describe('ReservationComponent', () => {
  let component: ReservationComponent;
  let fixture: ComponentFixture<ReservationComponent>;
  let service: jasmine.SpyObj<ReservationService>;
  let clientService: jasmine.SpyObj<ClientService>;

  const calendarData: ReservationCalendarResponse = {
    weekStart: '2026-07-27',
    weekEnd: '2026-08-02',
    courts: [
      {
        id: 1,
        name: 'Cancha 1',
        description: 'Cancha principal',
        status: true
      }
    ],
    reservations: [
      {
        id: 1,
        clientName: 'Cliente de prueba',
        reservationDate: '2026-07-28',
        startTime: '08:00:00',
        endTime: '09:00:00',
        courtId: 1,
        courtName: 'Cancha 1',
        totalAmount: 100,
        paidAmount: 0,
        balanceAmount: 100,
        status: 'SEPARADO'
      }
    ]
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<ReservationService>('ReservationService', [
      'getCalendar',
      'getOptions',
      'getById',
      'create',
      'update',
      'addPayment',
      'cancel'
    ]);
    clientService = jasmine.createSpyObj<ClientService>('ClientService', [
      'getForSelect',
      'create'
    ]);

    service.getCalendar.and.returnValue(of({
      success: true,
      message: 'OK',
      data: calendarData,
      errors: []
    }));

    await TestBed.configureTestingModule({
      imports: [ReservationComponent],
      providers: [
        provideRouter([]),
        MessageService,
        { provide: Auth, useClass: AuthStub },
        { provide: ReservationService, useValue: service },
        { provide: ClientService, useValue: clientService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the schedule from 07:00 to 23:00 in 30 minute slots', () => {
    expect(component.timeSlots.length).toBe(33);
    expect(component.timeSlots[0]).toBe('07:00');
    expect(component.timeSlots.at(-1)).toBe('23:00');
  });

  it('should apply the permissions assigned to the reservations menu', () => {
    expect(component.canCreate()).toBeTrue();
    expect(component.canUpdate()).toBeTrue();
    expect(component.canDelete()).toBeTrue();
  });

  it('should initialize a reservation from a selected free slot', () => {
    component.openNew('2099-07-28', '09:30', 1);

    expect(component.reservationDialogVisible).toBeTrue();
    expect(component.reservation.reservationDate).toBe('2099-07-28');
    expect(component.reservation.startTime).toBe('09:30');
    expect(component.reservation.endTime).toBe('10:30');
    expect(component.reservation.courtId).toBe(1);
  });

  it('should not open the reservation form for a past calendar date', () => {
    component.openNew('2020-01-01', '09:30', 1);

    expect(component.reservationDialogVisible).toBeFalse();
    expect(component.isPastCalendarDate('2020-01-01')).toBeTrue();
  });

  it('should identify occupied and available calendar slots', () => {
    component.calendar.set(calendarData);

    expect(component.isSlotAvailable('2026-07-28', 1, '08:30')).toBeFalse();
    expect(component.isSlotAvailable('2026-07-28', 1, '09:00')).toBeTrue();
  });

  it('should populate the reservation when selecting a client', () => {
    component.clients.set([
      {
        id: 5,
        documentType: 'RUC',
        documentNumber: '20123456789',
        name: 'Empresa de prueba',
        phone: '987654321',
        email: null,
        address: null,
        status: true
      }
    ]);
    component.reservation.clientId = 5;

    component.onClientSelect();

    expect(component.reservation.clientName).toBe('Empresa de prueba');
    expect(component.reservation.clientDocumentType).toBe('RUC');
    expect(component.reservation.clientDocumentNumber).toBe('20123456789');
    expect(component.reservation.clientDni).toBeNull();
  });

  it('should request the previous week when navigating backwards', () => {
    component.selectedDate = new Date(2026, 6, 29);
    service.getCalendar.calls.reset();

    component.navigateWeek(-7);

    expect(service.getCalendar).toHaveBeenCalledOnceWith('2026-07-22');
  });

  it('should not send an invalid reservation', () => {
    component.reservation.clientName = '';

    component.saveReservation();

    expect(service.create).not.toHaveBeenCalled();
    expect(component.submitted).toBeTrue();
  });

  it('should not register a payment greater than the pending balance', () => {
    component.selectedReservation.set({
      id: 1,
      clientId: 1,
      clientName: 'Cliente de prueba',
      clientDocumentType: 'DNI',
      clientDocumentNumber: '12345678',
      clientDni: '12345678',
      phone: null,
      reservationDate: '2026-07-28',
      startTime: '08:00:00',
      endTime: '09:00:00',
      courtId: 1,
      courtName: 'Cancha 1',
      paymentMethodId: null,
      paymentMethodName: null,
      paymentType: 'SIN_PAGO',
      totalAmount: 100,
      paidAmount: 75,
      balanceAmount: 25,
      status: 'PAGO_PARCIAL',
      createdBy: 1,
      createdAt: '2026-07-28T08:00:00-05:00',
      modifiedBy: null,
      modifiedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      cancellationReason: null,
      payments: []
    });
    component.payment = {
      paymentMethodId: 1,
      amount: 30
    };

    component.addPayment();

    expect(service.addPayment).not.toHaveBeenCalled();
    expect(component.paymentSubmitted).toBeTrue();
  });
});
