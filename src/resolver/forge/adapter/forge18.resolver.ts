import { Module } from '../../../model/spec/module'
import { ForgeResolver } from '../forge.resolver'

export class Forge18Adapter extends ForgeResolver {

    public async getModule(): Promise<Module> {
        return null as unknown as Module
    }

}
