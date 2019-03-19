import * as history from 'history'
import React from 'react'
import { Router, Route, Switch } from "react-router"

import { Storage } from '../storage/types';
import { Services } from '../services/types'

import NotFound from './pages/not-found'
import LandingPage from './pages/landing-page'

export default function Routes(props : { history : history.History, storage : Storage, services : Services }) {
    return (<Router history={props.history}>
        <Switch>
            <Route exact path="/" render={() => {
                return <LandingPage storage={props.storage} />
            }} />
            <Route component={NotFound} />
        </Switch>
    </Router>)
}
