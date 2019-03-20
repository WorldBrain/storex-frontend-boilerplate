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

export async function createStorage(options : { backend : BackendType, dbName : string }) : Promise<Storage> {
    const { clientStorageBackend, serverStorageBackend } = createStorageBackends(options)

    const clientStorageManager = new StorageManager({ backend: clientStorageBackend })
    const clientModules = {
        todoList: new TodoListStorage({ storageManager: clientStorageManager }),
        clientSyncLog: new ClientSyncLogStorage({ storageManager: clientStorageManager }),
    }

    registerModuleMapCollections(clientStorageManager.registry, clientModules)
    await clientStorageManager.finishInitialization()

    const serverStorageManager = new StorageManager({ backend: serverStorageBackend })
    const serverModules = {
        sharedSyncLog: new SharedSyncLogStorage({ storageManager: serverStorageManager })
    }

    registerModuleMapCollections(serverStorageManager.registry, serverModules)
    await serverStorageManager.finishInitialization()

    const storage : Storage = {
        manager: clientStorageManager,
        modules: {
            ...clientModules,
            ...serverModules,
        }
    }

    const pkMiddleware = new CustomAutoPkMiddleware({ pkGenerator: () => {
        console.log('generating id')
        return uuid()
    } })
    const collectionsToSync = getCollectionsToSync(storage, STORAGE_MODULE_INFO)
    pkMiddleware.setup({ storageRegistry: clientStorageManager.registry, collections: collectionsToSync })

    const syncLoggingMiddleware = new SyncLoggingMiddleware({
        storageManager: clientStorageManager,
        clientSyncLog: storage.modules.clientSyncLog,
        includeCollections: collectionsToSync
    })

    clientStorageManager.setMiddleware([
        pkMiddleware,
        syncLoggingMiddleware
    ])

    return storage
}

export function createStorageBackends(options : { backend: BackendType, dbName: string }) {
    let clientStorageBackend: StorageBackend
    let serverStorageBackend: StorageBackend
    if (options.backend === 'memory') {
        clientStorageBackend = new DexieStorageBackend({ dbName: options.dbName, idbImplementation: inMemory() })
        serverStorageBackend = new DexieStorageBackend({ dbName: 'syncServer', idbImplementation: inMemory() })
    }
    else if (options.backend == 'client') {
        clientStorageBackend = new DexieStorageBackend({ dbName: options.dbName })
        serverStorageBackend = new DexieStorageBackend({ dbName: 'syncServer' })
    }
    else {
        throw new Error(`Tried to create storage with unknown backend: ${options.backend}`)
    }
    return { clientStorageBackend, serverStorageBackend }
}

export function getCollectionsToSync(storage : Storage, moduleInfo : StorageModuleInfo) : string[] {
    return Object.entries(STORAGE_MODULE_INFO).map(
        ([moduleName, moduleInfo]) =>
        moduleInfo && moduleInfo.sync
            ? Object.keys(((storage.modules as any)[moduleName] as StorageModule).collections)
            : []
    ).reduce((prev, curr) => prev.concat(curr), [])
}