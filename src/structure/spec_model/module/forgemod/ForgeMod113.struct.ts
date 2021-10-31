import StreamZip from 'node-stream-zip'
import toml from 'toml'
import { capitalize } from '../../../../util/stringutils'
import { VersionUtil } from '../../../../util/versionutil'
import { ModsToml } from '../../../../model/forge/modstoml'
import { BaseForgeModStructure } from '../ForgeMod.struct'
import { MinecraftVersion } from '../../../../util/MinecraftVersion'
import { UntrackedFilesOption } from '../../../../model/nebula/servermeta'

export class ForgeModStructure113 extends BaseForgeModStructure {

    public static readonly IMPLEMENTATION_VERSION_REGEX = /^Implementation-Version: (.+)[\r\n]/

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static isForVersion(version: MinecraftVersion, libraryVersion: string): boolean {
        return VersionUtil.isVersionAcceptable(version, [13, 14, 15, 16])
    }

    private forgeModMetadata: {[property: string]: ModsToml | undefined} = {}

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
        return ForgeModStructure113.isForVersion(version, libraryVersion)
    }

    public getLoggerName(): string {
        return 'ForgeModStructure (1.13)'
    }

    protected async getModuleId(name: string, path: string): Promise<string> {
        const fmData = await this.getForgeModMetadata(name, path)
        return this.generateMavenIdentifier(this.getClaritasGroup(path), fmData.mods[0].modId, fmData.mods[0].version)
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
                resolve(this.forgeModMetadata[name] as ModsToml)
                return
            }

        })
    }

    private processZip(zip: StreamZip, name: string, path: string): ModsToml {

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
                modLoader: 'javafml',
                loaderVersion: '',
                mods: [{
                    modId: 'optifine',
                    version,
                    displayName: 'OptiFine',
                    description: `OptiFine is a Minecraft optimization mod.
                    It allows Minecraft to run faster and look better with full support for shaders, HD textures and many configuration options.`
                }]
            })

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
                this.logger.error(`ForgeMod ${name} contains an invalid mods.toml file.`)
            }
        } else {
            this.logger.error(`ForgeMod ${name} does not contain mods.toml file.`)
        }

        const cRes = this.claritasResult?.[path]

        if(cRes == null) {
            this.logger.error(`Claritas failed to yield metadata for ForgeMod ${name}!`)
            this.logger.error('Is this mod malformated or does Claritas need an update?')
        }

        const claritasId = cRes?.id

        const crudeInference = this.attemptCrudeInference(name)

        if(this.forgeModMetadata[name] != null) {

            const x = this.forgeModMetadata[name]!
            for(const entry of x.mods) {

                if(entry.modId === this.EXAMPLE_MOD_ID) {
                    entry.modId = this.discernResult(claritasId, crudeInference.name.toLowerCase())
                    entry.displayName = crudeInference.name
                }

                if (entry.version === '${file.jarVersion}') {
                    let version = crudeInference.version
                    try {
                        const manifest = zip.entryDataSync('META-INF/MANIFEST.MF')
                        const keys = manifest.toString().split('\n')
                        // this.logger.debug(keys)
                        for (const key of keys) {
                            const match = ForgeModStructure113.IMPLEMENTATION_VERSION_REGEX.exec(key)
                            if (match != null) {
                                version = match[1]
                            }
                        }
                        this.logger.debug(`ForgeMod ${name} contains a version wildcard, inferring ${version}`)
                    } catch {
                        this.logger.debug(`ForgeMod ${name} contains a version wildcard yet no MANIFEST.MF.. Defaulting to ${version}`)
                    }
                    entry.version = version
                }
            }

        } else {
            this.forgeModMetadata[name] = ({
                modLoader: 'javafml',
                loaderVersion: '',
                mods: [{
                    modId: this.discernResult(claritasId, crudeInference.name.toLowerCase()),
                    version: crudeInference.version,
                    displayName: crudeInference.name,
                    description: ''
                }]
            })
        }

        return this.forgeModMetadata[name] as ModsToml
    }

}
