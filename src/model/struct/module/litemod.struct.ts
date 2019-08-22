import AdmZip from 'adm-zip'
import { Stats } from 'fs-extra'
import { join } from 'path'
import { resolve } from 'url'
import { capitalize } from '../../../util/stringutils'
import { LiteMod } from '../../liteloader/litemod'
import { Type } from '../../spec/type'
import { ModuleStructure } from './module.struct'

export class LiteModStructure extends ModuleStructure {

    private liteModMetadata: {[property: string]: LiteMod | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'litemods', baseUrl, Type.LiteMod)
    }

    protected async getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        const liteModData = this.getLiteModMetadata(buf, name)
        return this.generateMavenIdentifier(liteModData.name, `${liteModData.version}-${liteModData.mcversion}`)
    }
    protected async getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return capitalize(this.getLiteModMetadata(buf, name).name)
    }
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return resolve(this.baseUrl, join(this.relativeRoot, name))
    }
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

    private getLiteModMetadata(buf: Buffer, name: string): LiteMod {
        if (!this.liteModMetadata.hasOwnProperty(name)) {
            const zip = new AdmZip(buf)
            const zipEntries = zip.getEntries()

            let raw
            for (const entry of zipEntries) {
                if (entry.entryName === 'litemod.json') {
                    raw = zip.readAsText(entry)
                    break
                }
            }

            if (raw) {
                this.liteModMetadata[name] = JSON.parse(raw) as LiteMod
            } else {
                throw new Error(`Litemod ${name} does not contain litemod.json file.`)
            }
        }

        return this.liteModMetadata[name] as LiteMod
    }

}
