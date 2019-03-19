import { EventEmitter } from "events";
import { capitalize } from "../../utils/string";

export type UIEvent<EventTypes> = { type : string } | { type : 'init' } | EventTypes
export class UILogic<State, Event extends UIEvent<any>> {
    events = new EventEmitter()

    getInitialState() : State | null {
        return null
    }

    async processUIEvent(event : Event, options : { state : State }) : Promise<any> {
        const handler : Function = (this as any)[`process${capitalize(event.type)}`]
        if (!handler) {
            throw new Error(`Tried to process UI event which I couldn't find a process* method for: ${event.type}`)
        }
        const mutation = await handler.call(this, event, options)
        if (mutation) {
            this.events.emit('mutation', mutation)
        }
    }
}

export interface UIMutation<State> {
    set? : Partial<State>
    setIn? : [Array<string | number>, any]
    removeIndex? : {[key in keyof State]? : number}
    removeIndexIn? : [Array<string | number>, number]
}
