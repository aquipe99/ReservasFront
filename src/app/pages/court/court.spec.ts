import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Court } from './court';

describe('Court', () => {
  let component: Court;
  let fixture: ComponentFixture<Court>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Court]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Court);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
