import { mkdirs, writeFile, readFile } from 'fs-extra'
import { Distribution } from 'helios-distribution-types'
import { ModelStructure } from './ModelStructure'
import { ServerStructure } from './server.struct'
import { join, resolve } from 'path'
import { DistroMeta, getDefaultDistroMeta } from '../../nebula/distrometa'

export class DistributionStructure implements ModelStructure<Distribution> {

    private readonly DISTRO_META_FILE = 'distrometa.json'

    private serverStruct: ServerStructure
    private metaPath: string

    constructor(
        private absoluteRoot: string,
        private baseUrl: string
    ) {
        this.serverStruct = new ServerStructure(this.absoluteRoot, this.baseUrl)
        this.metaPath = join(this.absoluteRoot, 'meta')
    }

    public async init(): Promise<void> {
        await mkdirs(this.absoluteRoot)
        await mkdirs(this.metaPath)

        const distroMeta: DistroMeta = getDefaultDistroMeta()
        await writeFile(resolve(this.metaPath, this.DISTRO_META_FILE), JSON.stringify(distroMeta, null, 2))

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
