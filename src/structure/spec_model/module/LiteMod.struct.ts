import StreamZip from 'node-stream-zip'
import { Stats } from 'fs-extra'
import { Type } from 'helios-distribution-types'
import { join } from 'path'
import { URL } from 'url'
import { capitalize } from '../../../util/stringutils'
import { LiteMod } from '../../../model/liteloader/litemod'
import { ToggleableModuleStructure } from './ToggleableModule.struct'
import { MinecraftVersion } from '../../../util/MinecraftVersion'
import { LibraryType } from '../../../model/claritas/ClaritasLibraryType'
import { MetadataUtil } from '../../../util/MetadataUtil'
import { UntrackedFilesOption } from '../../../model/nebula/servermeta'

export class LiteModStructure extends ToggleableModuleStructure {

    private liteModMetadata: {[property: string]: LiteMod | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        untrackedFiles: UntrackedFilesOption[]
    ) {
        super(absoluteRoot, relativeRoot, 'litemods', baseUrl, minecraftVersion, Type.LiteMod, untrackedFiles)
    }

    public getLoggerName(): string {
        return 'LiteModStructure'
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const liteModData = await this.getLiteModMetadata(name, path)
        return this.generateMavenIdentifier(
            MetadataUtil.completeGroupInference(this.getClaritasGroup(path), liteModData.name), liteModData.name, `${liteModData.version}-${liteModData.mcversion}`)
    }
    protected async getModuleName(name: string, path: string): Promise<string> {
        return capitalize((await this.getLiteModMetadata(name, path)).name)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return new URL(join(this.relativeRoot, this.getActiveNamespace(), name), this.baseUrl).toString()
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

    protected getClaritasType(): LibraryType {
        return LibraryType.LITELOADER
    }

    private getLiteModMetadata(name: string, path: string): Promise<LiteMod> {
        return new Promise((resolve, reject) => {
            if (!Object.prototype.hasOwnProperty.call(this.liteModMetadata, name)) {

                const zip = new StreamZip({
                    file: path,
                    storeEntries: true
                })

                zip.on('error', err => reject(err))
                zip.on('ready', () => {
                    try {
                        const res = this.processZip(zip, name)
                        zip.close()
                        resolve(res)
                        return
                    } catch(err) {
                        zip.close()
                        reject(err)
                        return
                    }
                })

            } else {
                resolve(this.liteModMetadata[name] as LiteMod)
                return
            }

        })
    }

    private processZip(zip: StreamZip, name: string): LiteMod {

        let raw: Buffer | undefined
        try {
            raw = zip.entryDataSync('litemod.json')
        } catch(err) {
            // ignored
        }

        if (raw) {
            this.liteModMetadata[name] = JSON.parse(raw.toString()) as LiteMod
        } else {
            throw new Error(`Litemod ${name} does not contain litemod.json file.`)
        }

        return this.liteModMetadata[name] as LiteMod

    }

}
