import StreamZip from 'node-stream-zip'
import { capitalize } from '../../../../../util/stringutils'
import { VersionUtil } from '../../../../../util/versionutil'
import { McModInfo } from '../../../../forge/mcmodinfo'
import { McModInfoList } from '../../../../forge/mcmodinfolist'
import { BaseForgeModStructure } from '../forgemod.struct'
import { MinecraftVersion } from '../../../../../util/MinecraftVersion'
import { LoggerUtil } from '../../../../../util/LoggerUtil'

export class ForgeModStructure17 extends BaseForgeModStructure {

    private static readonly logger = LoggerUtil.getLogger('ForgeModStructure (1.7)')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
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

    public isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return ForgeModStructure17.isForVersion(version, libraryVersion)
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const fmData = await this.getForgeModMetadata(name, path)
        return this.generateMavenIdentifier(fmData.modid, fmData.version)
    }
    protected async getModuleName(name: string, path: string): Promise<string> {
        return capitalize((await this.getForgeModMetadata(name, path)).name)
    }

    private getForgeModMetadata(name: string, path: string): Promise<McModInfo> {
        return new Promise((resolve, reject) => {
            if (!Object.prototype.hasOwnProperty.call(this.forgeModMetadata, name)) {

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
                resolve(this.forgeModMetadata[name] as McModInfo)
                return
            }

        })
    }

    private processZip(zip: StreamZip, name: string): McModInfo {
        // Optifine is a tweak that can be loaded as a forge mod. It does not
        // appear to contain a mcmod.info class. This a special case we will
        // account for.
        if (name.toLowerCase().indexOf('optifine') > -1) {

            // Read zip for changelog.txt
            let changelogBuf: Buffer
            try {
                changelogBuf = zip.entryDataSync('changelog.txt')
            } catch(err) {
                throw new Error('Failed to read OptiFine changelog.')
            }

            const info = changelogBuf.toString().split('\n')[0].trim()
            const version = info.split(' ')[1]
            this.forgeModMetadata[name] = ({
                modid: 'optifine',
                name: info,
                version,
                mcversion: version.substring(0, version.indexOf('_'))
            }) as McModInfo
            return this.forgeModMetadata[name] as McModInfo
        }

        let raw: Buffer | undefined
        try {
            raw = zip.entryDataSync('mcmod.info')
        } catch(err) {
            // ignored
        }

        if (raw) {
            // Assuming the main mod will be the first entry in this file.
            try {
                const resolved = JSON.parse(raw.toString()) as (McModInfoList | McModInfo[])

                if (Object.prototype.hasOwnProperty.call(resolved, 'modListVersion')) {
                    this.forgeModMetadata[name] = (resolved as McModInfoList).modList[0]
                } else {
                    this.forgeModMetadata[name] = (resolved as McModInfo[])[0]
                }

            } catch (err) {
                ForgeModStructure17.logger.error(`ForgeMod ${name} contains an invalid mcmod.info file.`)
            }
        } else {
            ForgeModStructure17.logger.error(`ForgeMod ${name} does not contain mcmod.info file.`)
        }

        // Validate
        const crudeInference = this.attemptCrudeInference(name)
        if(this.forgeModMetadata[name] != null) {
            
            const x = this.forgeModMetadata[name]!
            if(x.modid == null || x.modid === '' || x.modid === this.EXAMPLE_MOD_ID) {
                x.modid = crudeInference.name.toLowerCase()
                x.name = crudeInference.name
            }

            // Ex. @VERSION@, ${version}
            if(this.forgeModMetadata[name]!.version != null) {
                const isVersionWildcard = this.forgeModMetadata[name]!.version.indexOf('@') > -1 || this.forgeModMetadata[name]!.version.indexOf('$') > -1
                if(isVersionWildcard) {
                    x.version = crudeInference.version
                }
            } else {
                x.version = crudeInference.version
            }
            
            
        } else {
            this.forgeModMetadata[name] = ({
                modid: crudeInference.name.toLowerCase(),
                name: crudeInference.name,
                version: crudeInference.version
            }) as McModInfo
        }

        return this.forgeModMetadata[name] as McModInfo
    }

}
