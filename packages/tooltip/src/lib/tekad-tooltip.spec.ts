import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadTooltip } from './tekad-tooltip';

@Component({
  standalone: true,
  imports: [TekadTooltip],
  template: `<tk-tooltip>Help text</tk-tooltip>`,
})
class Host {}

describe('TekadTooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders a tooltip with role="tooltip"', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tip = el.querySelector('[role="tooltip"]');
    expect(tip).toBeTruthy();
  });

  it('generates an id when none provided', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tip = el.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tip.getAttribute('id')).toMatch(/^tk-tooltip-\d+$/);
  });
});
