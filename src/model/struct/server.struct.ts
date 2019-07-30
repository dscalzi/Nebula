import { resolve } from 'path'
import { Server } from '../spec/server'
import { ModelStructure } from './model.struct'

export class ServerStructure implements ModelStructure<Server[]> {

    private servers: Server[] | undefined

    constructor(
        private root: string
    ) {}

    public getSpecModel(): Server[] {
        if (this.servers == null) {
            this.servers = this._doSeverRetrieval()
        }
        return this.servers
    }

    private _doSeverRetrieval(): Server[] {
        const base = resolve(this.root, 'servers')
        return [] // TODO
    }

}
