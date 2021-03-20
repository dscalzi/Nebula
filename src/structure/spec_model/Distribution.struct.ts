import { mkdirs, writeFile, readFile, pathExists } from 'fs-extra'
import { Distribution } from 'helios-distribution-types'
import { SpecModelStructure } from './SpecModelStructure'
import { ServerStructure } from './Server.struct'
import { join, resolve } from 'path'
import { DistroMeta, getDefaultDistroMeta } from '../../model/nebula/distrometa'
import { addSchemaToObject, SchemaTypes } from '../../util/SchemaUtil'
import { LoggerUtil } from '../../util/LoggerUtil'

const logger = LoggerUtil.getLogger('DistributionStructure')

export class DistributionStructure implements SpecModelStructure<Distribution> {

    private readonly DISTRO_META_FILE = 'distrometa.json'

    private serverStruct: ServerStructure
    private metaPath: string

    constructor(
        private absoluteRoot: string,
        private baseUrl: string,
        discardOutput: boolean,
        invalidateCache: boolean
    ) {
        this.serverStruct = new ServerStructure(this.absoluteRoot, this.baseUrl, discardOutput, invalidateCache)
        this.metaPath = join(this.absoluteRoot, 'meta')
    }

    public async init(): Promise<void> {
        await mkdirs(this.absoluteRoot)
        await mkdirs(this.metaPath)

        const distroMetaFile = resolve(this.metaPath, this.DISTRO_META_FILE)
        if(await pathExists(distroMetaFile)) {
            logger.warn(`Distro Meta file already exists at ${distroMetaFile}!`)
            logger.warn('If you wish to regenerate this file, you must delete the existing one!')
        } else {
            const distroMeta: DistroMeta = addSchemaToObject(
                getDefaultDistroMeta(),
                SchemaTypes.DistroMetaSchema,
                this.absoluteRoot
            )
            await writeFile(distroMetaFile, JSON.stringify(distroMeta, null, 2))
        }

        await this.serverStruct.init()
    }

    public async getSpecModel(): Promise<Distribution> {

        const distroMeta: DistroMeta = JSON.parse(await readFile(resolve(this.metaPath, this.DISTRO_META_FILE), 'utf-8'))

        return {
            version: '1.0.0',
            rss: distroMeta.meta.rss,
            ...(distroMeta.meta.discord ? {discord: distroMeta.meta.discord} : {}),
            servers: await this.serverStruct.getSpecModel()
        }
    }

}
