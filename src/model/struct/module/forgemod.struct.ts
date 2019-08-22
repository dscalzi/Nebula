import AdmZip from 'adm-zip'
import { Stats } from 'fs-extra'
import { join } from 'path'
import { resolve } from 'url'
import { capitalize } from '../../../util/stringutils'
import { McModInfo } from '../../forge/mcmodinfo'
import { McModInfoList } from '../../forge/mcmodinfolist'
import { Type } from '../../spec/type'
import { ModuleStructure } from './module.struct'

export class ForgeModStructure extends ModuleStructure {

    private forgeModMetadata: {[property: string]: McModInfo | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, 'forgemods', baseUrl, Type.ForgeMod)
    }

    protected async getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        const fmData = this.getForgeModMetadata(buf, name)
        return this.generateMavenIdentifier(fmData.modid, fmData.version)
    }
    protected async getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return capitalize((this.getForgeModMetadata(buf, name)).name)
    }
    protected async getModuleUrl(name: string, path: string, stats: Stats): Promise<string> {
        return resolve(this.baseUrl, join(this.relativeRoot, name))
    }
    protected async getModulePath(name: string, path: string, stats: Stats): Promise<string | null> {
        return null
    }

    private getForgeModMetadata(buf: Buffer, name: string): McModInfo {
        if (!this.forgeModMetadata.hasOwnProperty(name)) {
            const zip = new AdmZip(buf)
            const zipEntries = zip.getEntries()

            // Optifine is a tweak that can be loaded as a forge mod. It does not
            // appear to contain a mcmod.info class. This a special case we will
            // account for.
            if (name.toLowerCase().indexOf('optifine') > -1) {
                // Read zip for changelog.txt
                let rawChangelog
                for (const entry of zipEntries) {
                    if (entry.entryName === 'changelog.txt') {
                        rawChangelog = zip.readAsText(entry)
                        break
                    }
                }
                if (!rawChangelog) {
                    throw new Error('Failed to read OptiFine changelog.')
                }
                const info = rawChangelog.split('\n')[0].trim()
                const version = info.split(' ')[1]
                this.forgeModMetadata[name] = ({
                    modid: 'optifine',
                    name: info,
                    version,
                    mcversion: version.substring(0, version.indexOf('_'))
                }) as unknown as McModInfo
                return this.forgeModMetadata[name] as McModInfo
            }

            let raw
            for (const entry of zipEntries) {
                if (entry.entryName === 'mcmod.info') {
                    raw = zip.readAsText(entry)
                    break
                }
            }

            if (raw) {
                // Assuming the main mod will be the first entry in this file.
                const resolved = JSON.parse(raw) as object
                if (resolved.hasOwnProperty('modListVersion')) {
                    this.forgeModMetadata[name] = (resolved as McModInfoList).modList[0]
                } else {
                    this.forgeModMetadata[name] = (resolved as McModInfo[])[0]
                }
            } else {
                console.error(`ForgeMod ${name} does not contain mcmod.info file.`)
                this.forgeModMetadata[name] = ({
                    modid: name.substring(0, name.lastIndexOf('.')).toLowerCase(),
                    name,
                    version: '0.0.0'
                }) as unknown as McModInfo
            }
        }

        return this.forgeModMetadata[name] as McModInfo
    }

}
