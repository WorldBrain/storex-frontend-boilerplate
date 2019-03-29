import { ModuleHistory } from "./types";

export const HISTORY : ModuleHistory = {
    collections: {
        todoList: [
            {
                version: new Date('2018-03-03'),
                fields: {
                    label: { type: 'text' },
                    default: { type: 'boolean', optional: true }
                }
            }
        ],
        todoItem: [
            {
                version: new Date('2018-03-03'),
                fields: {
                    label: { type: 'text' },
                    done: { type: 'boolean' },
                },
                relationships: [
                    { alias: 'list', reverseAlias: 'items', childOf: 'todoList' }
                ]
            }
        ]
    }
}

export default HISTORY
