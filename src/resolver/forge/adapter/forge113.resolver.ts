import { spawn } from 'child_process'
import { copy, mkdirs, pathExists, remove, writeFile } from 'fs-extra'
import { basename, join } from 'path'
import { Module } from '../../../model/spec/module'
import { ForgeRepoStructure } from '../../../model/struct/repo/forgerepo.struct'
import { JavaUtil } from '../../../util/javautil'
import { ForgeResolver } from '../forge.resolver'

export class Forge113Adapter extends ForgeResolver {

    public static isForVersion(version: string) {
        return Forge113Adapter.isVersionAcceptable(version, [13, 14, 15])
    }

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        baseUrl: string,
        minecraftVersion: string,
        forgeVersion: string
    ) {
        super(absoluteRoot, relativeRoot, baseUrl, minecraftVersion, forgeVersion)
    }

    public async getModule(): Promise<Module> {
        await this.process()
        return {} as unknown as Module
    }

    public isForVersion(version: string): boolean {
        return Forge113Adapter.isForVersion(version)
    }

    private async process() {
        const forgeRepo = this.repoStructure.getForgeRepoStruct()
        const installerPath = forgeRepo.getLocalForge(this.artifactVersion, 'installer')
        console.debug(`Checking for forge installer at ${installerPath}..`)
        if (!await forgeRepo.artifactExists(installerPath)) {
            console.debug(`Forge installer not found locally, initializing download..`)
            await forgeRepo.downloadArtifactByComponents(
                this.REMOTE_REPOSITORY,
                ForgeRepoStructure.FORGE_GROUP,
                ForgeRepoStructure.FORGE_ARTIFACT,
                this.artifactVersion, 'installer', 'jar'
            )
        } else {
            console.debug('Using locally discovered forge installer.')
        }
        console.debug(`Beginning processing of Forge v${this.forgeVersion} (Minecraft ${this.minecraftVersion})`)

        const workDir = this.repoStructure.getWorkDirectory()
        if (await pathExists(workDir)) {
            await remove(workDir)
        }

        await mkdirs(workDir)

        const workingInstaller = join(workDir, basename(installerPath))

        await copy(installerPath, workingInstaller)

        // Required for the installer to function.
        await writeFile(join(workDir, 'launcher_profiles.json'), JSON.stringify({}))

        console.debug(`Spawning forge installer`)

    }

    private executeInstaller(installerExec: string) {
        return new Promise((resolve, reject) => {
            const child = spawn(JavaUtil.getJavaExecutable(), [
                '-jar',
                installerExec
            ])
            child.stdout.on('data', (data) => console.log('[Forge Installer]', data.toString('utf8')))
            child.stderr.on('data', (data) => console.error('[Forge Installer]', data.toString('utf8')))
            child.on('close', (code, signal) => {
                console.log('[Forge Installer]', 'Exited with code', code)
                resolve()
            })
        })
    }

}
