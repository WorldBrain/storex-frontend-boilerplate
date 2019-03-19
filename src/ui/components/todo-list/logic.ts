import * as logic from "../../classes/logic"
import { TodoItem } from "../../types/todo-list";

export interface UIState {
    items : TodoItem[]
}
export type UIEvent = logic.UIEvent<any>
// export interface LoadedEvent {
//     type: 'loaded',
//     items: TodoItem[]
// }
export default class Logic extends logic.UILogic<UIState, UIEvent> {
    inititalState : UIState = {
        items: []
    }
}
