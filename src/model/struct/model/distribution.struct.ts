import { mkdirs } from 'fs-extra'
import { Distribution } from 'helios-distribution-types'
import { ModelStructure } from './ModelStructure'
import { ServerStructure } from './server.struct'

export class DistributionStructure implements ModelStructure<Distribution> {

    private serverStruct: ServerStructure

    constructor(
        private absoluteRoot: string,
        private baseUrl: string
    ) {
        this.serverStruct = new ServerStructure(this.absoluteRoot, this.baseUrl)
    }

    public async init(): Promise<void> {
        await mkdirs(this.absoluteRoot)
        await this.serverStruct.init()
    }

    public async getSpecModel(): Promise<Distribution> {
        return {
            version: '1.0.0',
            rss: '<FILL IN MANUALLY>',
            servers: await this.serverStruct.getSpecModel()
        }
    }

}
