import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'remisiones' },
      {
        path: 'telas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/telas/telas-list.component').then((m) => m.TelasListComponent)
      },
      {
        path: 'telas/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/telas/tela-detalle.component').then((m) => m.TelaDetalleComponent)
      },
      {
        path: 'clientes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/clientes/clientes-list.component').then(
            (m) => m.ClientesListComponent
          )
      },
      {
        path: 'remisiones',
        loadComponent: () =>
          import('./features/remisiones/remisiones-list.component').then(
            (m) => m.RemisionesListComponent
          )
      },
      {
        path: 'remisiones/nueva',
        loadComponent: () =>
          import('./features/remisiones/remision-crear.component').then(
            (m) => m.RemisionCrearComponent
          )
      },
      {
        path: 'remisiones/:id',
        loadComponent: () =>
          import('./features/remisiones/remision-detalle.component').then(
            (m) => m.RemisionDetalleComponent
          )
      },
      {
        path: 'reportes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/reportes/reportes.component').then((m) => m.ReportesComponent)
      },
      {
        path: 'saldos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/saldos/saldos.component').then((m) => m.SaldosComponent)
      },
      {
        path: 'empresa',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/empresa/empresa.component').then((m) => m.EmpresaComponent)
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
