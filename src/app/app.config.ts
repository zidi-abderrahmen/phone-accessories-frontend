import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideRouter } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { routes } from "./app.routes";
import { credentialsInterceptor } from "./core/interceptors/cookies/credentials-interceptor";
import { errorInterceptor } from "./core/interceptors/error/error-interceptor";
import { AuthService } from "./core/services/auth/auth.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([credentialsInterceptor, errorInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.checkAuth());
    })
  ]
};