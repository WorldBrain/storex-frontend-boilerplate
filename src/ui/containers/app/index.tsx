import React from 'react';
import { Services } from '../../../services/types';
import { Storage } from '../../../storage/types';
// import logo from '../../../assets/img/logo.svg';
import styles from './styles.module.scss';
import '../../styles/global.scss'
import { UIElement } from '../../classes';

interface PropTypes {
  children : React.ReactNode
  services : Services
  storage : Storage
}

class App extends UIElement<PropTypes> {
  render() {
    return (
      <div className={styles.container}>
        { this.props.children }
      </div>
    )
  }
}

export default App
