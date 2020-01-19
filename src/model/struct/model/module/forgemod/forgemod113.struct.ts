import AdmZip from 'adm-zip'
import { Stats } from 'fs-extra'
import toml from 'toml'
import { capitalize } from '../../../../../util/stringutils'
import { VersionUtil } from '../../../../../util/versionutil'
import { ModsToml } from '../../../../forge/modstoml'
import { BaseForgeModStructure } from '../forgemod.struct'

export class ForgeModStructure113 extends BaseForgeModStructure {

    public static readonly IMPLEMENTATION_VERSION_REGEX = /^Implementation-Version: (.+)[\r\n]/

    public static isForVersion(version: string) {
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

    public isForVersion(version: string): boolean {
        return ForgeModStructure113.isForVersion(version)
    }

    protected async getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        const fmData = this.getForgeModMetadata(buf, name)
        return this.generateMavenIdentifier(fmData.mods[0].modId, fmData.mods[0].version)
    }
    protected async getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string> {
        return capitalize((this.getForgeModMetadata(buf, name)).mods[0].displayName)
    }

    private getForgeModMetadata(buf: Buffer, name: string): ModsToml {

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
                }) as unknown as ModsToml
                return this.forgeModMetadata[name] as ModsToml
            }

            const raw = zip.readAsText('META-INF/mods.toml')

            let createDefault = false

            if (raw) {
                // Assuming the main mod will be the first entry in this file.
                try {
                    const parsed = toml.parse(raw) as ModsToml

                    // tslint:disable-next-line: no-invalid-template-strings
                    if (parsed.mods[0].version === '${file.jarVersion}') {
                        let version = '0.0.0'
                        const manifest = zip.readAsText('META-INF/MANIFEST.MF')
                        const keys = manifest.split('\n')
                        console.log(keys)
                        for (const key of keys) {
                            const match = ForgeModStructure113.IMPLEMENTATION_VERSION_REGEX.exec(key)
                            if (match != null) {
                                version = match[1]
                            }
                        }
                        console.debug(`ForgeMod ${name} contains a version wildcard, inferring ${version}`)
                        parsed.mods[0].version = version
                    }

                    this.forgeModMetadata[name] = parsed

                } catch (err) {
                    console.error(`ForgeMod ${name} contains an invalid mods.toml file.`)
                    createDefault = true
                }
            } else {
                console.error(`ForgeMod ${name} does not contain mods.toml file.`)
                createDefault = true
            }

            if (createDefault) {
                this.forgeModMetadata[name] = ({
                    modLoader: 'javafml',
                    loaderVersion: '',
                    mods: [{
                        modId: name.substring(0, name.lastIndexOf('.')).toLowerCase(),
                        version: '0.0.0',
                        displayName: name,
                        description: ''
                    }]
                })
            }
        }

        return this.forgeModMetadata[name] as ModsToml

    }

}
