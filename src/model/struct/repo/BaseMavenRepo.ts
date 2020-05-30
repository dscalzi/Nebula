import axios from 'axios'
import { createWriteStream, mkdirs, pathExists } from 'fs-extra'
import { dirname, join, resolve } from 'path'
import { resolve as resolveURL } from 'url'
import { MavenUtil } from '../../../util/maven'
import { BaseFileStructure } from '../BaseFileStructure'

export abstract class BaseMavenRepo extends BaseFileStructure {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string
    ) {
        super(absoluteRoot, relativeRoot, structRoot)
    }

    public getArtifactById(mavenIdentifier: string, extension?: string): string {
        return resolve(this.containerDirectory, MavenUtil.mavenIdentifierToString(mavenIdentifier, extension))
    }

    public getArtifactByComponents(
        group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): string {
        return resolve(this.containerDirectory,
            MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

    public getArtifactUrlByComponents(
        baseURL: string, group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): string {
        return resolveURL(baseURL, join(this.relativeRoot,
            MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension)))
    }

    public async artifactExists(path: string): Promise<boolean> {
        return pathExists(path)
    }

    public async downloadArtifactById(url: string, mavenIdentifier: string, extension?: string): Promise<void> {
        return this.downloadArtifactBase(url, MavenUtil.mavenIdentifierToString(mavenIdentifier, extension) as string)
    }

    public async downloadArtifactByComponents(
        url: string, group: string, artifact: string, version: string, classifier?: string, extension?: string
    ): Promise<void> {
        return this.downloadArtifactBase(url,
            MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

    private async downloadArtifactBase(url: string, relative: string): Promise<void> {
        const resolvedURL = resolveURL(url, relative).toString()
        console.debug(`Downloading ${resolvedURL}..`)
        const response = await axios({
            method: 'get',
            url: resolvedURL,
            responseType: 'stream'
        })
        const localPath = resolve(this.containerDirectory, relative)
        await mkdirs(dirname(localPath))
        const writer = createWriteStream(localPath)
        response.data.pipe(writer)
        // tslint:disable-next-line: no-shadowed-variable
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.debug(`Completed download of ${resolvedURL}.`)
                resolve()
            })
            writer.on('error', reject)
        })
    }

    public async headArtifactById(url: string, mavenIdentifier: string, extension?: string): Promise<boolean> {
        return this.headArtifactBase(url, MavenUtil.mavenIdentifierToString(mavenIdentifier, extension) as string)
    }

    public async headArtifactByComponents(
        url: string, group: string, artifact: string, version: string, classifier?: string, extension?: string
    ): Promise<boolean> {
        return this.headArtifactBase(url,
            MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

    private async headArtifactBase(url: string, relative: string): Promise<boolean> {
        const resolvedURL = resolveURL(url, relative).toString()
        try {
            const response = await axios({
                method: 'head',
                url: resolvedURL
            })
            return response.status === 200
        } catch (ignored) {
            return false
        }
    }

}
