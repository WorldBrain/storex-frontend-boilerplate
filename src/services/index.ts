import { BackendType } from "../types";
import { Storage } from "../storage/types";
import { Services } from "./types";
import SyncService from "./sync";

export function createServices(storage : Storage, options : {backend : BackendType}) : Services {
    if (options.backend === 'memory') {
        return {
            sync: new SyncService({ storage })
        }
    } else if (options.backend === 'client') {
        return {
            sync: new SyncService({ storage })
        }
    } else {
        throw new Error(`Tried to create services with unknown backend: '${options.backend}'`)
    }
}
