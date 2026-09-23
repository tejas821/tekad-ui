import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadIcon } from './tekad-icon';

@Component({
  standalone: true,
  imports: [TekadIcon],
  template: `<tk-icon>test</tk-icon>`,
})
class Host {}

describe('TekadIcon', () => {
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
