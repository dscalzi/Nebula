import StreamZip from 'node-stream-zip'
import { createHash } from 'crypto'
import { Stats } from 'fs-extra'
import { Artifact } from 'helios-distribution-types'
import { RepoStructure } from '../../structure/repo/Repo.struct'
import { BaseResolver } from '../baseresolver'
import { MinecraftVersion } from '../../util/MinecraftVersion'
import { VersionUtil } from '../../util/versionutil'
import { LoggerUtil } from '../../util/LoggerUtil'

export abstract class ForgeResolver extends BaseResolver {

    protected readonly MOJANG_REMOTE_REPOSITORY = 'https://libraries.minecraft.net/'
    protected readonly REMOTE_REPOSITORY = 'https://files.minecraftforge.net/maven/'

    protected repoStructure: RepoStructure
    protected artifactVersion: string

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        protected minecraftVersion: MinecraftVersion,
        protected forgeVersion: string,
        protected discardOutput: boolean,
        protected invalidateCache: boolean
    ) {
        super(absoluteRoot, relativeRoot, baseUrl)
        this.repoStructure = new RepoStructure(absoluteRoot, relativeRoot)
        this.artifactVersion = this.inferArtifactVersion()
        this.checkSecurity()
    }

    public checkSecurity(): void {
        const major = this.minecraftVersion.getMajor()
        const minor = this.minecraftVersion.getMinor()

        // https://github.com/apache/logging-log4j2/pull/608
        // https://github.com/advisories/GHSA-jfh8-c2jp-5v3q
        // https://www.minecraft.net/en-us/article/important-message--security-vulnerability-java-edition
        // https://twitter.com/gigaherz/status/1469331288368861195
        // https://gist.github.com/TheCurle/f15a6b63ceee3be58bff5e7a97c3a4e6

        const patchMatrix: { [major: number]: string } = {
            18: '38.0.17',
            17: '37.1.1',
            16: '36.2.20',
            15: '31.2.56',
            14: '28.2.25',
            13: '25.0.222',
            12: '14.23.5.2857'
        }

        const isVulnerable = major == 1 && (minor <= 18 && minor >= 12)
        const hasPatch = major == 1 && minor >= 12
        let unsafe

        if(isVulnerable) {
            if(hasPatch) {
                unsafe = !VersionUtil.versionGte(this.forgeVersion, patchMatrix[minor])
            } else {
                unsafe = true
            }
        }

        if(unsafe) {

            const logger = LoggerUtil.getLogger('ForgeSecurity')

            logger.error('==================================================================')
            logger.error('                           WARNING                                ')
            logger.error('  This version of Forge is vulnerable to a CRITICAL RCE exploit.  ')
            logger.error('                    DO NOT USE THIS VERSION!                      ')
            if(hasPatch) {
                logger.error(`     A patch is available as of Minecraft Forge v${patchMatrix[minor]}       `)
            }
            else {
                logger.error('         There is no patch available for this version.            ')
            }
            logger.error('==================================================================')

            logger.error('To abort, use CTRL + C.')
            logger.error('Nebula will proceed in 15 seconds..')
            const target = new Date().getTime() + (15*1000)
            while(new Date().getTime() <= target) {
                // Wait
            }

        }

    }

    // Coverage is not 100% but that doesnt matter.
    // It's enough and you should always use the latest version anyway.
    public inferArtifactVersion(): string {
        const version = `${this.minecraftVersion}-${this.forgeVersion}`

        const ver = this.forgeVersion.split('.')
        const major = Number(ver[0])
        if ([12, 11, 10].indexOf(major) > -1) {
            const minor = Number(ver[1])
            const revision = Number(ver[2])
            const extra = Number(ver[3])

            if (major === 10) {
                if (minor === 13 && revision >= 2 && extra >= 1300) {
                    return `${version}-1.7.10`
                }
            } else
            if (major === 11) {
                if (minor === 15) {
                    if (revision === 1 && extra >= 1890) {
                        return `${version}-1.8.9`
                    } else
                    if (revision === 0 && extra <= 1654) {
                        return `${version}-1.8.8`
                    }
                } else
                if (minor === 14 && revision === 0 && extra <= 1295) {
                    return `${version}-1.8`
                }
            } else
            if (major === 12) {
                if (minor === 17 && revision === 0 && extra <= 1936) {
                    return `${version}-1.9.4`
                } else
                if (minor === 16) {
                    if (revision === 0 && extra <= 1885) {
                        return `${version}-1.9`
                    } else
                    if (revision === 1 && extra === 1938) {
                        return `${version}-1.9.0`
                    }
                }
            }

        }
        return version
    }

    protected generateArtifact(buf: Buffer, stats: Stats, url: string): Artifact {
        return {
            size: stats.size,
            MD5: createHash('md5').update(buf).digest('hex'),
            url
        }
    }

    protected async getVersionManifestFromJar(jarPath: string): Promise<Buffer>{
        return new Promise((resolve, reject) => {
            const zip = new StreamZip({
                file: jarPath,
                storeEntries: true
            })
            zip.on('ready', () => {
                try {
                    const data = zip.entryDataSync('version.json')
                    zip.close()
                    resolve(data)
                } catch(err) {
                    reject(err)
                }
                
            })
            zip.on('error', err => reject(err))
        })
    }

}
