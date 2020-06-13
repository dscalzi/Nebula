import { Stats } from 'fs-extra'
import { Type } from 'helios-distribution-types'
import { join } from 'path'
import { resolve } from 'url'
import { VersionSegmented } from '../../../../util/VersionSegmented'
import { ModuleStructure } from './module.struct'
import { MinecraftVersion } from '../../../../util/MinecraftVersion'

export abstract class BaseForgeModStructure extends ModuleStructure implements VersionSegmented {

    protected readonly EXAMPLE_MOD_ID = 'examplemod'

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'forgemods', baseUrl, Type.ForgeMod)
    }

    public abstract isForVersion(version: MinecraftVersion, libraryVersion: string): boolean

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return resolve(this.baseUrl, join(this.relativeRoot, name))
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

}
