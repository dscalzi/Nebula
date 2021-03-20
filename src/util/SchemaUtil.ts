import { mkdirs, pathExists, remove, writeFile } from 'fs-extra'
import { join, resolve } from 'path'
import { createGenerator } from 'ts-json-schema-generator'
import { URL } from 'url'
import { DistroMeta } from '../model/nebula/distrometa'
import { ServerMeta } from '../model/nebula/servermeta'
import { LoggerUtil } from './LoggerUtil'

const logger = LoggerUtil.getLogger('SchemaUtil')

interface SchemaType {
    /**
     * URL to the JSON schema for this type of file.
     * This is used by editors to validate and annotate the data.
     */
    $schema?: string
}

export type DistroMetaSchema = DistroMeta & SchemaType
export type ServerMetaSchema = ServerMeta & SchemaType

export enum SchemaTypes {
    DistroMetaSchema = 'DistroMetaSchema',
    ServerMetaSchema = 'ServerMetaSchema'
}

function getSchemaFileName(typeName: string): string {
    return `${typeName}.schema.json`
}

function getSchemaDirectory(absoluteRoot: string): string {
    return resolve(absoluteRoot, 'schemas')
}

function getSchemaLocation(typeName: string, absoluteRoot: string): string {
    return resolve(getSchemaDirectory(absoluteRoot), getSchemaFileName(typeName))
}

export function addSchemaToObject<T>(obj: T, typeName: string, absoluteRoot: string): T {
    return {
        $schema: new URL(`file:${getSchemaLocation(typeName, absoluteRoot)}`).href,
        ...obj
    }
}

export async function generateSchemas(absoluteRoot: string): Promise<void> {

    const selfPath = __filename.replace('dist', 'src').replace('.js', '.ts')

    const schemaDir = getSchemaDirectory(absoluteRoot)
    if(await pathExists(schemaDir)) {
        await remove(schemaDir)
    }
    await mkdirs(schemaDir)

    for(const typeName of Object.values(SchemaTypes)) {

        logger.info(`Generating schema for ${typeName}`)

        const schema = createGenerator({
            tsconfig: join(__dirname, '..', '..', 'tsconfig.json'),
            path: selfPath,
            type: typeName
        }).createSchema(typeName)

        const schemaString = JSON.stringify(schema)
        const schemaLoc = getSchemaLocation(typeName, absoluteRoot)
        await writeFile(schemaLoc, schemaString)

        logger.info(`Schema for ${typeName} saved to ${schemaLoc}`)
    }

}