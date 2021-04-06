import { Stats } from 'fs-extra'
import { Type, Module } from 'helios-distribution-types'
import { join } from 'path'
import { URL } from 'url'
import { VersionSegmented } from '../../../util/VersionSegmented'
import { MinecraftVersion } from '../../../util/MinecraftVersion'
import { ToggleableModuleStructure } from './ToggleableModule.struct'
import { LibraryType } from '../../../model/claritas/ClaritasLibraryType'
import { ClaritasException } from './Module.struct'
import { UntrackedFilesOption } from '../../../model/nebula/servermeta'

export abstract class BaseForgeModStructure extends ToggleableModuleStructure implements VersionSegmented {

    protected readonly EXAMPLE_MOD_ID = 'examplemod'

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        untrackedFiles: UntrackedFilesOption[]
    ) {
        super(absoluteRoot, relativeRoot, 'forgemods', baseUrl, minecraftVersion, Type.ForgeMod, untrackedFiles)
    }

    public async getSpecModel(): Promise<Module[]> {
        // Sort by file name to allow control of load order.
        return (await super.getSpecModel()).sort((a, b) => {
            const aFileName = a.artifact.url.substring(a.artifact.url.lastIndexOf('/')+1)
            const bFileName = b.artifact.url.substring(b.artifact.url.lastIndexOf('/')+1)
            return aFileName.localeCompare(bFileName)
        })
    }

    public abstract isForVersion(version: MinecraftVersion, libraryVersion: string): boolean

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return new URL(join(this.relativeRoot, this.getActiveNamespace(), name), this.baseUrl).toString()
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

    protected getClaritasExceptions(): ClaritasException[] {
        return [{
            exceptionName: 'optifine',
            proxyMetadata: {
                group: 'net.optifine'
            }
        }]
    }

    protected getClaritasType(): LibraryType {
        return LibraryType.FORGE
    }

    protected discernResult(claritasValue: string | undefined, crudeInference: string): string {
        return (claritasValue == null || claritasValue == '') ? crudeInference : claritasValue
    }

}
