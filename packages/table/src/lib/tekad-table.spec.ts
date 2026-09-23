import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadTable } from './tekad-table';

@Component({
  standalone: true,
  imports: [TekadTable],
  template: `<table tkTable><tr><td>cell</td></tr></table>`,
})
class Host {}

describe('TekadTable', () => {
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
