import { Component } from 'react';
import MESSAGES from '../messages';
import * as logic from './logic'

export abstract class UIElement<Props = {}, State = {}> extends Component<Props, State> {
    public logic?: logic.UILogic<State, any>

    constructor(props : any, options : { logic?: logic.UILogic<State, any> } = {}) {
        super(props)
        if (options.logic) {
            this.logic = options.logic;
            (this as any).state = this.logic.getInitialState()
        }
    }
    
    getText(id : string, options : {default? : string} = {}) {
        return MESSAGES[id] || options.default || 'MISSING TEXT'
    }

    async processEvent(event : logic.UIEvent<any>) {
        if (!this.logic) {
            throw new Error('Tried to process event in UIElement without logic')
        }
        await this.logic.processUIEvent(event, { state: this.state })
    }

    processMutation(mutation : logic.UIMutation<any>) {
        let needsForceUpdate = false
        if (mutation.set) {
            this.setState(mutation.set)
        }
        if (mutation.setIn) {
            const [path, value] = mutation.setIn
            let obj = (this.state as any)
            for (const key of path.slice(0, -1)) {
                obj = obj[key]
            }
            obj[path.slice(-1)[0]] = value
            needsForceUpdate = true
        }
        if (mutation.removeIndex) {
            for (const [key, index] of Object.entries(mutation.removeIndex)) {
                ((this.state as any)[key] as any[]).splice(index as number)
            }
            needsForceUpdate = true
        }
        if (mutation.removeIndexIn) {
            const [path, index] = mutation.removeIndexIn
            let obj = (this.state as any)
            for (const key of path) {
                obj = obj[key]
            }
            delete obj[index]
            needsForceUpdate = true
        }
        if (needsForceUpdate) {
            this.forceUpdate()
        }
    }

    componentWillMount() {
        if (this.logic) {
            this.logic.events.addListener('mutation', mutation => this.processMutation(mutation))
        }
    }

    componentDidMount() {
        if (this.logic) {
            this.processEvent({ type: 'init' })
        }
    }

    componentWillUnmount() {
        if (this.logic) {
            this.logic.events.removeAllListeners()
        }
    }
}
