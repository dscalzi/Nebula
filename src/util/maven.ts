import { normalize } from 'path'
import { URL } from 'url'

export class MavenUtil {

    public static readonly ID_REGEX = /(.+):(.+):([^@]+)()(?:@{1}(.+)$)?/
    public static readonly ID_REGEX_WITH_CLASSIFIER = /(.+):(.+):(?:([^@]+)(?:-([a-zA-Z]+)))(?:@{1}(.+)$)?/

    public static isMavenIdentifier(id: string) {
        return MavenUtil.ID_REGEX.test(id) || MavenUtil.ID_REGEX_WITH_CLASSIFIER.test(id)
    }

    public static mavenIdentifierToString(id: string, extension = 'jar') {
        if (!MavenUtil.isMavenIdentifier(id)) {
            return null
        }

        let result

        if (MavenUtil.ID_REGEX_WITH_CLASSIFIER.test(id)) {
            result = MavenUtil.ID_REGEX_WITH_CLASSIFIER.exec(id)
        } else {
            result = MavenUtil.ID_REGEX.exec(id)
        }

        if (result != null) {
            const group = result[1]
            const artifact = result[2]
            const version = result[3]
            const classifier = result[4] || undefined
            const ext = result[5] || extension

            return MavenUtil.mavenComponentsToString(group, artifact, version, classifier, ext)
        }
        return null
    }

    public static mavenComponentsToString(group: string, artifact: string, version: string,
                                          classifier?: string, extension = 'jar') {
        return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}${classifier != null ? `-${classifier}` : ''}.${extension}`
    }

    public static mavenIdentifierToUrl(id: string, extension = 'jar') {
        const res = MavenUtil.mavenIdentifierToString(id, extension)
        return res == null ? null : new URL(res)
    }

    public static mavenComponentsToUrl(group: string, artifact: string, version: string,
                                       classifier?: string, extension = 'jar') {
        return new URL(MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

    public static mavenIdentifierToPath(id: string, extension = 'jar') {
        const res = MavenUtil.mavenIdentifierToString(id, extension)
        return res == null ? null : normalize(res)
    }

    public static mavenComponentsToPath(group: string, artifact: string, version: string,
                                        classifier?: string, extension = 'jar') {
        return normalize(MavenUtil.mavenComponentsToString(group, artifact, version, classifier, extension))
    }

}
