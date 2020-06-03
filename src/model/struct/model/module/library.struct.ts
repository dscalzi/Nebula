import { ModuleStructure } from './module.struct'
import { Type, TypeMetadata } from 'helios-distribution-types'
import { Stats } from 'fs-extra'
import { join } from 'path'
import { resolve } from 'url'

export class LibraryStructure extends ModuleStructure {

    private readonly crudeRegex = /(.+)-([\d.]+).[jJ][aA][rR]/

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'libraries', baseUrl, Type.Library, (name: string) => {
            return name.toLowerCase().endsWith(TypeMetadata[this.type].defaultExtension!)
        })
    }

    private attemptCrudeInference(name: string): { name: string, version: string } {
        const result = this.crudeRegex.exec(name)
        if(result != null) {
            return {
                name: result[1],
                version: result[2]
            }
        } else {
            return {
                name: name.substring(0, name.toLowerCase().indexOf(TypeMetadata[this.type].defaultExtension!)),
                version: '0.0.0'
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleId(name: string, path: string): Promise<string> {
        const inference = this.attemptCrudeInference(name)
        return this.generateMavenIdentifier(inference.name, inference.version)
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