import * as logic from "../../classes/logic"
import { UITaskState } from "../../types";
import { TodoItem, TodoList } from "../../types/todo-list";
import { TodoListStorage } from "../../../storage/modules/todo-list";

export interface State {
    loadState : UITaskState
    list : TodoList
}
export type Event = logic.UIEvent<LoadedEvent>
export interface LoadedEvent {
    type: 'loaded',
    list: TodoList
}
export interface ToggleItemEvent {
    type: 'toggleItem',
    item: TodoItem
}
export interface RemoveItemEvent {
    type: 'removeItem',
    item: TodoItem
}
export class Logic extends logic.UILogic<State, Event> {
    constructor(private options : { todoLists : TodoListStorage }) {
        super()
    }

    getInitialState() : State {
        return {
            loadState: 'pristine',
            list: null as any
        }
    }

    async processToggleItem(event : ToggleItemEvent, options : { state : State }) : Promise<logic.UIMutation<State>> {
        const index = options.state.list.items.findIndex(item => item.id === event.item.id)
        const done = !options.state.list.items[index].done;
        this.options.todoLists.setItemDone(event.item, done)
        return { setIn : [
            ['list', 'items', index, 'done'],
            done
        ] }
    }

    async processInit(event : any, options : any) : Promise<logic.UIMutation<State>> {
        this.options.todoLists.getDefaultList().then(list => this.processUIEvent({
            type: 'loaded',
            list,
        }, options))
        return { set: { loadState: 'running' } }
    }

    async processLoaded(event : LoadedEvent) : Promise<logic.UIMutation<State>> {
        return { set: { loadState: 'success', list: event.list } }
    }

    async processRemoveItem(event : RemoveItemEvent, options : { state : State }) : Promise<logic.UIMutation<State>> {
        const index = options.state.list.items.findIndex(item => item.id === event.item.id)
        this.options.todoLists.removeListItem(event.item)
        return { removeIndexIn: [
            ['list', 'items'],
            index
        ] }
    }
}
