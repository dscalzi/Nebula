import { Stats } from 'fs-extra'
import { join } from 'path'
import { Type } from '../../spec/type'
import { ModuleStructure } from './module.struct'

export class LiteModStructure extends ModuleStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'litemods', baseUrl, Type.LiteMod)
    }

    protected async getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return name
    }
    protected async getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return name
    }
    protected async getModuleUrl(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return 'TODO'
    }
    protected async getModulePath(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return 'TODO'
    }

}
