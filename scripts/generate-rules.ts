import fs from 'fs'
import { generateRulesAstFromStorageModules } from '@worldbrain/storex-backend-firestore/lib/security-rules'
import { serializeRulesAST } from '@worldbrain/storex-backend-firestore/lib/security-rules/ast';
import { createStorage } from '../src/storage'

export async function main() {
    const outFilePath = process.argv[2]
    if (!outFilePath) {
        throw new Error(`Please provide output file path as only argument`)
    }

    const storage = await createStorage({ backend: 'memory', dbName: 'temp' })
    if (!storage.serverManager) {
        throw new Error(`Could not find server storage manager`)
    }

    const ast = await generateRulesAstFromStorageModules(storage.modules as any, { storageRegistry: storage.serverManager.registry })
    const serialized = serializeRulesAST(ast)
    fs.writeFileSync(outFilePath, serialized)
    console.log(`Security rules successfully written to file '${outFilePath}'`)
}

if (require.main === module) {
    main()
}
