import * as firebase from 'firebase/app'
import 'firebase/auth';
import { AuthService } from './types';

export class FirebaseAuth implements AuthService {
    async startEmailLogin(email : string) {
        firebase.auth().sendSignInLinkToEmail(email, { handleCodeInApp: true, url: window.location.href })
        window.localStorage.setItem('emailForSignIn', email)
    }

    async finishEmailLogin() {
        let email = window.localStorage.getItem('emailForSignIn')
        if (!email) {
            email = window.prompt('Please provide your email for confirmation') as string
        }
        await firebase.auth().signInWithEmailLink(email, window.location.href)
    }

    getUserId() : string | null {
        const user = firebase.auth().currentUser
        return user && user.uid
    }

    async waitForAuthentication() {
        if (this.getUserId()) {
            return
        }

        console.log('Waiting for authenticated user')
        await new Promise(resolve => {
            const unsubscribe = firebase.auth().onAuthStateChanged(() => {
                if (this.getUserId()) {
                    console.log('Detected authenticated user!')
                    unsubscribe()
                    resolve()
                }
            })
        })
    }
}
