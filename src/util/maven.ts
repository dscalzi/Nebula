import { normalize } from 'path'
import { URL } from 'url'

export class MavenUtil {

    public static readonly ID_REGEX = /(.+):(.+):([^@-]+)(?:-{1}([^@]+))?(?:@{1}(.+)$)?/

    public static isMavenIdentifier(id: string) {
        return MavenUtil.ID_REGEX.test(id)
    }

    public static mavenIdentifierToString(id: string, extension = 'jar') {
        if (!MavenUtil.isMavenIdentifier(id)) {
            return null
        }

        const result = MavenUtil.ID_REGEX.exec(id)
        if (result != null) {
            const group = result[1]
            const artifact = result[2]
            const version = result[3]
            const classifier = result[4]
            const ext = result[5] || extension

            return MavenUtil.mavenComponentsToString(group, artifact, version, classifier, ext)
        }
        return null
    }

    public static mavenComponentsToString(group: string, artifact: string,version: string,
                                          classifier?: string, extension = 'jar') {
        return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}${classifier != null ? `-${classifier}` : ''}.${extension}`
    }

    public static mavenToUrl(id: string, extension = 'jar') {
        const res = MavenUtil.mavenIdentifierToString(id, extension)
        return res == null ? null : new URL(res)
    }

    public static mavenToPath(id: string, extension = 'jar') {
        const res = MavenUtil.mavenIdentifierToString(id, extension)
        return res == null ? null : normalize(res)
    }

}
