import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadSelect } from './tekad-select';

@Component({
  standalone: true,
  imports: [TekadSelect],
  template: `
    <tk-select [(value)]="val">
      <option value="a">A</option>
      <option value="b">B</option>
    </tk-select>
  `,
})
class Host {
  val = 'a';
}

describe('TekadSelect', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders a native select', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('select')).toBeTruthy();
  });

  it('has options', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('option').length).toBe(2);
  });
});
