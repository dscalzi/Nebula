import { createHash } from 'crypto'
import { lstat, pathExists, readdir, readFile, Stats } from 'fs-extra'
import { Module, Type, TypeMetadata } from 'helios-distribution-types'
import { resolve } from 'path'
import { BaseModelStructure } from '../basemodel.struct'

export abstract class ModuleStructure extends BaseModelStructure<Module> {

    private readonly crudeRegex = /(.+?)-(.+).[jJ][aA][rR]/
    protected readonly DEFAULT_VERSION = '0.0.0'

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string,
        baseUrl: string,
        protected type: Type,
        protected filter?: ((name: string, path: string, stats: Stats) => boolean)
    ) {
        super(absoluteRoot, relativeRoot, structRoot, baseUrl)
    }

    public async getSpecModel(): Promise<Module[]> {
        if (this.resolvedModels == null) {
            this.resolvedModels = await this._doModuleRetrieval(this.containerDirectory)
        }

        return this.resolvedModels
    }

    protected generateMavenIdentifier(name: string, version: string): string {
        return `generated.${this.type.toLowerCase()}:${name}:${version}@${TypeMetadata[this.type].defaultExtension}`
    }

    protected attemptCrudeInference(name: string): { name: string, version: string } {
        const result = this.crudeRegex.exec(name)
        if(result != null) {
            return {
                name: result[1],
                version: result[2]
            }
        } else {
            return {
                name: name.substring(0, name.lastIndexOf('.')),
                version: this.DEFAULT_VERSION
            }
        }
    }

    protected async abstract getModuleId(name: string, path: string): Promise<string>
    protected async abstract getModuleName(name: string, path: string): Promise<string>
    protected async abstract getModuleUrl(name: string, path: string, stats: Stats): Promise<string>
    protected async abstract getModulePath(name: string, path: string, stats: Stats): Promise<string | null>

    protected async parseModule(file: string, filePath: string, stats: Stats): Promise<Module> {
        const buf = await readFile(filePath)
        const mdl: Module = {
            id: await this.getModuleId(file, filePath),
            name: await this.getModuleName(file, filePath),
            type: this.type,
            artifact: {
                size: stats.size,
                MD5: createHash('md5').update(buf).digest('hex'),
                url: await this.getModuleUrl(file, filePath, stats)
            }
        }
        const pth = await this.getModulePath(file, filePath, stats)
        if (pth) {
            mdl.artifact.path = pth
        }
        return mdl
    }

    protected async _doModuleRetrieval(scanDirectory: string): Promise<Module[]> {

        const accumulator: Module[] = []

        if (await pathExists(scanDirectory)) {
            const files = await readdir(scanDirectory)
            for (const file of files) {
                const filePath = resolve(scanDirectory, file)
                const stats = await lstat(filePath)
                if (stats.isFile()) {
                    if(this.filter == null || this.filter(file, filePath, stats)) {
                        accumulator.push(await this.parseModule(file, filePath, stats))
                    }
                    
                }
            }
        }

        return accumulator

    }

}
