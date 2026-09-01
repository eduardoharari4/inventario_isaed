import { effect, runInInjectionContext, Injector, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Espera a que AuthService resuelva la sesión inicial antes de dejar pasar un guard. */
export function waitUntilAuthResolved(auth: AuthService): Promise<void> {
  if (!auth.loading()) {
    return Promise.resolve();
  }
  const injector = inject(Injector);
  return new Promise<void>((resolve) => {
    runInInjectionContext(injector, () => {
      const ref = effect(() => {
        if (!auth.loading()) {
          resolve();
          queueMicrotask(() => ref.destroy());
        }
      });
    });
  });
}
