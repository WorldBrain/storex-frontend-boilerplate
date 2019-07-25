import { StorageModuleInfo, Storage } from "./types";
import { STORAGE_MODULE_INFO } from "./constants";
import { StorageModule } from "@worldbrain/storex-pattern-modules";

export function getCollectionsToSync(storage : Storage) : string[] {
    return Object.entries(STORAGE_MODULE_INFO).map(
        ([moduleName, moduleInfo]) =>
        moduleInfo && moduleInfo.sync
            ? Object.keys(((storage.modules as any)[moduleName] as StorageModule).collections)
            : []
    ).reduce((prev, curr) => prev.concat(curr), [])
}
