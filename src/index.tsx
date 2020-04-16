import queryString, { ParsedQuery } from 'query-string'
import createBrowserHistory from 'history/createBrowserHistory'
import { runUI, destroyUI } from './ui'
import * as serviceWorker from './serviceWorker'
import { createServices } from './services'
import { BackendType } from './types'
import { createStorage, setClientStorageMiddleware } from './storage'

export interface MainOptions {
    backend: BackendType
    queryParams: ParsedQuery<string | number | boolean>
    dbName?: string
    graphQLEndpoint?: string
    debugGraphQL?: boolean
    runInitialSyncTest?: boolean
    runIncrementalSyncTest?: boolean
}

export async function setup(options: MainOptions) {
    const history = createBrowserHistory()
    const storage = await createStorage({
        ...options,
        dbName: options.dbName || 'syncClient1',
    })
    const services = createServices(storage, options)
    await setClientStorageMiddleware({
        storage,
        services,
    })
    const globals = {
        services,
        storage,
        restart: async (restartOptions: Partial<MainOptions>) => {
            return restart({ ...options, ...restartOptions })
        },
    }
    if (typeof window !== 'undefined') {
        Object.assign(window, globals)
    }
    runUI({ services, storage, history })
    serviceWorker.unregister()
    return globals
}

export async function main(options: MainOptions) {
    if (options.runIncrementalSyncTest) {
        await runIncrementalSyncTest(options)
    } else if (options.runInitialSyncTest) {
        await runInitialSyncTest(options)
    } else {
        await setup(options)
    }
}

export async function restart(options: MainOptions) {
    destroyUI()
    return setup(options)
}

async function runInitialSyncTest(options: MainOptions) {
    console.log('Running Initial Sync test')

    const deviceId = options.queryParams['deviceId']
    if (deviceId === 'one') {
        await deleteDB('syncClient1')
        const { storage, services, restart } = await setup(options)
        const defaultList = await storage.modules.todoList.getOrCreateDefaultList(
            { defaultLabel: 'Storex Sync demo Todo List' },
        )
        await storage.modules.todoList.setItemDone(defaultList.items[1], true)
        console.log('Requesting initial sync')
        const {
            initialMessage,
        } = await services.sync.initialSync.requestInitialSync()
        localStorage.setItem('initialMessage', initialMessage)
        console.log('Wrote initial message to local storage')
        await restart({})
    } else if (deviceId === 'two') {
        await deleteDB('syncClient2')
        const { restart, storage, services } = await setup({
            ...options,
            dbName: 'syncClient2',
        })
        const initialMessage = localStorage.getItem('initialMessage')
        if (!initialMessage) {
            throw new Error(
                `To test the initial Sync as a receiver, first initialize the sender`,
            )
        }
        localStorage.removeItem('initialMessage')
        await services.sync.initialSync.answerInitialSync({
            initialMessage,
        })
        await services.sync.initialSync.waitForInitialSync()
        await restart(options)
    } else {
        throw new Error(`Invalid deviceId passed in URL: ${deviceId}`)
    }
}

async function runIncrementalSyncTest(options: MainOptions) {
    console.log('Running Incremental Sync test')

    await deleteDB('syncClient1')
    await deleteDB('syncClient2')
    await deleteDB('syncServer')

    const {
        restart: restart1,
        storage: storage1,
        services: services1,
    } = await setup(options)
    await services1.auth.waitForAuthentication()
    const defaultList = await storage1.modules.todoList.getOrCreateDefaultList({
        defaultLabel: 'Storex Sync demo Todo List',
    })
    await storage1.modules.todoList.setItemDone(defaultList.items[1], true)
    await services1.sync.continuousSync.initDevice()
    await services1.sync.continuousSync.forceIncrementalSync()

    const { restart: restart2, services: services2 } = await restart1({
        dbName: 'syncClient2',
    })
    await services2.sync.continuousSync.initDevice()
    await services2.sync.continuousSync.forceIncrementalSync()
    await restart2({})
}

main({
    backend: process.env['REACT_APP_BACKEND'] as BackendType,
    queryParams: queryString.parse(window.location.search, {
        parseBooleans: true,
        parseNumbers: true,
    }),
    graphQLEndpoint: process.env['REACT_APP_GRAPHQL_ENDPOINT'],
    debugGraphQL: process.env['REACT_APP_GRAPHQL_DEBUG'] === 'true',
    runInitialSyncTest: process.env['REACT_APP_RUN_INIT_SYNC_TEST'] === 'true',
    runIncrementalSyncTest:
        process.env['REACT_APP_RUN_INCR_SYNC_TEST'] === 'true',
})

function deleteDB(name: string) {
    const request = indexedDB.deleteDatabase(name)
    return new Promise((resolve, reject) => {
        request.onsuccess = resolve
        request.onerror = reject
    })
}

// Add item from console:
// const list = await storage.modules.todoList.getOrCreateDefaultList()
// await storage.modules.todoList.addListItem({label: 'Test', done: false}, {list})
