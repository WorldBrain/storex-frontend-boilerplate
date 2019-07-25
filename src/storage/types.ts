import StorageManager from "@worldbrain/storex";
import { ClientSyncLogStorage } from '@worldbrain/storex-sync/lib/client-sync-log'
import { SharedSyncLog } from "@worldbrain/storex-sync/lib/shared-sync-log";
import { TodoListStorage } from "./modules/todo-list";

export interface Storage {
    clientManager : StorageManager
    serverManager? : StorageManager
    modules : StorageModules
}

export interface StorageModules {
    todoList : TodoListStorage
    clientSyncLog : ClientSyncLogStorage
    sharedSyncLog : SharedSyncLog
}

export type StorageModuleInfo = {[key in keyof StorageModules]? : { sync: boolean }}
