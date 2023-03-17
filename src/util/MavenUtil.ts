import { normalize } from 'path'
import { URL } from 'url'

export class MavenUtil {

    public static readonly ID_REGEX = /(.+):(.+):([^@]+)()(?:@{1}(.+)$)?/
    public static readonly ID_REGEX_WITH_CLASSIFIER = /(.+):(.+):(?:([^@]+)(?:-([a-zA-Z]+)))(?:@{1}(.+)$)?/

    public static mavenComponentsToIdentifier(
        group: string,
        artifact: string,
        version: string,
        classifier?: string,
        extension?: string
    ): string {
        return `${group}:${artifact}:${version}${classifier != null ? `:${classifier}` : ''}${extension != null ? `@${extension}` : ''}`
    }

    public static isMavenIdentifier(id: string): boolean {
        return MavenUtil.ID_REGEX.test(id) || MavenUtil.ID_REGEX_WITH_CLASSIFIER.test(id)
    }

    public static getMavenComponents(id: string, extension = 'jar'): {
        group: string
        artifact: string
        version: string
        classifier?: string
        extension: string
    } {
        if (!MavenUtil.isMavenIdentifier(id)) {
            throw new Error('Id is not a maven identifier.')
        }

        let result

        if (MavenUtil.ID_REGEX_WITH_CLASSIFIER.test(id)) {
            result = MavenUtil.ID_REGEX_WITH_CLASSIFIER.exec(id)
        } else {
            result = MavenUtil.ID_REGEX.exec(id)
        }

        if (result != null) {
            return {
                group: result[1],
                artifact: result[2],
                version: result[3],
                classifier: result[4] || undefined,
                extension: result[5] || extension
            }
        }

        throw new Error('Failed to process maven data.')
    }

    public static mavenIdentifierToString(id: string, extension = 'jar'): string {
        const tmp = MavenUtil.getMavenComponents(id, extension)

        return MavenUtil.mavenComponentsToString(
            tmp.group, tmp.artifact, tmp.version, tmp.classifier, tmp.extension
        )
    }

    public static mavenComponentsToString(
        group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): string {
        return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}${classifier != null ? `-${classifier}` : ''}.${extension}`
    }

    public static mavenIdentifierToUrl(id: string, extension = 'jar'): URL {
        return new URL(MavenUtil.mavenIdentifierToString(id, extension))
    }

    public static mavenComponentsToUrl(
        group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): URL {
        return new URL(MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

    public static mavenIdentifierToPath(id: string, extension = 'jar'): string {
        return normalize(MavenUtil.mavenIdentifierToString(id, extension))
    }

    public static mavenComponentsToPath(
        group: string, artifact: string, version: string, classifier?: string, extension = 'jar'
    ): string {
        return normalize(MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

}
