import StreamZip from 'node-stream-zip'
import { capitalize } from '../../../../util/stringutils'
import { VersionUtil } from '../../../../util/versionutil'
import { McModInfo } from '../../../../model/forge/mcmodinfo'
import { McModInfoList } from '../../../../model/forge/mcmodinfolist'
import { BaseForgeModStructure } from '../ForgeMod.struct'
import { MinecraftVersion } from '../../../../util/MinecraftVersion'
import { ForgeModType_1_7 } from '../../../../model/claritas/ClaritasResult'
import { UntrackedFilesOption } from '../../../../model/nebula/servermeta'

export class ForgeModStructure17 extends BaseForgeModStructure {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return VersionUtil.isVersionAcceptable(version, [7, 8, 9, 10, 11, 12])
    }

    private forgeModMetadata: {[property: string]: McModInfo | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: MinecraftVersion,
        untrackedFiles: UntrackedFilesOption[]
    ) {
        super(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, untrackedFiles)
    }

    public isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return ForgeModStructure17.isForVersion(version, libraryVersion)
    }

    public getLoggerName(): string {
        return 'ForgeModStructure (1.7)'
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const fmData = await this.getForgeModMetadata(name, path)
        return this.generateMavenIdentifier(this.getClaritasGroup(path), fmData.modid, fmData.version)
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

                zip.on('error', err => {
                    this.logger.error(`Failure while processing ${path}`)
                    reject(err)
                })
                zip.on('ready', () => {
                    try {
                        const res = this.processZip(zip, name, path)
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

    private isMalformedVersion(version: string): boolean {
        // Ex. empty, @VERSION@, ${version}
        return version.trim().length === 0 || version.indexOf('@') > -1 || version.indexOf('$') > -1
    }

    private processZip(zip: StreamZip, name: string, path: string): McModInfo {
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
                this.logger.error(`ForgeMod ${name} contains an invalid mcmod.info file.`)
            }
        } else {
            this.logger.warn(`ForgeMod ${name} does not contain mcmod.info file.`)
        }

        const cRes = this.claritasResult[path]

        if(cRes == null) {
            this.logger.error(`Claritas failed to yield metadata for ForgeMod ${name}!`)
            this.logger.error('Is this mod malformated or does Claritas need an update?')
        } else {
            switch(cRes.modType!) {
                case ForgeModType_1_7.CORE_MOD:
                    this.logger.info(`CORE_MOD Discovered: ForgeMod ${name} has no @Mod annotation. Metadata inference capabilities are limited.`)
                    break
                case ForgeModType_1_7.TWEAKER:
                    this.logger.info(`TWEAKER Discovered: ForgeMod ${name} has no @Mod annotation. Metadata inference capabilities may be limited.`)
                    break
                case ForgeModType_1_7.UNKNOWN:
                    this.logger.error(`Jar file ${name} is not a ForgeMod. Is it a library?`)
                    break
            }
        }

        const claritasId = cRes?.id
        const claritasVersion = cRes?.version
        const claritasName = cRes?.name


        // Validate
        const crudeInference = this.attemptCrudeInference(name)
        if(this.forgeModMetadata[name] != null) {
            
            const x = this.forgeModMetadata[name]!
            if(x.modid == null || x.modid === '' || x.modid === this.EXAMPLE_MOD_ID) {
                x.modid = this.discernResult(claritasId, crudeInference.name.toLowerCase())
                x.name = this.discernResult(claritasName, crudeInference.name)
            }

            if(this.forgeModMetadata[name]!.version != null) {
                const isMalformedVersion = this.isMalformedVersion(this.forgeModMetadata[name]!.version)
                if(isMalformedVersion) {
                    x.version = this.discernResult(claritasVersion, crudeInference.version)
                }
            } else {
                x.version = this.discernResult(claritasVersion, crudeInference.version)
            }
            
            
        } else {
            this.forgeModMetadata[name] = ({
                modid: this.discernResult(claritasId, crudeInference.name.toLowerCase()),
                name: this.discernResult(claritasName, crudeInference.name),
                version: this.discernResult(claritasVersion, crudeInference.version)
            }) as McModInfo
        }

        return this.forgeModMetadata[name] as McModInfo
    }

}
