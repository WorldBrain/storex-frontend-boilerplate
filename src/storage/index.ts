import uuid from 'uuid/v1'

import StorageManager, { StorageBackend } from "@worldbrain/storex";
import { DexieStorageBackend } from "@worldbrain/storex-backend-dexie";
import inMemory from "@worldbrain/storex-backend-dexie/lib/in-memory";
import { registerModuleMapCollections, StorageModule } from "@worldbrain/storex-pattern-modules";
import { BackendType } from "../types";

import { CustomAutoPkMiddleware } from '@worldbrain/storex-sync/lib/custom-auto-pk'
import { SyncLoggingMiddleware } from '@worldbrain/storex-sync/lib/logging-middleware'
import { ClientSyncLogStorage } from '@worldbrain/storex-sync/lib/client-sync-log'
import { SharedSyncLogStorage } from '@worldbrain/storex-sync/lib/shared-sync-log/storex'

import { Storage, StorageModules } from "./types";

import { TodoListStorage } from "./modules/todo-list";

export type StorageModuleInfo = {[key in keyof StorageModules]? : { sync: boolean }}
export const STORAGE_MODULE_INFO : StorageModuleInfo = {
    todoList: { sync: true },
}

export async function createStorage(options : { backend : BackendType }) : Promise<Storage> {
    let storageBackend : StorageBackend
    if (options.backend === 'memory') {
        storageBackend = new DexieStorageBackend({ dbName: 'syncTest', idbImplementation: inMemory() })
    } else if (options.backend == 'client') {
        storageBackend = new DexieStorageBackend({ dbName: 'syncTest' })
    } else {
        throw new Error(`Tried to create storage with unknown backend: ${options.backend}`)
    }
    const storageManager = new StorageManager({ backend: storageBackend })
    const storage : Storage = {
        manager: storageManager,
        modules: {
            todoList: new TodoListStorage({ storageManager }),
            clientSyncLog: new ClientSyncLogStorage({ storageManager }),
            sharedSyncLog: new SharedSyncLogStorage({ storageManager })
        }
    }
    registerModuleMapCollections(storageManager.registry, storage.modules as any)
    await storageManager.finishInitialization()

    const pkMiddleware = new CustomAutoPkMiddleware({ pkGenerator: () => {
        console.log('generating id')
        return uuid()
    } })
    const collectionsToSync = getCollectionsToSync(storage, STORAGE_MODULE_INFO)
    pkMiddleware.setup({ storageRegistry: storageManager.registry, collections: collectionsToSync })

    const syncLoggingMiddleware = new SyncLoggingMiddleware({
        storageManager,
        clientSyncLog: storage.modules.clientSyncLog,
        includeCollections: collectionsToSync
    })

    storageManager.setMiddleware([
        pkMiddleware,
        syncLoggingMiddleware
    ])

    return storage
}

export function getCollectionsToSync(storage : Storage, moduleInfo : StorageModuleInfo) : string[] {
    return Object.entries(STORAGE_MODULE_INFO).map(
        ([moduleName, moduleInfo]) =>
        moduleInfo && moduleInfo.sync
            ? Object.keys(((storage.modules as any)[moduleName] as StorageModule).collections)
            : []
    ).reduce((prev, curr) => prev.concat(curr), [])
}