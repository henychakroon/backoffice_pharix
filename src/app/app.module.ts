import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AuthInterceptor } from './interceptors/auth.interceptor';

import { AppRoutingModule }    from './app-routing.module';
import { AppComponent }        from './app.component';
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
import { FilterStatusPipe }    from './shared/pipes/filter-status.pipe';
import { AdBannersComponent }  from './pages/zones/ad-banners/ad-banners.component';
import { PharmacistDashboardComponent } from './pages/pharmacist-dashboard/pharmacist-dashboard.component';
import { PharmacistOrdersComponent }    from './pages/pharmacist-orders/pharmacist-orders.component';

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    LoginComponent,
    DashboardComponent,
    OrdersComponent,
    ClientsComponent,
    PharmaciesComponent,
    AgentsComponent,
    ProductsComponent,
    CategoriesComponent,
    AnalyticsComponent,
    SettingsComponent,
    ZonesComponent,
    FilterStatusPipe,
    AdBannersComponent,
    PharmacistDashboardComponent,
    PharmacistOrdersComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ScrollingModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

