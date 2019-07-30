import { Distribution } from '../spec/distribution'
import { ModelStructure } from './model.struct'
import { ServerStructure } from './server.struct'

export class DistributionStructure implements ModelStructure<Distribution> {

    private servers: ServerStructure[] | undefined

    constructor(
        private root: string
    ) {}

    public getServers() {
        return new ServerStructure(this.root).getSpecModel()
    }

    public getSpecModel(): Distribution {
        return {
            version: '1.0.0',
            rss: 'TODO',
            servers: this.getServers()
        }
    }

}
