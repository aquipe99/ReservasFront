import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { RoleMenuComponent } from './role-menu';

describe('RoleMenuComponent', () => {
  let component: RoleMenuComponent;
  let fixture: ComponentFixture<RoleMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleMenuComponent],
      providers: [provideHttpClient(), provideRouter([]), MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
