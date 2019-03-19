import * as history from 'history'
import React from 'react';
import ReactDOM from 'react-dom';

import 'typeface-open-sans';
import 'typeface-nunito';
import 'font-awesome/css/font-awesome.css';

import { Services } from '../services/types';
import { Storage } from '../storage/types';

import App from './containers/app';
import './index.css';
import Routes from './routes';

export default function runUi(options : {services : Services, storage : Storage, history : history.History}) {
    ReactDOM.render((<App services={options.services} storage={options.storage}>
        <Routes history={options.history} services={options.services} storage={options.storage} />
    </App>), document.getElementById('root'))
}
