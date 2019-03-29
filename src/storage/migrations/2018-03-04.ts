import { MigrationListEntry } from "@worldbrain/storex-schema-migrations/lib/types";

const MIGRATION : MigrationListEntry = {
    fromVersion: new Date('2018-03-03'),
    toVersion: new Date('2018-03-04'),
    config: {
        dataOperations: {
            forward: [
                { type: 'writeField', collection: 'todoList', field: 'default', value: {not: {not: '$object.default'}} }
            ],
            backward: [],
        }
    }
}

export default MIGRATION