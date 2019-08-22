import { mkdirs } from 'fs-extra'
import { Distribution } from '../spec/distribution'
import { ModelStructure } from './model.struct'
import { ServerStructure } from './server.struct'

export class DistributionStructure implements ModelStructure<Distribution> {

    private serverStruct: ServerStructure

    constructor(
        private absoluteRoot: string,
        private baseUrl: string
    ) {
        this.serverStruct = new ServerStructure(this.absoluteRoot, this.baseUrl)
    }

    public async init() {
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
