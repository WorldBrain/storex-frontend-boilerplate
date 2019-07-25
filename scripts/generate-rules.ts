import fs from 'fs'
import path from 'path'
import { getSignallingRules } from 'simple-signalling/lib/firebase'
import { generateRulesAstFromStorageModules } from '@worldbrain/storex-backend-firestore/lib/security-rules'
import { serializeRulesAST } from '@worldbrain/storex-backend-firestore/lib/security-rules/ast';
import { createStorage } from '../src/storage'

export async function main() {
    const firebaseRootDir = process.argv[2]
    if (!firebaseRootDir) {
        throw new Error(`Please provide output file path as only argument`)
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(path.join(firebaseRootDir, 'firebase.json')).toString())

    const storage = await createStorage({ backend: 'memory-with-firestore-sync', dbName: 'temp' })
    if (!storage.serverManager) {
        throw new Error(`Could not find server storage manager`)
    }

    const firestoreRulesPath = path.join(firebaseRootDir, firebaseConfig['firestore']['rules'])
    const ast = await generateRulesAstFromStorageModules(storage.modules as any, { storageRegistry: storage.serverManager.registry })
    const serialized = serializeRulesAST(ast)
    fs.writeFileSync(firestoreRulesPath, serialized)
    console.log(`Firestore security rules successfully written to file '${firestoreRulesPath}'`)

    const firebaseRulesPath = path.join(firebaseRootDir, firebaseConfig['database']['rules'])
    const singallingCollectionName = 'signalling'
    fs.writeFileSync(firebaseRulesPath, JSON.stringify({
        "rules": {
            [singallingCollectionName]: getSignallingRules()
        }
    }, null, 4))
    console.log(`Real-time database security rules successfully written to file '${firebaseRulesPath}'`)
}

if (require.main === module) {
    main()
}
