import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadTabGroup } from './tekad-tab-group';
import { TekadTab } from './tekad-tab';

@Component({
  standalone: true,
  imports: [TekadTabGroup, TekadTab],
  template: `
    <tk-tab-group>
      <tk-tab label="First">Content A</tk-tab>
      <tk-tab label="Second">Content B</tk-tab>
    </tk-tab-group>
  `,
})
class Host {}

describe('TekadTabGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders tab buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('[role="tab"]');
    expect(buttons.length).toBe(2);
  });

  it('first tab is active by default', () => {
    const el = fixture.nativeElement as HTMLElement;
    const first = el.querySelector('[role="tab"]') as HTMLElement;
    expect(first.getAttribute('aria-selected')).toBe('true');
  });
});
