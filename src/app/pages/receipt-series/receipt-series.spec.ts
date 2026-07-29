import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { ReceiptSeriesComponent } from './receipt-series';

describe('ReceiptSeriesComponent', () => {
  let component: ReceiptSeriesComponent;
  let fixture: ComponentFixture<ReceiptSeriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiptSeriesComponent],
      providers: [
        MessageService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiptSeriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
