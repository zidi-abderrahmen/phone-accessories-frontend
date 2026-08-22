import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideRouter } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { routes } from "./app.routes";
import { credentialsInterceptor } from "./core/interceptors/cookies/credentials-interceptor";
import { errorInterceptor } from "./core/interceptors/error/error-interceptor";
import { UserService } from "./core/services/user/user.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([credentialsInterceptor, errorInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppInitializer(() => {
      const userService = inject(UserService);
      return firstValueFrom(userService.checkAuth());
    })
  ]
};