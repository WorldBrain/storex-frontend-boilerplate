import createBrowserHistory from "history/createBrowserHistory";
import { runUI, destroyUI } from './ui'
import * as serviceWorker from './serviceWorker'
import { createServices } from './services';
import { BackendType } from './types';
import { createStorage } from "./storage";

export interface MainOptions {
    backend : BackendType
    dbName? : string
}

export async function setup(options : MainOptions) {
    const history = createBrowserHistory()
    const storage = await createStorage({ ...options, dbName: options.dbName || 'syncClient1' })
    const services = createServices(storage, options)
    const globals = { services, storage, restart: async (restartOptions : Partial<MainOptions>) => {
        return restart({ ...options, ...restartOptions })
    } }
    if (typeof window !== 'undefined') {
        Object.assign(window, globals)
    }
    runUI({services, storage, history})
    serviceWorker.unregister()
    return globals
}

export async function main(options : MainOptions) {
    if (process.env.RUN_SYNC_TEST === 'true') {
        await runSyncTest(options)
    }

    await setup(options)
}

export async function restart(options : MainOptions) {
    destroyUI()
    return setup(options)
}

async function runSyncTest(options : MainOptions) {
    const deleteDB = (name : string) => {
        const request = indexedDB.deleteDatabase(name)
        return new Promise((resolve, reject) => {
            request.onsuccess = resolve
            request.onerror = reject
        })
    }

    await deleteDB('syncClient1')
    await deleteDB('syncClient2')
    await deleteDB('syncServer')
    
    const { restart: restart1, storage: storage1, services: services1 } = await setup(options)
    const defaultList = await storage1.modules.todoList.getOrCreateDefaultList({ defaultLabel: 'Storex Sync demo Todo List' })
    await storage1.modules.todoList.setItemDone(defaultList.items[1], true)
    const device1 = await storage1.modules.sharedSyncLog.createDeviceId({ userId: '1', sharedUntil: 0 })
    await services1.sync.forceSync({ deviceId: device1 })
    
    const { restart: restart2, storage: storage2, services: services2 } = await restart1({ dbName: 'syncClient2' })
    const device2 = await storage2.modules.sharedSyncLog.createDeviceId({ userId: '1', sharedUntil: 0 })
    await services2.sync.forceSync({ deviceId: device2 })
    await restart2({})
}

main({backend: process.env['REACT_APP_BACKEND'] as BackendType})

// Add item from console:
// const list = await storage.modules.todoList.getOrCreateDefaultList()
// await storage.modules.todoList.addListItem({label: 'Test', done: false}, {list})