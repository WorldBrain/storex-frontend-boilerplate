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

export async function main(options : MainOptions) {
    const history = createBrowserHistory()
    const storage = await createStorage({ ...options, dbName: options.dbName || 'syncClient1' })
    const services = createServices(storage, options)
    if (typeof window !== 'undefined') {
        Object.assign(window, { services, storage, restart: async (restartOptions : Partial<MainOptions>) => {
            await restart({ ...options, ...restartOptions })
        } })
    }
    runUI({services, storage, history})
    serviceWorker.unregister()
}

export async function restart(options : MainOptions) {
    destroyUI()
    await main(options)
}

main({backend: process.env['REACT_APP_BACKEND'] as BackendType})

// Add item from console:
// const list = await storage.modules.todoList.getOrCreateDefaultList()
// await storage.modules.todoList.addListItem({label: 'Test', done: false}, {list})