import SyncService from "./sync";
import { AuthService } from "./auth/types";

export interface Services {
    auth : AuthService
    sync : SyncService
}
