export interface AuthService {
    getUserId() : number | string | null
    waitForAuthentication() : Promise<void>
}
