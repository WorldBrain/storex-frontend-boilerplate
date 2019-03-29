import { CollectionDefinition } from '@worldbrain/storex'

export interface ModuleHistory {
    collections : {[name : string] : Array<CollectionDefinition>}
}
