import { ModuleStructure } from './module.struct'
import { Type, TypeMetadata } from 'helios-distribution-types'
import { Stats } from 'fs-extra'
import { join } from 'path'
import { resolve } from 'url'
import { MinecraftVersion } from '../../../../util/MinecraftVersion'

export class LibraryStructure extends ModuleStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion
    ) {
        super(absoluteRoot, relativeRoot, 'libraries', baseUrl, minecraftVersion, Type.Library, (name: string) => {
            return name.toLowerCase().endsWith(TypeMetadata[this.type].defaultExtension!)
        })
    }

    public getLoggerName(): string {
        return 'LibraryStructure'
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleId(name: string, path: string): Promise<string> {
        const inference = this.attemptCrudeInference(name)
        return this.generateMavenIdentifier(this.getDefaultGroup(), inference.name, inference.version)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleName(name: string, path: string): Promise<string> {
        const inference = this.attemptCrudeInference(name)
        return inference.name
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return resolve(this.baseUrl, join(this.relativeRoot, name))
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

}