import React from 'react';
import styles from './text-input.module.scss';
import { UIElement } from '../../classes';

interface PropTypes {
    className? : string
    contentType? : 'email' | 'phone'
    placeholder? : string
    onChange? : (event : {value : string}) => void | Promise<void>
}

export default class TextInput extends UIElement<PropTypes> {
    render() {
        return (
            <input type={this.props.contentType || 'text'} placeholder={this.props.placeholder} className={`${styles.input} ${this.props.className || ''}`} />
        )
    }
}
