import StreamZip from 'node-stream-zip'
import { createHash } from 'crypto'
import { Stats } from 'fs-extra'
import { Artifact } from 'helios-distribution-types'
import { RepoStructure } from '../../model/struct/repo/repo.struct'
import { BaseResolver } from '../baseresolver'
import { MinecraftVersion } from '../../util/MinecraftVersion'

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
        protected forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl)
        this.repoStructure = new RepoStructure(absoluteRoot, relativeRoot)
        this.artifactVersion = this.inferArtifactVersion()
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
