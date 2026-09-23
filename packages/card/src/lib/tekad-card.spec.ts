import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadCard } from './tekad-card';

@Component({
  standalone: true,
  imports: [TekadCard],
  template: `<tk-card>content</tk-card>`,
})
class Host {}

describe('TekadCard', () => {
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
