import { doSync } from '@worldbrain/storex-sync'
import { reconcileSyncLog } from '@worldbrain/storex-sync/lib/reconciliation'
import { Storage } from "../storage/types";
import { AuthService } from './auth/types';

export default class SyncService {
    constructor(private options : { storage : Storage, auth : AuthService }) {}

    async forceSync(options : { deviceId : any }) {
        const { storage, auth } = this.options
        const userId = auth.getUserId()
        if (!userId) {
            throw new Error(`Cannot Sync without authenticated user`)
        }
        
        await doSync({
            clientSyncLog: storage.modules.clientSyncLog,
            sharedSyncLog: storage.modules.sharedSyncLog,
            storageManager: storage.clientManager,
            reconciler: reconcileSyncLog,
            now: '$now',
            userId,
            deviceId: options.deviceId,
        })
    }
}