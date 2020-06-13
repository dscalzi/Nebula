import StreamZip from 'node-stream-zip'
import toml from 'toml'
import { capitalize } from '../../../../../util/stringutils'
import { VersionUtil } from '../../../../../util/versionutil'
import { ModsToml } from '../../../../forge/modstoml'
import { BaseForgeModStructure } from '../forgemod.struct'
import { MinecraftVersion } from '../../../../../util/MinecraftVersion'
import { LoggerUtil } from '../../../../../util/LoggerUtil'

export class ForgeModStructure113 extends BaseForgeModStructure {

    private static readonly logger = LoggerUtil.getLogger('ForgeModStructure (1.13)')

    public static readonly IMPLEMENTATION_VERSION_REGEX = /^Implementation-Version: (.+)[\r\n]/

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return VersionUtil.isVersionAcceptable(version, [13, 14, 15])
    }

    private forgeModMetadata: {[property: string]: ModsToml | undefined} = {}

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl)
    }

    public isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return ForgeModStructure113.isForVersion(version, libraryVersion)
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const fmData = await this.getForgeModMetadata(name, path)
        return this.generateMavenIdentifier(fmData.mods[0].modId, fmData.mods[0].version)
    }
    protected async getModuleName(name: string, path: string): Promise<string> {
        return capitalize((await this.getForgeModMetadata(name, path)).mods[0].displayName)
    }

    private getForgeModMetadata(name: string, path: string): Promise<ModsToml> {
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
                        throw err
                    }
                })

            } else {
                resolve(this.forgeModMetadata[name] as ModsToml)
                return
            }

        })
    }

    private processZip(zip: StreamZip, name: string): ModsToml {

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
            }) as unknown as ModsToml
            return this.forgeModMetadata[name] as ModsToml
        }

        let raw: Buffer | undefined
        try {
            raw = zip.entryDataSync('META-INF/mods.toml')
        } catch(err) {
            // ignored
        }

        if (raw) {
            try {
                const parsed = toml.parse(raw.toString()) as ModsToml
                this.forgeModMetadata[name] = parsed
            } catch (err) {
                ForgeModStructure113.logger.error(`ForgeMod ${name} contains an invalid mods.toml file.`)
            }
        } else {
            ForgeModStructure113.logger.error(`ForgeMod ${name} does not contain mods.toml file.`)
        }

        const crudeInference = this.attemptCrudeInference(name)

        if(this.forgeModMetadata[name] != null) {

            const x = this.forgeModMetadata[name]!
            for(const entry of x.mods) {

                if(entry.modId === this.EXAMPLE_MOD_ID) {
                    entry.modId = crudeInference.name.toLowerCase()
                    entry.displayName = crudeInference.name
                }

                if (entry.version === '${file.jarVersion}') {
                    let version = crudeInference.version
                    try {
                        const manifest = zip.entryDataSync('META-INF/MANIFEST.MF')
                        const keys = manifest.toString().split('\n')
                        ForgeModStructure113.logger.debug(keys)
                        for (const key of keys) {
                            const match = ForgeModStructure113.IMPLEMENTATION_VERSION_REGEX.exec(key)
                            if (match != null) {
                                version = match[1]
                            }
                        }
                        ForgeModStructure113.logger.debug(`ForgeMod ${name} contains a version wildcard, inferring ${version}`)
                    } catch {
                        ForgeModStructure113.logger.debug(`ForgeMod ${name} contains a version wildcard yet no MANIFEST.MF.. Defaulting to ${version}`)
                    }
                    entry.version = version
                }
            }

        } else {
            this.forgeModMetadata[name] = ({
                modLoader: 'javafml',
                loaderVersion: '',
                mods: [{
                    modId: crudeInference.name.toLowerCase(),
                    version: crudeInference.version,
                    displayName: crudeInference.name,
                    description: ''
                }]
            })
        }

        return this.forgeModMetadata[name] as ModsToml
    }

}
