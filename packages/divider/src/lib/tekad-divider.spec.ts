import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadDivider } from './tekad-divider';

@Component({
  standalone: true,
  imports: [TekadDivider],
  template: `<tk-divider />`,
})
class Host {}

describe('TekadDivider', () => {
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
