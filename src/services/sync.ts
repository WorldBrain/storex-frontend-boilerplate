import firebase from 'firebase/app'
import 'firebase/database';
import { FirebaseSignalTransport } from 'simple-signalling/lib/firebase'
import { InitialSync } from '@worldbrain/storex-sync/lib/integration/initial-sync'
import { ContinuousSync } from '@worldbrain/storex-sync/lib/integration/continuous-sync'
import { SyncSettingsStore } from '@worldbrain/storex-sync/lib/integration/settings'
import { Storage } from "../storage/types";
import { AuthService } from './auth/types';
import { getCollectionsToSync } from '../storage/utils';
import { SyncLoggingMiddleware } from '@worldbrain/storex-sync/lib/logging-middleware';

export default class SyncService {
    public initialSync: InitialSync
    public continuousSync: ContinuousSync
    public settingStore: SyncSettingsStore
    public syncLoggingMiddleware?: SyncLoggingMiddleware
    public syncedCollections: string[]

    constructor(private options: { storage: Storage, auth: AuthService }) {
        this.syncedCollections = getCollectionsToSync(options.storage)
        this.settingStore = {
            storeSetting: async (key, value) => {
                localStorage.setItem(`sync.${key}`, JSON.stringify(value))
            },
            retrieveSetting: async (key) => {
                return JSON.parse(localStorage.getItem(`sync.${key}`) || 'null')
            }
        }
        this.initialSync = new InitialSync({
            storageManager: options.storage.clientManager,
            signalTransportFactory: () => new FirebaseSignalTransport({
                database: firebase.database() as any,
                collectionName: 'signalling',
            }),
            syncedCollections: this.syncedCollections,
        })
        this.continuousSync = new ContinuousSync({
            auth: {
                getUserId: async () => {
                    return options.auth.getUserId()
                }
            },
            storageManager: options.storage.clientManager,
            clientSyncLog: options.storage.modules.clientSyncLog,
            getSharedSyncLog: async () => options.storage.modules.sharedSyncLog,
            settingStore: this.settingStore,
            toggleSyncLogging: () => {

            }
        })
    }

    async createSyncLoggingMiddleware() {
        this.syncLoggingMiddleware = new SyncLoggingMiddleware({
            storageManager: this.options.storage.clientManager,
            clientSyncLog: this.options.storage.modules.clientSyncLog,
            includeCollections: this.syncedCollections,
        })
        this.syncLoggingMiddleware.enabled = false
        return this.syncLoggingMiddleware
    }
}
