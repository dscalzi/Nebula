import { normalize } from 'path'
import { URL } from 'url'

export class MavenUtil {

    public static readonly ID_REGEX = /(.+):(.+):([^@]+)(?:@{1}(.+)$)?/

    public static isMavenIdentifier(id: string) {
        return this.ID_REGEX.test(id)
    }

    public static mavenToString(id: string, extension = 'jar') {
        if (!this.isMavenIdentifier(id)) {
            return null
        }

        const result = this.ID_REGEX.exec(id)
        if (result != null) {
            const group = result[1]
            const artifact = result[2]
            const version = result[3]
            const ext = result[4] || extension

            return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}.${ext}`
        }
        return null
    }

    public static mavenToUrl(id: string, extension = 'jar') {
        const res = this.mavenToString(id, extension)
        return res == null ? null : new URL(res)
    }

    public static mavenToPath(id: string, extension = 'jar') {
        const res = this.mavenToString(id, extension)
        return res == null ? null : normalize(res)
    }

}
