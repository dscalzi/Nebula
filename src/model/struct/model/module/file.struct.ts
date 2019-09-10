import { Stats } from 'fs'
import { join } from 'path'
import { resolve } from 'url'
import { Type } from '../../../spec/type'
import { ModuleStructure } from './module.struct'

export class MiscFileStructure extends ModuleStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'files', baseUrl, Type.File)
    }

    protected async getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return name
    }
    protected async getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return name
    }
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return resolve(this.baseUrl, join(this.relativeRoot, name))
    }
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return name
    }

}
