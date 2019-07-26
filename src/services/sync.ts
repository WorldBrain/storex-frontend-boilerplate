import pick from 'lodash/pick';
import TypedEmitter from 'typed-emitter';
import Peer from 'simple-peer'
import * as firebase from 'firebase/app'
import 'firebase/database';
import { SignalTransport, SignalChannel } from 'simple-signalling/lib/types';
import { FirebaseSignalTransport } from 'simple-signalling/lib/firebase'
import { signalSimplePeer, SimplePeerSignallingEvents } from 'simple-signalling/lib/simple-peer'
import { doSync } from '@worldbrain/storex-sync'
import { FastSyncReceiver, FastSyncSender, FastSyncEvents } from '@worldbrain/storex-sync/lib/fast-sync'
import { WebRTCFastSyncReceiverChannel, WebRTCFastSyncSenderChannel } from '@worldbrain/storex-sync/lib/fast-sync/channels'
import { reconcileSyncLog } from '@worldbrain/storex-sync/lib/reconciliation'
import { Storage } from "../storage/types";
import { AuthService } from './auth/types';
import { getCollectionsToSync } from '../storage/utils';

interface InitialSyncInfo {
    signalChannel : SignalChannel,
    execute : () => Promise<void>
    events : TypedEmitter<InitialSyncEvents>
    senderFastSync? : FastSyncSender,
    receiverFastSync? : FastSyncReceiver,
}

type InitialSyncEvents =
    FastSyncEvents &
    SimplePeerSignallingEvents &
    {
        connecting : {},
        releasingSignalChannel : {},
        connected : {},
        finished : {},
    }

type InitialSyncReporter = <EventName extends keyof InitialSyncEvents>(eventName : EventName, event : InitialSyncEvents[EventName]) => void

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

    async requestInitialSync(storage : Storage, options? : { reporter? : 'console' | InitialSyncReporter }) {
        const role = 'sender'
        const { signalTransport, initialMessage } = await this._createSignalTransport(role)
        this.initialSyncInfo = await this._setupInitialSync({
            role,
            signalTransport,
            initialMessage,
            deviceId: 'device one',
            storage,
        })
        if (options && options.reporter) {
            const reporter = options.reporter === 'console' ? console.log.bind(console) : options.reporter
            subscribeReporter(this.initialSyncInfo.events, reporter)
        }
        this.initialSyncInfo.execute()

        return { initialMessage, initialSyncInfo: this.initialSyncInfo }
    }

    async answerInitialSync(storage : Storage, options : { initialMessage : string, reporter? : 'console' | ((event : any) => void) }) {
        const role = 'receiver'
        const { signalTransport } = await this._createSignalTransport(role)
        this.initialSyncInfo = await this._setupInitialSync({
            role,
            signalTransport,
            initialMessage: options.initialMessage,
            deviceId: 'device two',
            storage,
        })
        if (options && options.reporter) {
            const reporter = options.reporter === 'console' ? console.log.bind(console) : options.reporter
            subscribeReporter(this.initialSyncInfo.events, reporter)
        }
        this.initialSyncInfo.execute()

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
        const signalChannel = await options.signalTransport.openChannel(pick(options, 'initialMessage', 'deviceId'))
        const peer = new Peer({ initiator: options.role === 'receiver' })

        let senderFastSync : FastSyncSender | undefined
        let receiverFastSync : FastSyncReceiver | undefined
        let fastSync : { execute : () => Promise<void>, events : TypedEmitter<FastSyncEvents & InitialSyncEvents> }
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

        let executePromise : Promise<void>
        const execute = () => {
            if (executePromise) {
                return executePromise
            }
            executePromise = (async () => {
                fastSync.events.emit('connecting', {})
                await signalSimplePeer({
                    signalChannel, simplePeer: peer,
                    reporter: (eventName, event) => (fastSync.events as any).emit(eventName, event)
                }),
                fastSync.events.emit('releasingSignalChannel', {})
                await signalChannel.release()
                fastSync.events.emit('connected', {})
                await fastSync.execute()
                fastSync.events.emit('finished', {})
            })()
            return executePromise
        }

        return {
            signalChannel,
            execute,
            events: fastSync.events,
            senderFastSync,
            receiverFastSync,
        }
    }
}

export function subscribeReporter(events : TypedEmitter<InitialSyncEvents>, reporter : (eventName : any, event : any) => void) {
    type AllEvents = {[EventName in keyof InitialSyncEvents] : true}
    const allEvents : AllEvents = {
        receivedIncomingSignal: true, processingIncomingSignal: true,
        queuingOutgoingSignal: true, sendingOutgoingSignal: true,
        connecting: true, connected: true, prepared: true, finished: true,
        releasingSignalChannel: true,
    }
    const eventCounters : {[EventName in keyof InitialSyncEvents]?: number} = {}
    for (const eventName of Object.keys(allEvents) as Array<keyof InitialSyncEvents>) {
        events.on(eventName, (event) => {
            eventCounters[eventName] = (eventCounters[eventName] || 0) + 1
            reporter(`${eventName} ${eventCounters[eventName]}`, event)
        })
    }
}
