import uuid from 'uuid/v1'

import StorageManager, { StorageBackend, StorageRegistry } from "@worldbrain/storex";
import { registerModuleMapCollections, StorageModule } from "@worldbrain/storex-pattern-modules";

import { DexieStorageBackend } from "@worldbrain/storex-backend-dexie";
import inMemory from "@worldbrain/storex-backend-dexie/lib/in-memory";

import { StorexGraphQLClient, storexGraphQLClientLogger } from "@worldbrain/storex-graphql-client"

import firebase from 'firebase'
import { FirestoreStorageBackend } from '@worldbrain/storex-backend-firestore'

import { BackendType } from "../types";

import { CustomAutoPkMiddleware } from '@worldbrain/storex-sync/lib/custom-auto-pk'
import { SyncLoggingMiddleware } from '@worldbrain/storex-sync/lib/logging-middleware'
import { ClientSyncLogStorage } from '@worldbrain/storex-sync/lib/client-sync-log'
import { SharedSyncLogStorage } from '@worldbrain/storex-sync/lib/shared-sync-log/storex'

import { Storage, StorageModules } from "./types";

import { TodoListStorage } from "./modules/todo-list";
import { StorageMiddleware } from '@worldbrain/storex/lib/types/middleware';
import { SharedSyncLog } from '@worldbrain/storex-sync/lib/shared-sync-log';
import { createSharedSyncLogConfig } from '@worldbrain/storex-sync/lib/shared-sync-log/types';

export type StorageModuleInfo = {[key in keyof StorageModules]? : { sync: boolean }}
export const STORAGE_MODULE_INFO : StorageModuleInfo = {
    todoList: { sync: true },
}

export async function createStorage(options : {
    backend : BackendType, dbName : string, graphQLEndpoint? : string, debugGraphQL? : boolean,
    version? : Date
}) : Promise<Storage> {
    const { clientStorageBackend, serverStorageBackend } = createStorageBackends(options)

    const clientStorageManager = new StorageManager({ backend: clientStorageBackend })
    const clientModules = {
        todoList: new TodoListStorage({ storageManager: clientStorageManager }),
        clientSyncLog: new ClientSyncLogStorage({ storageManager: clientStorageManager }),
    }

    registerModuleMapCollections(clientStorageManager.registry, clientModules, { version: options.version })
    await clientStorageManager.finishInitialization()

    let serverStorageManager : StorageManager | undefined
    let serverModules : { sharedSyncLog : SharedSyncLog }
    if (serverStorageBackend) {
        serverStorageManager = new StorageManager({ backend: serverStorageBackend })
        const serverStorageModules = {
            sharedSyncLog: new SharedSyncLogStorage({
                storageManager: serverStorageManager,
                autoPkType: options.backend.indexOf('firestore') === -1 ? 'int' : 'string'
            })
        }
        serverModules = serverStorageModules

        registerModuleMapCollections(serverStorageManager.registry, serverStorageModules)
        await serverStorageManager.finishInitialization()
    } else {
        if (!options.graphQLEndpoint) {
            throw new Error(`Tried to initialize storage with sync without configuring GraphQL endpoint`)
        }

        const storageRegistry = new StorageRegistry()
        const sharedSyncLog = { getConfig: () => createSharedSyncLogConfig({ autoPkType: 'int' }) }
        registerModuleMapCollections(storageRegistry, { sharedSyncLog })

        const observer = options.debugGraphQL ? storexGraphQLClientLogger({ eventTypes: 'all' }) : undefined
        const graphQLClient = new StorexGraphQLClient({
            endpoint: options.graphQLEndpoint,
            modules: {
                sharedSyncLog,
            },
            storageRegistry,
            observer,
            fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : undefined
        })
        serverModules = {
            sharedSyncLog: graphQLClient.getModule<SharedSyncLog>('sharedSyncLog')
        }
    }

    const storage : Storage = {
        clientManager: clientStorageManager,
        serverManager: serverStorageManager,
        modules: {
            ...clientModules,
            ...serverModules,
        }
    }

    const pkMiddleware = new CustomAutoPkMiddleware({ pkGenerator: () => {
        return uuid()
    } })
    const collectionsToSync = getCollectionsToSync(storage, STORAGE_MODULE_INFO)
    pkMiddleware.setup({ storageRegistry: clientStorageManager.registry, collections: collectionsToSync })

    const syncLoggingMiddleware = new SyncLoggingMiddleware({
        storageManager: clientStorageManager,
        clientSyncLog: storage.modules.clientSyncLog,
        includeCollections: collectionsToSync
    })

    const middleware : StorageMiddleware[] = [pkMiddleware, syncLoggingMiddleware]
    if (process.env.LOG_OPERATIONS_PRE_LOG) {
        middleware.unshift(({process: ({next, operation}) => {
            console.log(`executing operation for db ${options.dbName} before sync log:`, operation)
            return next.process({operation})
        }}))
    }
    if (process.env.LOG_OPERATIONS_POST_LOG) {
        middleware.push(({process: ({next, operation}) => {
            console.log(`executing operation for db ${options.dbName} after sync log:`, operation)
            return next.process({operation})
        }}))
    }

    clientStorageManager.setMiddleware(middleware)

    return storage
}

export function createStorageBackends(options : { backend: BackendType, dbName: string }) {
    let clientStorageBackend: StorageBackend
    let serverStorageBackend: StorageBackend | null = null
    if (options.backend === 'memory') {
        clientStorageBackend = new DexieStorageBackend({ dbName: options.dbName, idbImplementation: inMemory() }) as any
        serverStorageBackend = new DexieStorageBackend({ dbName: 'syncServer', idbImplementation: inMemory() }) as any
    } else if (options.backend === 'client' || options.backend === 'client-with-local-sync') {
        clientStorageBackend = new DexieStorageBackend({ dbName: options.dbName }) as any
        if (options.backend === 'client') {
            serverStorageBackend = new DexieStorageBackend({ dbName: 'syncServer' }) as any
        }
    } else if (options.backend === 'memory-with-firestore-sync' || options.backend === 'client-with-firestore-sync') {
        if (options.backend === 'memory-with-firestore-sync') {
            clientStorageBackend = new DexieStorageBackend({ dbName: options.dbName, idbImplementation: inMemory() }) as any
        } else {
            clientStorageBackend = new DexieStorageBackend({ dbName: options.dbName }) as any
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(require('../private/firebase').default)
        }
        serverStorageBackend = new FirestoreStorageBackend({ firebase: firebase as any, firestore: firebase.firestore() as any })
    } else {
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
