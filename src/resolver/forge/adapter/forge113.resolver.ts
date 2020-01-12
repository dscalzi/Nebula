import { Module } from '../../../model/spec/module'
import { ForgeResolver } from '../forge.resolver'

export class Forge113Adapter extends ForgeResolver {

    public static isForVersion(version: string) {
        return Forge113Adapter.isVersionAcceptable(version, [13, 14, 15])
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: string,
        forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, forgeVersion)
    }

    public async getModule(): Promise<Module> {
        return null as unknown as Module
    }

    public isForVersion(version: string): boolean {
        return Forge113Adapter.isForVersion(version)
    }

}
