import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadProgress } from './tekad-progress';

@Component({
  standalone: true,
  imports: [TekadProgress],
  template: `<tk-progress [value]="50" />`,
})
class Host {}

describe('TekadProgress', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders', () => {
    expect(el).toBeTruthy();
  });
});
