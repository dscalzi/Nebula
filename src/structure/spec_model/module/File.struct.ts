/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stats } from 'fs'
import { Type, Module } from 'helios-distribution-types'
import { URL } from 'url'
import { ModuleStructure } from './Module.struct'
import { readdir, stat } from 'fs-extra'
import { join, resolve, sep } from 'path'
import { MinecraftVersion } from '../../../util/MinecraftVersion'
import { UntrackedFilesOption } from '../../../model/nebula/servermeta'

export class MiscFileStructure extends ModuleStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        untrackedFiles: UntrackedFilesOption[]
    ) {
        super(absoluteRoot, relativeRoot, 'files', baseUrl, minecraftVersion, Type.File, untrackedFiles)
    }

    public getLoggerName(): string {
        return 'MiscFileStructure'
    }

    public async getSpecModel(): Promise<Module[]> {
        if (this.resolvedModels == null) {
            this.resolvedModels = await this.recursiveModuleScan(this.containerDirectory)
        }

        return this.resolvedModels
    }

    protected async recursiveModuleScan(dir: string): Promise<Module[]> {
        let acc: Module[] = []
        const subdirs = await readdir(dir)
        for (const file of subdirs) {
            const filePath = resolve(dir, file)
            const stats = await stat(filePath)
            if (stats.isDirectory()) {
                acc = acc.concat(await this.recursiveModuleScan(filePath))
            } else {
                if(!this.FILE_NAME_BLACKLIST.includes(file)) {
                    acc.push(await this.parseModule(file, filePath, stats))
                }
            }
        }
        return acc
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        return name
    }
    protected async getModuleName(name: string, path: string): Promise<string> {
        return name
    }
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return new URL(join(this.relativeRoot, ...path.substr(this.containerDirectory.length+1).split(sep)), this.baseUrl).toString()
    }
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return path.substr(this.containerDirectory.length+1).replace(/\\/g, '/')
    }

}
