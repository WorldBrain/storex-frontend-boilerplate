import { StorageModuleConfig } from "@worldbrain/storex-pattern-modules";
import { ModuleHistory } from "./types";

export function withHistory(moduleConfig : StorageModuleConfig & { history : ModuleHistory }) : StorageModuleConfig {
    for (const [collectionName, collectionHistory] of Object.entries(moduleConfig.history.collections)) {
        if (!moduleConfig.collections) {
            continue
        }

        moduleConfig.collections[collectionName].history = collectionHistory
    }
    return moduleConfig
}
