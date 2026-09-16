import { HttpContextToken } from '@angular/common/http';

export const SKIP_GLOBAL_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);