import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent }     from './layout/layout.component';
import { LoginComponent }      from './pages/login/login.component';
import { DashboardComponent }  from './pages/dashboard/dashboard.component';
import { OrdersComponent }     from './pages/orders/orders.component';
import { ClientsComponent }    from './pages/clients/clients.component';
import { PharmaciesComponent } from './pages/pharmacies/pharmacies.component';
import { AgentsComponent }     from './pages/agents/agents.component';
import { ProductsComponent }   from './pages/products/products.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { AnalyticsComponent }  from './pages/analytics/analytics.component';
import { SettingsComponent }   from './pages/settings/settings.component';
import { ZonesComponent }      from './pages/zones/zones.component';
import { PharmacistDashboardComponent } from './pages/pharmacist-dashboard/pharmacist-dashboard.component';
import { PharmacistOrdersComponent }    from './pages/pharmacist-orders/pharmacist-orders.component';
import { PharmacistScheduleComponent }  from './pages/pharmacist-schedule/pharmacist-schedule.component';
import { AuthGuard }           from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',           redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  component: DashboardComponent  },
      { path: 'orders',     component: OrdersComponent     },
      { path: 'clients',    component: ClientsComponent    },
      { path: 'pharmacies', component: PharmaciesComponent },
      { path: 'agents',     component: AgentsComponent     },
      { path: 'products',   component: ProductsComponent   },
      { path: 'categories', component: CategoriesComponent },
      { path: 'analytics',  component: AnalyticsComponent  },
      { path: 'settings',   component: SettingsComponent   },
      { path: 'zones',      component: ZonesComponent      },
    ]
  },
  {
    path: 'ph',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PharmacistDashboardComponent },
      { path: 'orders',    component: PharmacistOrdersComponent    },
      { path: 'schedule',  component: PharmacistScheduleComponent  },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

