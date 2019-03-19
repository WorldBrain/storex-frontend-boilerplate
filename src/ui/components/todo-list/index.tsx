import React from 'react';
import styles from './styles.module.scss';
import { UIElement } from '../../classes';
import { TodoItem } from '../../types/todo-list';

interface Props {
  items : TodoItem[]
  onToggle : (item : TodoItem) => void
  onRemove : (item : TodoItem) => void
}

export default class TodoList extends UIElement<Props> {
  render() {
    return (
        <div className={styles.container}>
            {this.props.items.map(item => <div key={item.id} className={styles.item}>
              <div className={styles.done} onClick={() => this.props.onToggle(item)}>
                <i className={item.done ? 'fas fa-check-square' : 'far fa-square'}></i>
              </div>
              <div className={styles.label}>
                {item.label}
                <i className={`fas fa-minus-circle ${styles.remove}`} onClick={() => this.props.onRemove(item)}></i>
              </div>
            </div>)}
        </div>
    )
  }
}
