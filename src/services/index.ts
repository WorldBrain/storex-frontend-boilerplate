import { BackendType } from "../types";
import { Storage } from "../storage/types";
import { Services } from "./types";
import SyncService from "./sync";
import { FirebaseAuth } from "./auth/firebase";
import { AuthService } from "./auth/types";
import { MemoryAuth } from "./auth/memory";

export function createServices(storage : Storage, options : { backend : BackendType }) : Services {
    let auth : AuthService
    if (options.backend === 'client-with-firestore-sync') {
        auth = new FirebaseAuth()
    } else {
        auth = new MemoryAuth({ idType: 'number' })
    }

    const services : Services = {
        auth,
        sync: new SyncService({ storage, auth })
    }

    return services
}
