import TypedEmitter from 'typed-emitter';
import Peer from 'simple-peer'
import * as firebase from 'firebase/app'
import 'firebase/database';
import { SignalTransport, SignalChannel } from 'simple-signalling/lib/types';
import { FirebaseSignalTransport } from 'simple-signalling/lib/firebase'
import { signalSimplePeer } from 'simple-signalling/lib/simple-peer'
import { doSync } from '@worldbrain/storex-sync'
import { FastSyncReceiver, FastSyncSender, FastSyncEvents } from '@worldbrain/storex-sync/lib/fast-sync'
import { WebRTCFastSyncReceiverChannel, WebRTCFastSyncSenderChannel } from '@worldbrain/storex-sync/lib/fast-sync/channels'
import { reconcileSyncLog } from '@worldbrain/storex-sync/lib/reconciliation'
import { Storage } from "../storage/types";
import { AuthService } from './auth/types';
import { getCollectionsToSync } from '../storage/utils';

interface InitialSyncInfo {
    signalChannel : SignalChannel,
    promise : Promise<void>
    events : TypedEmitter<FastSyncEvents>
    senderFastSync? : FastSyncSender,
    receiverFastSync? : FastSyncReceiver,
}

export default class SyncService {
    private initialSyncInfo? : InitialSyncInfo

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

    async requestInitialSync(storage : Storage) {
        const role = 'sender'
        const { signalTransport, initialMessage } = await this._createSignalTransport(role)
        this.initialSyncInfo = await this._setupInitialSync({
            role,
            signalTransport,
            initialMessage,
            deviceId: 'device one',
            storage,
        })
        return { initialMessage, initialSyncInfo: this.initialSyncInfo }
    }

    async answerInitialSync(storage : Storage, options : { initialMessage : string }) {
        const role = 'receiver'
        const { signalTransport } = await this._createSignalTransport(role)
        this.initialSyncInfo = await this._setupInitialSync({
            role,
            signalTransport,
            initialMessage: options.initialMessage,
            deviceId: 'device two',
            storage,
        })
        return { initialSyncInfo: this.initialSyncInfo }
    }

    _createSignalTransport(role : 'sender' ) : Promise<{ signalTransport : SignalTransport, initialMessage : string }>;
    _createSignalTransport(role : 'receiver' ) : Promise<{ signalTransport : SignalTransport }>;
    async _createSignalTransport(role : 'sender' | 'receiver' ) : Promise<{ signalTransport : SignalTransport, initialMessage : string | undefined }> {
        const createTransport = () => new FirebaseSignalTransport({ database: firebase.database() as any, collectionName: 'signalling' })
        const signalTransport : SignalTransport = createTransport()
        return {
            signalTransport,
            initialMessage: role === 'sender' ? (await signalTransport.allocateChannel()).initialMessage : undefined
        }
    }

    async _setupInitialSync(options : {
        role : 'sender' | 'receiver',
        signalTransport : SignalTransport, initialMessage : string, deviceId : string
        storage : Storage
    }) : Promise<InitialSyncInfo> {
        const signalChannel = await options.signalTransport.openChannel(options)
        const peer = new Peer({ initiator: false })

        let senderFastSync : FastSyncSender | undefined
        let receiverFastSync : FastSyncReceiver | undefined
        let fastSync : { execute : () => Promise<void>, events : TypedEmitter<FastSyncEvents> }
        if (options.role === 'sender') {
            const senderChannel = new WebRTCFastSyncSenderChannel({ peer })
            senderFastSync = new FastSyncSender({
                storageManager: options.storage.clientManager, channel: senderChannel,
                collections: getCollectionsToSync(options.storage)
            })
            fastSync = senderFastSync
        } else {
            const receiverChannel = new WebRTCFastSyncReceiverChannel({ peer })
            receiverFastSync = new FastSyncReceiver({
                storageManager: options.storage.clientManager, channel: receiverChannel,
            })
            fastSync = receiverFastSync
        }
        const promise = (async () => {
            await signalSimplePeer({ signalChannel, simplePeer: peer }),
            await signalChannel.release()
            await fastSync.execute()
        })()
        return {
            signalChannel,
            promise,
            events: fastSync.events,
            senderFastSync,
            receiverFastSync,
        }
    }
}
