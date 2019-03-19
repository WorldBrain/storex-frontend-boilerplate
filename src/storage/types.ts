import StorageManager from "@worldbrain/storex";
import { ClientSyncLogStorage } from '@worldbrain/storex-sync/lib/client-sync-log'
import { SharedSyncLogStorage } from '@worldbrain/storex-sync/lib/shared-sync-log/storex'
import { TodoListStorage } from "./modules/todo-list";

export interface Storage {
    manager : StorageManager
    modules : StorageModules
}

export interface StorageModules {
    todoList : TodoListStorage
    clientSyncLog : ClientSyncLogStorage
    sharedSyncLog? : SharedSyncLogStorage
}
