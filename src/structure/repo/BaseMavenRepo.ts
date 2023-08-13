import got from 'got'
import { mkdirs, pathExists } from 'fs-extra/esm'
import { createWriteStream } from 'fs'
import { dirname, join, resolve } from 'path'
import { URL } from 'url'
import { MavenUtil } from '../../util/MavenUtil.js'
import { BaseFileStructure } from '../BaseFileStructure.js'
import { LoggerUtil } from '../../util/LoggerUtil.js'

export abstract class BaseMavenRepo extends BaseFileStructure {

    private static readonly logger = LoggerUtil.getLogger('BaseMavenRepo')

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string
    ) {
        super(absoluteRoot, relativeRoot, structRoot)
    }

    public getArtifactById(mavenIdentifier: string, extension?: string): string {
        return resolve(this.containerDirectory, MavenUtil.mavenIdentifierAsPath(mavenIdentifier, extension))
    }

    public getArtifactByComponents(
        group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): string {
        return resolve(this.containerDirectory,
            MavenUtil.mavenComponentsAsPath(group, artifact, version, classifier, extension))
    }

    public getArtifactUrlByComponents(
        baseURL: string, group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): string {
        return new URL(join(this.relativeRoot,
            MavenUtil.mavenComponentsAsPath(group, artifact, version, classifier, extension)), baseURL).toString()
    }

    public async artifactExists(path: string): Promise<boolean> {
        return pathExists(path)
    }

    public async downloadArtifactById(url: string, mavenIdentifier: string, extension?: string): Promise<void> {
        return this.downloadArtifactBase(url, MavenUtil.mavenIdentifierAsPath(mavenIdentifier, extension))
    }

    public async downloadArtifactByComponents(
        url: string, group: string, artifact: string, version: string, classifier?: string, extension?: string
    ): Promise<void> {
        return this.downloadArtifactBase(url,
            MavenUtil.mavenComponentsAsPath(group, artifact, version, classifier, extension))
    }

    private async downloadArtifactBase(url: string, relative: string): Promise<void> {
        const resolvedURL = new URL(relative, url).toString()
        return this.downloadArtifactDirect(resolvedURL, relative)
    }

    public async downloadArtifactDirect(url: string, path: string): Promise<void> {
        BaseMavenRepo.logger.debug(`Downloading ${url}..`)
        const request = got.stream.get({ url })
        const localPath = resolve(this.containerDirectory, path)
        await mkdirs(dirname(localPath))
        const writer = createWriteStream(localPath)
        request.pipe(writer)
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                BaseMavenRepo.logger.debug(`Completed download of ${url}.`)
                resolve()
            })
            writer.on('error', reject)
        })
    }

    public async headArtifactById(url: string, mavenIdentifier: string, extension?: string): Promise<boolean> {
        return this.headArtifactBase(url, MavenUtil.mavenIdentifierAsPath(mavenIdentifier, extension))
    }

    public async headArtifactByComponents(
        url: string, group: string, artifact: string, version: string, classifier?: string, extension?: string
    ): Promise<boolean> {
        return this.headArtifactBase(url,
            MavenUtil.mavenComponentsAsPath(group, artifact, version, classifier, extension))
    }

    private async headArtifactBase(url: string, relative: string): Promise<boolean> {
        const resolvedURL = new URL(relative, url).toString()
        try {
            const response = await got.head({
                url: resolvedURL
            })
            return response.statusCode === 200
        } catch (ignored) {
            return false
        }
    }

}
