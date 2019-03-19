import createBrowserHistory from "history/createBrowserHistory";
import runUi from './ui'
import * as serviceWorker from './serviceWorker'
import { createServices } from './services';
import { BackendType } from './types';
import { createStorage } from "./storage";

export async function main(options : {backend : BackendType}) {
    const history = createBrowserHistory()
    const services = createServices(options)
    const storage = await createStorage(options)
    if (typeof window !== 'undefined') {
        Object.assign(window, { services, storage })
    }
    runUi({services, storage, history})
    serviceWorker.unregister()
}

main({backend: process.env['REACT_APP_BACKEND'] as BackendType})

// Add item from console:
// const list = await storage.modules.todoList.getOrCreateDefaultList()
// await storage.modules.todoList.addListItem({label: 'Test', done: false}, {list})