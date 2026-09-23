import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/docs-layout/docs-layout.component').then(m => m.DocsLayoutComponent),
    children: [
      { path: 'getting-started', loadComponent: () => import('./pages/getting-started/getting-started.component').then(m => m.GettingStartedComponent) },
      { path: 'highlights', loadComponent: () => import('./pages/highlights/highlights.component').then(m => m.HighlightsComponent) },
      { path: 'theming', loadComponent: () => import('./pages/theming/theming.component').then(m => m.ThemingComponent) },
      { path: 'design-tokens', loadComponent: () => import('./pages/design-tokens/design-tokens.component').then(m => m.DesignTokensComponent) },
      { path: 'accessibility', loadComponent: () => import('./pages/accessibility/accessibility.component').then(m => m.AccessibilityComponent) },
      { path: 'components', loadComponent: () => import('./pages/components/overview/overview.component').then(m => m.OverviewComponent) },
      { path: 'components/button', loadComponent: () => import('./pages/components/button/button-doc.component').then(m => m.ButtonDocComponent) },
      { path: 'components/input', loadComponent: () => import('./pages/components/input/input-doc.component').then(m => m.InputDocComponent) },
      { path: 'components/checkbox', loadComponent: () => import('./pages/components/checkbox/checkbox-doc.component').then(m => m.CheckboxDocComponent) },
      { path: 'components/form-field', loadComponent: () => import('./pages/components/form-field/form-field-doc.component').then(m => m.FormFieldDocComponent) },
      { path: 'components/dialog', loadComponent: () => import('./pages/components/dialog/dialog-doc.component').then(m => m.DialogDocComponent) },
      { path: 'components/icon', loadComponent: () => import('./pages/components/icon/icon-doc.component').then(m => m.IconDocComponent) },
      { path: 'components/switch', loadComponent: () => import('./pages/components/switch/switch-doc.component').then(m => m.SwitchDocComponent) },
      { path: 'components/badge', loadComponent: () => import('./pages/components/badge/badge-doc.component').then(m => m.BadgeDocComponent) },
      { path: 'components/card', loadComponent: () => import('./pages/components/card/card-doc.component').then(m => m.CardDocComponent) },
      { path: 'components/divider', loadComponent: () => import('./pages/components/divider/divider-doc.component').then(m => m.DividerDocComponent) },
      { path: 'components/progress', loadComponent: () => import('./pages/components/progress/progress-doc.component').then(m => m.ProgressDocComponent) },
      { path: 'components/tabs', loadComponent: () => import('./pages/components/tabs/tabs-doc.component').then(m => m.TabsDocComponent) },
      { path: 'components/tooltip', loadComponent: () => import('./pages/components/tooltip/tooltip-doc.component').then(m => m.TooltipDocComponent) },
      { path: 'components/select', loadComponent: () => import('./pages/components/select/select-doc.component').then(m => m.SelectDocComponent) },
      { path: 'components/table', loadComponent: () => import('./pages/components/table/table-doc.component').then(m => m.TableDocComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
