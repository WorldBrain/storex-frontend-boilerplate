import React from 'react';
import TodoList from '../../components/todo-list';
import styles from './styles.module.scss';
import { UIElement } from '../../classes';
import { Logic, State } from './logic';
import { Storage } from '../../../storage/types';

interface Props {
    storage : Storage
}

export default class LandingPage extends UIElement<Props, State> {
    constructor(props : Props) {
        super(props, { logic: new Logic({ todoLists: props.storage.modules.todoList }) })
    }

    render() {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    {this.state.loadState === 'running' && 'Loading...'}
                    {this.state.loadState === 'error' && 'Error loading default list'}
                    {this.state.loadState === 'success' && (
                        this.state.list
                        ? this.state.list.label
                        : 'Could not find default list'
                    )}
                </div>
                {this.state.list && <div>
                    <TodoList
                    items={this.state.list.items}
                    onToggle={item => this.processEvent({ type: 'toggleItem', item })}
                    onRemove={item => this.processEvent({ type: 'removeItem', item })}
                />
                </div>}
            </div>
        )
    }
}
