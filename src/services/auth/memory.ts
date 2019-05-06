import { AuthService } from "./types";

export class MemoryAuth implements AuthService {
    constructor(private options : { idType : 'number' | 'string' }) {
    }

    getUserId() : number | string | null {
        return this.options.idType === 'number' ? `1` : 'alice'
    }

    async waitForAuthentication() {
        // We're always logged in, return immediately
    }
}
