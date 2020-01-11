import { resolve } from 'path'
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

    public getArtifactById(mavenIdentifier: string): string | null {
        const resolved = MavenUtil.mavenIdentifierToString(mavenIdentifier)
        return resolved == null ? null : resolve(this.containerDirectory, resolved)
    }

    public getArtifactByComponents(group: string, artifact: string, version: string,
                                   classifier?: string, extension = 'jar'): string {
        throw resolve(this.containerDirectory,
            MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

}
