import AdmZip from 'adm-zip'
import { createHash } from 'crypto'
import { lstat, readFile, Stats } from 'fs-extra'
import { VersionManifest } from '../../../model/forge/versionmanifest'
import { Artifact } from '../../../model/spec/artifact'
import { Module } from '../../../model/spec/module'
import { Type } from '../../../model/spec/type'
import { ForgeRepoStructure } from '../../../model/struct/repo/forgerepo.struct'
import { MavenUtil } from '../../../util/maven'
import { ForgeResolver } from '../forge.resolver'

export class Forge18Adapter extends ForgeResolver {

    public static isForVersion(version: string) {
        return Forge18Adapter.isVersionAcceptable(version, [8, 9, 10, 11, 12])
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        minecraftVersion: string,
        forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, minecraftVersion, forgeVersion)
    }

    public async getModule(): Promise<Module> {
        return this.getForgeByVersion()
    }

    public isForVersion(version: string) {
        return Forge18Adapter.isForVersion(version)
    }

    public async getForgeByVersion() {
        const forgeRepo = this.repoStructure.getForgeRepoStruct()
        const artifactVersion = `${this.minecraftVersion}-${this.forgeVersion}`
        const targetLocalPath = forgeRepo.getLocalForge(artifactVersion, 'universal')
        console.debug(`Checking for forge version at ${targetLocalPath}..`)
        if (!await forgeRepo.artifactExists(targetLocalPath)) {
            console.debug(`Forge not found locally, initializing download..`)
            await forgeRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                ForgeRepoStructure.FORGE_GROUP,
                ForgeRepoStructure.FORGE_ARTIFACT,
                artifactVersion, 'universal', 'jar')
        } else {
            console.debug('Using locally discovered forge.')
        }
        console.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

        const forgeUniversalBuffer = await readFile(targetLocalPath)
        const zip = new AdmZip(forgeUniversalBuffer)
        const zipEntries = zip.getEntries()

        let versionManifest

        for (const entry of zipEntries) {
            if (entry.entryName === 'version.json') {
                versionManifest = zip.readAsText(entry)
                break
            }
        }

        if (!versionManifest) {
            throw new Error('Failed to find version.json in forge universal jar.')
        }

        versionManifest = JSON.parse(versionManifest) as VersionManifest

        const forgeModule: Module = {
            id: MavenUtil.mavenComponentsToIdentifier(
                ForgeRepoStructure.FORGE_GROUP,
                ForgeRepoStructure.FORGE_ARTIFACT,
                artifactVersion, 'universal'
            ),
            name: 'Minecraft Forge',
            type: Type.ForgeHosted,
            artifact: this.generateArtifact(forgeUniversalBuffer, await lstat(targetLocalPath)),
            subModules: []
        }

        for (const lib of versionManifest.libraries) {
            if (lib.name.startsWith('net.minecraftforge:forge:')) {
                // We've already processed forge.
                continue
            }
            console.debug(`Processing ${lib.name}..`)

            const libRepo = this.repoStructure.getLibRepoStruct()
            const extension = this.determineExtension(lib.checksums)
            const localPath = libRepo.getArtifactById(lib.name, extension) as string

            if (!await libRepo.artifactExists(localPath)) {
                console.debug(`Not found locally, downloading..`)
                await libRepo.downloadArtifactById(lib.url || 'https://libraries.minecraft.net/', lib.name, extension)
            } else {
                console.debug('Using local copy.')
            }

            const libBuf = await readFile(localPath)
            const stats = await lstat(localPath)

            forgeModule.subModules?.push({
                id: lib.name,
                name: `Minecraft Forge (${MavenUtil.getMavenComponents(lib.name)?.artifact})`,
                type: Type.Library,
                artifact: this.generateArtifact(libBuf, stats)
            })

        }

        return forgeModule
    }

    private generateArtifact(buf: Buffer, stats: Stats): Artifact {
        return {
            size: stats.size,
            MD5: createHash('md5').update(buf).digest('hex'),
            url: 'TODO'
        }
    }

    private determineExtension(checksums: string[] | undefined) {
        return checksums != null && checksums.length > 1 ? 'jar.pack.xz' : 'jar'
    }

}
