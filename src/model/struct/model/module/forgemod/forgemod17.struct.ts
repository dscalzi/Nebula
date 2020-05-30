import AdmZip from 'adm-zip'
import { Stats } from 'fs-extra'
import { capitalize } from '../../../../../util/stringutils'
import { VersionUtil } from '../../../../../util/versionutil'
import { McModInfo } from '../../../../forge/mcmodinfo'
import { McModInfoList } from '../../../../forge/mcmodinfolist'
import { BaseForgeModStructure } from '../forgemod.struct'
import { MinecraftVersion } from '../../../../../util/MinecraftVersion'

export class ForgeModStructure17 extends BaseForgeModStructure {

    public static isForVersion(version: MinecraftVersion): boolean {
        return VersionUtil.isVersionAcceptable(version, [7, 8, 9, 10, 11, 12])
    }

    private forgeModMetadata: {[property: string]: McModInfo | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl)
    }

    public isForVersion(version: MinecraftVersion): boolean {
        return ForgeModStructure17.isForVersion(version)
    }

    protected async getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        const fmData = this.getForgeModMetadata(buf, name)
        return this.generateMavenIdentifier(fmData.modid, fmData.version)
    }
    protected async getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return capitalize((this.getForgeModMetadata(buf, name)).name)
    }

    private getForgeModMetadata(buf: Buffer, name: string): McModInfo {
        if (!Object.prototype.hasOwnProperty.call(this.forgeModMetadata, name)) {
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

            let createDefault = false

            if (raw) {
                // Assuming the main mod will be the first entry in this file.
                try {
                    const resolved = JSON.parse(raw) as (McModInfoList | McModInfo[])
                    if (Object.prototype.hasOwnProperty.call(resolved, 'modListVersion')) {
                        this.forgeModMetadata[name] = (resolved as McModInfoList).modList[0]
                    } else {
                        this.forgeModMetadata[name] = (resolved as McModInfo[])[0]
                    }
                    // No way to resolve this AFAIK
                    if(this.forgeModMetadata[name]!.version.indexOf('@') > -1 || this.forgeModMetadata[name]!.version.indexOf('$') > -1) {
                        // Ex. @VERSION@, ${version}
                        this.forgeModMetadata[name]!.version = '0.0.0'
                    }
                } catch (err) {
                    console.error(`ForgeMod ${name} contains an invalid mcmod.info file.`)
                    createDefault = true
                }
            } else {
                console.error(`ForgeMod ${name} does not contain mcmod.info file.`)
                createDefault = true
            }

            if (createDefault) {
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
