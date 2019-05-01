import { doSync } from '@worldbrain/storex-sync'
import { reconcileSyncLog } from '@worldbrain/storex-sync/lib/reconciliation'
import { Storage } from "../storage/types";

export default class SyncService {
    constructor(private options : { storage : Storage }) {}

    async forceSync(options : { deviceId : any }) {
        const { storage } = this.options
        
        await doSync({
            clientSyncLog: storage.modules.clientSyncLog,
            sharedSyncLog: storage.modules.sharedSyncLog,
            storageManager: storage.clientManager,
            reconciler: reconcileSyncLog,
            now: new Date().getTime(),
            userId: 1,
            deviceId: options.deviceId,
        })
    }
}