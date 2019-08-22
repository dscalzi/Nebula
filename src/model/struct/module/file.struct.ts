import { Stats } from 'fs'
import { Type } from '../../spec/type'
import { ModuleStructure } from './module.struct'

export class FileStructure extends ModuleStructure {

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
    protected async getModuleUrl(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return 'TODO'
    }
    protected async getModulePath(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return 'TODO'
    }

}
